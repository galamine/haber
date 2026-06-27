# 📋 Project Tasks & Roadmap

## 🐞 Active Bugs & Issues
- [ ] **Therapist Treatment Plan Access (403 Forbidden / CORS)**
  - [ ] Fix/investigate issue where visiting `/children/:childId/plans/:planId` throws a `FORBIDDEN` error because the therapist is not assigned to the child, which also causes a CORS console block.
  - [ ] Determine if authorization should allow clinic-wide access or if we need to handle unassigned states gracefully in the UI.
- [ ] **Authentication Timeout Routing**
  - [ ] Fix issue where session timeout on logged-in screens doesn't properly redirect the user to the login page.
  - [ ] Investigate "unauthorized" error log that appears when attempting to log out after a session timeout.
- [ ] **Login OTP Input**
  - [ ] Support copy/paste into the OTP input.
  - [ ] Support backspace behavior in the OTP input.
- [ ] **Department Management**
  - [ ] Fix issue where the "Head Therapist" does not sync/update correctly when editing a department.

## 🛡️ Super Admin Platform
- [ ] **Clinic Management & Details View**
  - [ ] Implement full CRUD operations (Create, Read, Update, Delete) for clinics.
  - [ ] Build a "Danger Zone" section for sensitive or destructive actions (e.g., permanent deletion, suspension).
  - [ ] Add an "Invite Admin" feature to streamline onboarding new administrators.
- [ ] **Registration Workflow Refactoring**
  - [ ] Migrate the existing registration process into a modal/dialog-based workflow.

## 🏥 Clinic Admin & Staff Operations
- [ ] **Child Management (Intake & Listing)**
  - [ ] Allow clinic admins to register a "New Child" into the clinic system.
  - [ ] **Permissions:** Disable the "Create Child" action for staff members by default, until a Clinic Admin explicitly grants them permission.
  - [ ] **Tracking:** Update the Children page to display which user role (Admin, Staff, or Therapist) created the child profile.
- [ ] **Data Entry Forms**
  - [ ] Add functional "Save" buttons and ensure data persistence across all Add/Edit sections.
- [ ] **Staff & Department Relations**
  - [ ] Restrict department assignment to Therapist roles only.
  - [ ] Remove department selection from the general staff member edit page, as general staff members do not require a department relation.

## 🧭 Sidebar Navigation & UX
- [ ] **Dynamic Authentication Header**
  - [ ] Update the sidebar header to dynamically reflect the user's authentication state and role.
- [ ] **User Information Display**
  - [ ] Replace the generic User ID with the user's display name for better UX.
