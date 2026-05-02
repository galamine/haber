# 13-multi-doctor-co-coverage

## What to build

Multi-doctor flat co-assignment: multiple doctors assigned to student (no primary by default, optional primary designation), all receive notifications for review due, first-opener becomes reviewing doctor for that cycle, others marked as addressed.

## Acceptance criteria

- [ ] `POST /v1/students/:id/doctors` — assign a doctor to student (flat co-assignment)
- [ ] `GET /v1/students/:id/doctors` — list assigned doctors with primary flag
- [ ] `DELETE /v1/students/:id/doctors/:doctorId` — unassign doctor
- [ ] `PATCH /v1/students/:id/doctors/:doctorId` — set/unset primary doctor designation
- [ ] When student's 2-month review is due, all assigned doctors receive notification
- [ ] First doctor to open review becomes "reviewing doctor" for this cycle (set `reviewing_doctor_id` on student)
- [ ] Other doctors' notifications for this cycle are marked as `addressed=true`
- [ ] No reassignment mid-cycle — reviewing doctor stays until cycle closes
- [ ] Prisma: StudentDoctorAssignment with doctor_id, student_id, is_primary, reviewing_for_cycle_id
- [ ] Frontend: Student detail page shows assigned doctors with primary badge, notification center for review due
- [ ] Integration tests: first-opener becomes reviewing doctor, others' notifications marked addressed

## Blocked by

- [07-doctor-assessment-milestone-tagging.md](./07-doctor-assessment-milestone-tagging.md)

## User stories

- #68: Multiple doctors co-assigned to a student (flat, no primary)
- #69: All assigned doctors receive notification when 2-month review is due
- #70: First doctor to open review becomes "reviewing doctor" for this cycle, others' notifications marked addressed
- #71: Clinic Admin designates a primary doctor per student

## QA checklist

- [ ] All assigned doctors see the student in their queue
- [ ] Review due notification goes to all assigned doctors simultaneously
- [ ] First open sets reviewing_doctor_id on student
- [ ] Subsequent opens by other doctors see notification as already addressed
- [ ] Primary designation is optional (defaults to no primary)
- [ ] Primary can be changed by Clinic Admin
- [ ] Reviewing doctor stays constant for the cycle duration