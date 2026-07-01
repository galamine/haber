# FE-13: Child Photo Upload in Intake Wizard

## What to build

Add an optional photo upload to Step 1 of the child intake wizard and the child profile edit page. The photo URL is stored in the existing `Child.photoUrl` field. The upload must be gated behind the `IMAGE_VIDEO_CAPTURE` consent type.

**Package:** `apps/web` + `packages/api` + `packages/env`

### Storage setup

Add a storage upload endpoint or use a direct-to-storage presigned URL pattern. The simplest approach for V1 is a server-side upload route:

**`apps/server/src/index.ts`** — add one Hono route:

```
POST /api/upload/child-photo
  — Auth: requires valid JWT (protected)
  — Body: multipart/form-data, field: "file" (image/*)
  — Validates: file size ≤ 5 MB, MIME type image/*
  — Uploads to configured storage bucket
  — Returns: { url: string }
```

Add to `packages/env` (server):

```typescript
STORAGE_BUCKET_URL: z.string().url(),
STORAGE_ACCESS_KEY: z.string(),
STORAGE_SECRET_KEY: z.string(),
```

### Frontend changes

**Step 1 of intake wizard (`apps/web/src/routes/_authenticated/children/new.tsx`):**

- Add an avatar upload zone below the name fields:
  ```
  [  Click to upload photo (optional)  ]
  [  JPG, PNG, WebP — max 5 MB         ]
  ```
- On file select: POST to `/api/upload/child-photo`, show loading state, store returned URL in form state
- Show preview thumbnail once uploaded
- Pass `photoUrl` to `child.create`

**Child profile edit (`apps/web/src/routes/_authenticated/children/$childId/edit.tsx`):**

- Same upload zone in the profile edit form, pre-populated with current `photoUrl` if set
- Pass updated `photoUrl` to `child.update`

**Child profile header (`/children/$childId/index.tsx`):**

- Show `<img src={photoUrl} />` avatar (already should render if `photoUrl` is set; confirm this is in the UI)

**Consent gate:**

- Only show the upload zone if the child's `IMAGE_VIDEO_CAPTURE` consent record exists with `checkbox = true`
- If consent is not yet granted, show a muted placeholder with tooltip: "Photo upload requires image capture consent"

### DPDP note

The `IMAGE_VIDEO_CAPTURE` consent type already exists in the schema and seed data. No schema changes needed. The upload route must validate JWT before accepting files — no public upload path.

## Acceptance criteria

- [ ] Step 1 of intake wizard shows optional photo upload zone
- [ ] Uploaded file is validated (≤ 5 MB, image MIME type)
- [ ] On successful upload, thumbnail preview is shown before form submit
- [ ] `photoUrl` is saved to the child record on `child.create` and `child.update`
- [ ] Child profile header renders the avatar when `photoUrl` is set
- [ ] Upload zone is hidden (with explanatory tooltip) when `IMAGE_VIDEO_CAPTURE` consent is not granted
- [ ] Upload endpoint rejects unauthenticated requests
- [ ] `pnpm check-types` passes

## Blocked by

- US#13 (IMAGE_VIDEO_CAPTURE consent) — already implemented
- Storage infrastructure must be configured in environment before this can ship
