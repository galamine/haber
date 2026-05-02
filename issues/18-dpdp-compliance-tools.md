# 18-dpdp-compliance-tools

## What to build

DPDP compliance tooling: data principal request handling (access, correction, erasure, grievance) within admin tools, field-level encryption for PHI (AES-256 at rest, TLS 1.2+ in transit), India data residency enforcement, retention-locked soft delete, hard-delete co-approval workflow after retention period.

## Acceptance criteria

- [ ] `GET /v1/admin/dpdprequests` — list all DPDP requests (access, correction, erasure, grievance)
- [ ] `POST /v1/admin/dpdprequests/:id/fulfill` — fulfill request (export data, apply correction, schedule erasure)
- [ ] `GET /v1/students/:id/dpdp-access-export` — export all student data for access request (structured JSON)
- [ ] `PATCH /v1/students/:id/dpdp-correct` — apply correction from data principal
- [ ] Field-level encryption for medical_history and diagnosis fields in Prisma: AES-256 encryption at rest
- [ ] TLS 1.2+ enforced for all API traffic (Express middleware)
- [ ] India region data residency: database hosted in India region (enforced at infrastructure level, not application)
- [ ] `DPDPService.checkRetentionPeriod(studentId)` — checks if 7-year retention has expired
- [ ] Hard delete workflow: when retention period expires, Clinic Admin and Super Admin co-approve deletion
- [ ] `POST /v1/students/:id/hard-delete-request` — initiate hard delete request
- [ ] `POST /v1/admin/hard-delete-requests/:id/approve` — co-approve hard delete (requires both Clinic Admin and Super Admin)
- [ ] Prisma: DPDPRequest model, field encryption via Prisma middleware or application-level encryption
- [ ] Frontend: Admin DPDP request queue with fulfill actions, student profile with data export button, hard delete approval UI
- [ ] Integration tests: field encryption/decryption works correctly, retention check, co-approval workflow

## Blocked by

- [17-audit-logging.md](./17-audit-logging.md)

## User stories

- #75: Clinic Admin sees and fulfills DPDP data principal requests (access, correction, erasure, grievance) from within admin tools
- #139: Field-level encryption for medical history and diagnoses, AES-256 at rest, TLS 1.2+ in transit
- #140: All PHI stored in India region (DPDP data residency)
- #21: Clinic Admin and Super Admin co-approve hard delete of student after retention period expires

## QA checklist

- [ ] Medical history and diagnosis fields are encrypted in the database
- [ ] Decryption works correctly for authorized access
- [ ] DPDP request queue shows pending requests with type and age
- [ ] Access export contains all student data in structured format
- [ ] Correction applied correctly and audit logged
- [ ] Retention period is checked before hard delete is allowed
- [ ] Co-approval requires both Clinic Admin and Super Admin
- [ ] Hard delete is irreversible (documented warning shown)
- [ ] TLS configuration is correct (1.2 minimum)