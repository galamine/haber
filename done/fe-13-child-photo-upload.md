# Plan: FE-13 — Photo Upload via Cloudinary (Child & User Profile)

## Context

This plan implements photo upload for two surfaces:

1. **Child photo** — on child profile edit page, displayed in profile header.
2. **User profile photo** — during profile creation/onboarding page.

Storage uses **Cloudinary** via `CLOUDINARY_URL` env var.

**Already exists:**
- `Child.photoUrl` field in `packages/db/prisma/schema/clinical.prisma`
- `UpdateChildInput.photoUrl` in `packages/api/src/schemas/child.ts`
- Child router `update` mutation passes `...data` which includes `photoUrl`

**No new mutations required** — photo upload uses existing `child.update` and `profile.update` mutations.

**Wizard and guardian flow unchanged** — no restructuring, no new mutations.

**Blocked by:**
- Cloudinary account with valid `CLOUDINARY_URL` env var configured

## Files to Modify

| File | Change |
|---|---|
| `apps/server/package.json` | Add `cloudinary` dependency |
| `packages/env/src/server.ts` | Add `CLOUDINARY_URL` env var |
| `packages/db/prisma/schema/auth.prisma` | Add `photoUrl String?` to `UserProfile` |
| `packages/api/src/schemas/profile.ts` | Add `photoUrl` to `CreateProfileInput` |
| `packages/api/src/routers/profile.ts` | Pass `photoUrl` in create/update |
| `apps/server/src/index.ts` | Add `/api/upload/child-photo` and `/api/upload/profile-photo` HTTP endpoints |
| `apps/web/src/routes/user-profile.tsx` | Add photo upload section |
| `apps/web/src/routes/_authenticated/children/$childId/edit.tsx` | Add photo upload UI |
| `apps/web/src/routes/_authenticated/children/$childId/index.tsx` | Display photo in profile header |

---

## Step 1 — Add Cloudinary Dependency

**File:** `apps/server/package.json`

Add `cloudinary` to dependencies:

```json
"cloudinary": "^2.5.0"
```

Run `pnpm install` after adding.

---

## Step 2 — Add Environment Variable

**File:** `packages/env/src/server.ts`

Add `CLOUDINARY_URL` to the server env schema:

```typescript
CLOUDINARY_URL: z.string().min(1),
```

---

## Step 3 — Add `photoUrl` to `UserProfile`

**File:** `packages/db/prisma/schema/auth.prisma`

Add `photoUrl String?` field to `UserProfile` model.

Run `pnpm db:push` to apply.

---

## Step 4 — Add `photoUrl` to Profile Schemas

**File:** `packages/api/src/schemas/profile.ts`

Add `photoUrl: z.string().optional()` to `CreateProfileInput`. `UpdateProfileInput` is `.partial()` of `CreateProfileInput` so it inherits automatically.

---

## Step 5 — Update Profile Router

**File:** `packages/api/src/routers/profile.ts`

In `create` mutation, pass `photoUrl: input.photoUrl` to `userProfile.create`.

In `update` mutation, add:
```typescript
...(input.photoUrl !== undefined && { photoUrl: input.photoUrl }),
```

---

## Step 6 — Add Upload Endpoints

**File:** `apps/server/src/index.ts`

**Required imports:**
```typescript
import { v2 as cloudinary } from "cloudinary";
import { PERMISSIONS } from "@haber-final/db/permissions";
import { hasPermission } from "@haber-final/api";
```

### POST /api/upload/child-photo

- Auth: JWT via `createContext`, reject if unauthenticated
- Permission: `hasPermission({ auth: ctx.auth }, PERMISSIONS.CHILD_INTAKE)`
- Query param: `childId` required
- Validate child exists and belongs to user's clinic
- Parse multipart: extract `filename`, `Content-Type`, file bytes from `file` field
- Validate: `image/*` MIME type, file size ≤ 5 MB
- Upload to Cloudinary: `child/{childId}/{timestamp}-{filename}`
- Return: `{ url: string }`

### POST /api/upload/profile-photo

- Auth: JWT via `createContext`, reject if unauthenticated
- Parse multipart: extract `filename`, `Content-Type`, file bytes from `file` field
- Validate: `image/*` MIME type, file size ≤ 5 MB
- Upload to Cloudinary: `profile/{userId}/{timestamp}-{filename}`
- Return: `{ url: string }`

### Multipart Parsing (both routes)

```typescript
const body = await c.req.parseBody();
const file = body.file;
if (!file || !(file instanceof File)) {
  return c.json({ error: "No file provided" }, 400);
}
```

### Cloudinary Upload (both routes)

```typescript
const MAX_SIZE = 5 * 1024 * 1024;
if (file.size > MAX_SIZE) {
  return c.json({ error: "File size must be 5MB or less" }, 400);
}

const timestamp = Date.now();
const publicId = `child/${childId}/${timestamp}-${file.name}`;
const buffer = Buffer.from(await file.arrayBuffer());
const b64 = buffer.toString("base64");
const dataUri = `data:${file.type};base64,${b64}`;

const result = await cloudinary.uploader.upload(dataUri, {
  public_id: publicId,
  folder: "",
  resource_type: "image",
});

return c.json({ url: result.secure_url });
```

---

## Step 7 — User Profile Page

**File:** `apps/web/src/routes/user-profile.tsx`

**Schema:** Add `photoUrl: z.string().optional()` to `ProfileSchema`.

**Imports:** `Avatar`, `AvatarFallback`, `AvatarImage` from `@haber-final/ui/components/avatar`; `Upload` from `lucide-react`; `useRef`, `useState` from `react`; `env` from `@haber-final/env/web`.

**State:** Add `photoUrl` state and `isUploading` state.

**Upload Handler:**
```typescript
async function handleUpload(file: File) {
  setIsUploading(true);
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${env.VITE_SERVER_URL}/api/upload/profile-photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
      body: formData,
    });
    if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
    const { url } = await res.json();
    setPhotoUrl(url);
    toast.success("Photo uploaded");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Upload failed");
  } finally {
    setIsUploading(false);
  }
}
```

**UI Section:** Add above form fields — `Avatar` with `AvatarImage src={photoUrl}` when set, hidden file input with ref, "Upload Photo" button with `Upload` icon.

**On Submit:** Pass `photoUrl` to `profile.create.mutation`.

---

## Step 8 — Child Edit Page

**File:** `apps/web/src/routes/_authenticated/children/$childId/edit.tsx`

**Schema:** Add `photoUrl: z.string().optional()` to `EditSchema`.

**Imports:** `Avatar`, `AvatarFallback`, `AvatarImage`; `Tooltip`, `TooltipContent`, `TooltipTrigger`; `Upload` from `lucide-react`; `useRef`, `useState` from `react`; `env` from `@haber-final/env/web`.

**Pre-populate:** Add `photoUrl: child.photoUrl ?? ""` to form reset.

**Upload Handler:**
```typescript
async function handleUpload(file: File) {
  setIsUploading(true);
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${env.VITE_SERVER_URL}/api/upload/child-photo?childId=${childId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
      body: formData,
    });
    if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
    const { url } = await res.json();
    setPhotoUrl(url);
    toast.success("Photo uploaded");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Upload failed");
  } finally {
    setIsUploading(false);
  }
}
```

**UI Section:** Add photo upload section at top of form (before profile fields) with Avatar preview and upload button.

**On Submit:** Pass `photoUrl: values.photoUrl || undefined` to `child.update`.

---

## Step 9 — Child Profile Header

**File:** `apps/web/src/routes/_authenticated/children/$childId/index.tsx`

Add `photoUrl: string | null` to `ChildProfile` type.

In profile header `Avatar`, add:
```tsx
{child.photoUrl && <AvatarImage src={child.photoUrl} alt={child.fullName} />}
```

---

## Out of Scope

- Server-side image resizing or compression
- Direct file input to Cloudinary (unsigned uploads)
- Bulk photo upload
- Intake wizard restructuring
- New mutations (guardian or otherwise)

---

## Verification

- [ ] `pnpm check-types` — must pass
- [ ] `pnpm check` (Biome) — on new and edited files
- [ ] Upload child photo → saved to `Child.photoUrl` → renders in profile header
- [ ] Upload profile photo → saved to `UserProfile.photoUrl`
- [ ] File too large (>5MB) → rejected with error
- [ ] Non-image file → rejected with error
- [ ] No auth token → 401 rejected
- [ ] Cloudinary console: files uploaded with correct `child/` or `profile/` naming

---

## Blocked by

- Cloudinary account with valid `CLOUDINARY_URL` env var configured
