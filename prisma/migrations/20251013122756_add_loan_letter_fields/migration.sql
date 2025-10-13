-- AlterTable
ALTER TABLE "reservations" ADD COLUMN "loan_letter_url" TEXT;
ALTER TABLE "reservations" ADD COLUMN "loan_letter_file_name" TEXT;
ALTER TABLE "reservations" ADD COLUMN "loan_letter_uploaded_at" TIMESTAMP(3);
