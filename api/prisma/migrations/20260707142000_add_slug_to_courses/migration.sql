ALTER TABLE "courses" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");
