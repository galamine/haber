-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('draft', 'finalised');

-- AlterTable: add new fields to medical_history
ALTER TABLE "medical_histories" ADD COLUMN "prenatal_history" TEXT;
ALTER TABLE "medical_histories" ADD COLUMN "previous_therapies" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'draft',
    "assessment_date" DATE NOT NULL,
    "assessment_location" TEXT,
    "referring_doctor" TEXT,
    "referral_source" TEXT,
    "chief_complaint" TEXT,
    "chief_complaint_tags" JSONB NOT NULL DEFAULT '[]',
    "observations" TEXT,
    "findings" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "primary_diagnosis_ids" JSONB NOT NULL DEFAULT '[]',
    "medical_history_snapshot" JSONB,
    "recorded_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessments_child_id_version_key" ON "assessments"("child_id", "version");

-- CreateIndex
CREATE INDEX "assessments_child_id_version_idx" ON "assessments"("child_id", "version");

-- CreateIndex
CREATE INDEX "assessments_tenant_id_idx" ON "assessments"("tenant_id");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
