#!/usr/bin/env bash
#
# Deploy the haber-final backend (apps/server) to a bare Ubuntu EC2 instance:
# installs the toolchain, installs deps, configures env, pushes the DB schema,
# seeds, builds, and runs the server under pm2 (or systemd).
#
# Assumes the repo is already checked out on the box (e.g. via `git clone`);
# run this script from within that checkout, or pass --app-dir.
#
# Usage: scripts/deploy-ec2.sh [options]
# Run with --help for the full list of options.

set -euo pipefail
IFS=$'\n\t'

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
APP_DIR="$(pwd)"
NODE_MAJOR="22"
ENV_FILE_SRC=""
GENERATE_JWT_SECRET="false"
DB_MODE="local"
SKIP_DB_PUSH="false"
SEED_LIST="superadmin,clinical"
PROCESS_MANAGER="pm2"
APP_NAME="haber-server"
SKIP_PM2_STARTUP="false"
SKIP_BUILD="false"
NON_INTERACTIVE="false"

DB_NAME="haber_final"
DB_USER="haber_final"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log() { printf '\n[deploy] %s\n' "$*"; }
die() { printf '\n[deploy][ERROR] %s\n' "$*" >&2; exit 1; }

on_error() {
	local exit_code=$?
	local line_no=$1
	printf '\n[deploy][ERROR] Command failed (exit %d) at line %d\n' "$exit_code" "$line_no" >&2
}
trap 'on_error $LINENO' ERR

run_as_root() {
	if [[ "$(id -u)" -eq 0 ]]; then
		"$@"
	else
		sudo "$@"
	fi
}

run_as_postgres() {
	if [[ "$(id -u)" -eq 0 ]]; then
		su postgres -c "$*"
	else
		sudo -u postgres "$@"
	fi
}

usage() {
	cat <<'EOF'
Usage: scripts/deploy-ec2.sh [options]

Options:
  --app-dir <path>          Path to the existing repo checkout (default: cwd)
  --node-major <n>          Node.js major version to install (default: 22)
  --env-file <path>         Pre-filled .env to copy to apps/server/.env
  --generate-jwt-secret     Auto-generate JWT_SECRET if missing/placeholder
  --db-mode <local|external>
                            local: install & provision Postgres on this box (default)
                            external: use DATABASE_URL already in .env (e.g. RDS)
  --skip-db-push            Skip `prisma db push`
  --seed <list>             Comma-separated: superadmin,clinical,dev,flow
                            (default: superadmin,clinical; pass "" to skip)
  --process-manager <pm2|systemd>
                            Process manager to run the server under (default: pm2)
  --app-name <name>         pm2/systemd process name (default: haber-server)
  --skip-pm2-startup        Don't configure pm2 to start on reboot
  --skip-build              Skip `pnpm --filter server build`
  -y, --yes                 Non-interactive mode
  -h, --help                Show this help
EOF
}

# ---------------------------------------------------------------------------
# 1. Parse args
# ---------------------------------------------------------------------------
parse_args() {
	while [[ $# -gt 0 ]]; do
		case "$1" in
			--app-dir) APP_DIR="$2"; shift 2 ;;
			--node-major) NODE_MAJOR="$2"; shift 2 ;;
			--env-file) ENV_FILE_SRC="$2"; shift 2 ;;
			--generate-jwt-secret) GENERATE_JWT_SECRET="true"; shift ;;
			--db-mode) DB_MODE="$2"; shift 2 ;;
			--skip-db-push) SKIP_DB_PUSH="true"; shift ;;
			--seed) SEED_LIST="$2"; shift 2 ;;
			--process-manager) PROCESS_MANAGER="$2"; shift 2 ;;
			--app-name) APP_NAME="$2"; shift 2 ;;
			--skip-pm2-startup) SKIP_PM2_STARTUP="true"; shift ;;
			--skip-build) SKIP_BUILD="true"; shift ;;
			-y|--yes) NON_INTERACTIVE="true"; shift ;;
			-h|--help) usage; exit 0 ;;
			*) die "Unknown option: $1 (see --help)" ;;
		esac
	done

	[[ "$DB_MODE" == "local" || "$DB_MODE" == "external" ]] || die "--db-mode must be 'local' or 'external'"
	[[ "$PROCESS_MANAGER" == "pm2" || "$PROCESS_MANAGER" == "systemd" ]] || die "--process-manager must be 'pm2' or 'systemd'"
}

# ---------------------------------------------------------------------------
# 2. Prereqs
# ---------------------------------------------------------------------------
check_prereqs() {
	log "Checking prerequisites"

	[[ -f /etc/os-release ]] && grep -qi ubuntu /etc/os-release \
		|| die "This script targets Ubuntu. /etc/os-release doesn't look like Ubuntu."

	if [[ "$(id -u)" -ne 0 ]]; then
		command -v sudo >/dev/null 2>&1 || die "Not running as root and 'sudo' is not available."
	fi

	[[ -d "$APP_DIR/.git" ]] || die "APP_DIR ($APP_DIR) is not a git checkout. Clone the repo first, or pass --app-dir."
	[[ -f "$APP_DIR/package.json" ]] || die "No package.json found at $APP_DIR — is this the repo root?"
	[[ -f "$APP_DIR/apps/server/package.json" ]] || die "No apps/server/package.json found — is this the haber-final repo?"
}

# ---------------------------------------------------------------------------
# 3. System packages
# ---------------------------------------------------------------------------
system_update() {
	log "Updating system packages"
	run_as_root apt-get update -y
	run_as_root apt-get upgrade -y
	run_as_root apt-get install -y curl ca-certificates gnupg build-essential postgresql-client
}

# ---------------------------------------------------------------------------
# 4. Node.js
# ---------------------------------------------------------------------------
install_node() {
	log "Checking Node.js"
	if command -v node >/dev/null 2>&1 && [[ "$(node -v)" == v"$NODE_MAJOR".* ]]; then
		log "Node $(node -v) already installed, skipping"
		return
	fi

	log "Installing Node.js ${NODE_MAJOR}.x via NodeSource"
	curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | run_as_root bash -
	run_as_root apt-get install -y nodejs
}

# ---------------------------------------------------------------------------
# 5. pnpm (via corepack)
# ---------------------------------------------------------------------------
enable_pnpm() {
	log "Enabling pnpm via corepack"
	run_as_root corepack enable

	local pnpm_version
	pnpm_version="$(node -e "console.log((require('${APP_DIR}/package.json').packageManager || 'pnpm@10.13.1').split('@')[1])" 2>/dev/null || echo "10.13.1")"
	corepack prepare "pnpm@${pnpm_version}" --activate
	log "pnpm $(pnpm -v) active"
}

# ---------------------------------------------------------------------------
# 6. Install dependencies
# ---------------------------------------------------------------------------
install_deps() {
	log "Installing dependencies (pnpm install --frozen-lockfile)"
	(cd "$APP_DIR" && pnpm install --frozen-lockfile)
}

# ---------------------------------------------------------------------------
# 7. Env file
# ---------------------------------------------------------------------------
setup_env_file() {
	log "Setting up apps/server/.env"
	local env_path="$APP_DIR/apps/server/.env"
	local example_path="$APP_DIR/apps/server/.env.example"

	if [[ -n "$ENV_FILE_SRC" ]]; then
		[[ -f "$ENV_FILE_SRC" ]] || die "--env-file $ENV_FILE_SRC not found"
		cp "$ENV_FILE_SRC" "$env_path"
		log "Copied $ENV_FILE_SRC -> $env_path"
	elif [[ ! -f "$env_path" ]]; then
		[[ -f "$example_path" ]] || die "Neither apps/server/.env nor .env.example found"
		cp "$example_path" "$env_path"
		die "Created $env_path from .env.example — fill in real values (DATABASE_URL, JWT_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL, CLOUDINARY_URL, CORS_ORIGIN, etc.) then re-run this script."
	else
		log "Using existing $env_path"
	fi

	if [[ "$GENERATE_JWT_SECRET" == "true" ]] && grep -q '^JWT_SECRET=changeme' "$env_path"; then
		local new_secret
		new_secret="$(openssl rand -base64 32 | tr -d '\n')"
		sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${new_secret}|" "$env_path"
		log "Generated a new JWT_SECRET"
	fi

	# Force production mode regardless of what the template had.
	if grep -q '^NODE_ENV=' "$env_path"; then
		sed -i 's|^NODE_ENV=.*|NODE_ENV=production|' "$env_path"
	else
		printf '\nNODE_ENV=production\n' >> "$env_path"
	fi

	local missing=()
	local required_vars=(DATABASE_URL CORS_ORIGIN JWT_SECRET RESEND_API_KEY RESEND_FROM_EMAIL CLOUDINARY_URL)
	for var in "${required_vars[@]}"; do
		local value
		value="$(grep -E "^${var}=" "$env_path" | head -n1 | cut -d= -f2-)"
		[[ -n "$value" ]] || missing+=("$var (missing)")
	done
	grep -q '^JWT_SECRET=changeme' "$env_path" && missing+=("JWT_SECRET (still placeholder)")
	grep -q '^RESEND_API_KEY=re_xxxx' "$env_path" && missing+=("RESEND_API_KEY (still placeholder)")
	grep -qE '^CLOUDINARY_URL=cloudinary://<' "$env_path" && missing+=("CLOUDINARY_URL (still placeholder)")

	if [[ ${#missing[@]} -gt 0 ]]; then
		log "The following required env vars in $env_path need real values:"
		printf '  - %s\n' "${missing[@]}"
		die "Fill in the values above and re-run."
	fi

	log "Env file looks complete"
}

env_get() {
	grep -E "^${1}=" "$APP_DIR/apps/server/.env" | head -n1 | cut -d= -f2-
}

env_set() {
	local key="$1" value="$2" env_path="$APP_DIR/apps/server/.env"
	if grep -q "^${key}=" "$env_path"; then
		sed -i "s|^${key}=.*|${key}=${value}|" "$env_path"
	else
		printf '%s=%s\n' "$key" "$value" >> "$env_path"
	fi
}

# ---------------------------------------------------------------------------
# 8. Database
# ---------------------------------------------------------------------------
setup_database() {
	log "Setting up database (mode: $DB_MODE)"

	if [[ "$DB_MODE" == "external" ]]; then
		local db_url
		db_url="$(env_get DATABASE_URL)"
		[[ -n "$db_url" ]] || die "DATABASE_URL is not set in apps/server/.env"
		pg_isready -d "$db_url" >/dev/null 2>&1 \
			|| die "Could not reach database at DATABASE_URL. Check credentials/security group rules."
		log "External database reachable"
		return
	fi

	if ! command -v psql >/dev/null 2>&1 || ! dpkg -s postgresql >/dev/null 2>&1; then
		log "Installing PostgreSQL"
		run_as_root apt-get install -y postgresql postgresql-contrib
	fi
	run_as_root systemctl enable --now postgresql

	local existing_url
	existing_url="$(env_get DATABASE_URL)"
	if [[ -n "$existing_url" && "$existing_url" != *"password@localhost"* ]]; then
		log "DATABASE_URL already set in .env, leaving it as-is"
		pg_isready -d "$existing_url" >/dev/null 2>&1 \
			|| die "DATABASE_URL is set but the database isn't reachable."
		return
	fi

	local db_pass
	db_pass="$(openssl rand -hex 16)"

	local role_exists
	role_exists="$(run_as_postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'")"
	if [[ "$role_exists" != "1" ]]; then
		log "Creating database role ${DB_USER}"
		run_as_postgres psql -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${db_pass}';"
	else
		log "Database role ${DB_USER} already exists, updating password"
		run_as_postgres psql -c "ALTER ROLE ${DB_USER} PASSWORD '${db_pass}';"
	fi

	local db_exists
	db_exists="$(run_as_postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")"
	if [[ "$db_exists" != "1" ]]; then
		log "Creating database ${DB_NAME}"
		run_as_postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
	else
		log "Database ${DB_NAME} already exists"
	fi

	env_set DATABASE_URL "postgresql://${DB_USER}:${db_pass}@localhost:5432/${DB_NAME}"
	log "DATABASE_URL written to apps/server/.env"
}

# ---------------------------------------------------------------------------
# 9. DB schema push
# ---------------------------------------------------------------------------
db_push() {
	if [[ "$SKIP_DB_PUSH" == "true" ]]; then
		log "Skipping db push (--skip-db-push)"
		return
	fi
	log "Pushing Prisma schema (prisma db push)"
	(cd "$APP_DIR" && pnpm --filter @haber-final/db db:push)
}

# ---------------------------------------------------------------------------
# 10. Seeds
# ---------------------------------------------------------------------------
run_seeds() {
	[[ -z "$SEED_LIST" ]] && { log "No seeds requested"; return; }

	IFS=',' read -ra seeds <<< "$SEED_LIST"
	for seed in "${seeds[@]}"; do
		case "$seed" in
			superadmin|clinical|dev|flow) ;;
			*) die "Unknown seed '$seed' (expected: superadmin, clinical, dev, flow)" ;;
		esac
		if [[ "$seed" == "superadmin" && -z "$(env_get SUPER_ADMIN_EMAIL)" ]]; then
			log "Skipping seed:superadmin — SUPER_ADMIN_EMAIL is not set in .env"
			continue
		fi
		log "Running seed:${seed}"
		(cd "$APP_DIR" && pnpm --filter @haber-final/db "seed:${seed}")
	done
}

# ---------------------------------------------------------------------------
# 11. Build
# ---------------------------------------------------------------------------
build_server() {
	if [[ "$SKIP_BUILD" == "true" ]]; then
		log "Skipping build (--skip-build)"
	else
		log "Building server (pnpm --filter server build)"
		(cd "$APP_DIR" && pnpm --filter server build)
	fi

	[[ -f "$APP_DIR/apps/server/dist/index.mjs" ]] \
		|| die "Build did not produce apps/server/dist/index.mjs"
}

# ---------------------------------------------------------------------------
# 12. Process manager
# ---------------------------------------------------------------------------
setup_process_manager() {
	log "Starting server via ${PROCESS_MANAGER}"

	if [[ "$PROCESS_MANAGER" == "pm2" ]]; then
		command -v pm2 >/dev/null 2>&1 || run_as_root npm install -g pm2

		if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
			pm2 restart "$APP_NAME"
		else
			(cd "$APP_DIR/apps/server" && pm2 start dist/index.mjs --name "$APP_NAME" --cwd "$APP_DIR/apps/server")
		fi
		pm2 save

		if [[ "$SKIP_PM2_STARTUP" != "true" ]]; then
			local startup_cmd
			startup_cmd="$(pm2 startup systemd -u "$(whoami)" --hp "$HOME" | grep -E '^sudo ' || true)"
			if [[ -n "$startup_cmd" ]]; then
				log "Running pm2 startup command: $startup_cmd"
				eval "$startup_cmd"
			fi
		fi
	else
		local unit_path="/etc/systemd/system/${APP_NAME}.service"
		log "Writing systemd unit to $unit_path"
		run_as_root tee "$unit_path" >/dev/null <<EOF
[Unit]
Description=${APP_NAME}
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=${APP_DIR}/apps/server
ExecStart=$(command -v node) dist/index.mjs
Restart=on-failure
User=$(whoami)

[Install]
WantedBy=multi-user.target
EOF
		run_as_root systemctl daemon-reload
		run_as_root systemctl enable --now "$APP_NAME"
	fi
}

# ---------------------------------------------------------------------------
# 13. Health check
# ---------------------------------------------------------------------------
health_check() {
	log "Waiting for server to respond on http://localhost:3000/"
	local attempts=15
	for ((i = 1; i <= attempts; i++)); do
		if curl -sf http://localhost:3000/ >/dev/null 2>&1; then
			log "Deployment successful — server is up on port 3000"
			cat <<EOF

App directory : $APP_DIR/apps/server
Process mgr   : $PROCESS_MANAGER ($APP_NAME)
Status        : $( [[ "$PROCESS_MANAGER" == "pm2" ]] && echo "pm2 status" || echo "systemctl status $APP_NAME" )
Logs          : $( [[ "$PROCESS_MANAGER" == "pm2" ]] && echo "pm2 logs $APP_NAME" || echo "journalctl -u $APP_NAME -f" )

NOTE: no reverse proxy / TLS was configured. The app is only reachable on
localhost:3000 (or externally on :3000 if your security group allows it).
Put Nginx + certbot in front of it for a public HTTPS deployment.
EOF
			return
		fi
		sleep 2
	done

	log "Server did not respond after $((attempts * 2))s, dumping recent logs:"
	if [[ "$PROCESS_MANAGER" == "pm2" ]]; then
		pm2 logs "$APP_NAME" --lines 50 --nostream || true
	else
		journalctl -u "$APP_NAME" -n 50 --no-pager || true
	fi
	die "Health check failed"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
	parse_args "$@"
	check_prereqs
	system_update
	install_node
	enable_pnpm
	install_deps
	setup_env_file
	setup_database
	db_push
	run_seeds
	build_server
	setup_process_manager
	health_check
}

main "$@"
