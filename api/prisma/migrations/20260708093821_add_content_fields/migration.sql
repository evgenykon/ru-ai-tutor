-- DropForeignKey
ALTER TABLE "user_assistants" DROP CONSTRAINT "user_assistants_assistant_id_fkey";

-- DropForeignKey
ALTER TABLE "user_assistants" DROP CONSTRAINT "user_assistants_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_courses" DROP CONSTRAINT "user_courses_course_id_fkey";

-- DropForeignKey
ALTER TABLE "user_courses" DROP CONSTRAINT "user_courses_user_id_fkey";

-- AlterTable
ALTER TABLE "assistants" ALTER COLUMN "speech_rate" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "content" TEXT;

-- AlterTable
ALTER TABLE "modules" ADD COLUMN     "description" TEXT;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_courses" ADD CONSTRAINT "user_courses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_courses" ADD CONSTRAINT "user_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_assistants" ADD CONSTRAINT "user_assistants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_assistants" ADD CONSTRAINT "user_assistants_assistant_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
