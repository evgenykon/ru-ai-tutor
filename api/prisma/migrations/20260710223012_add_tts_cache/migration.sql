-- CreateTable
CREATE TABLE "tts_caches" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "voice" TEXT NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL,
    "text" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "protected" BOOLEAN NOT NULL DEFAULT false,
    "last_hit_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tts_caches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tts_caches_course_id_idx" ON "tts_caches"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "tts_caches_course_id_hash_key" ON "tts_caches"("course_id", "hash");

-- AddForeignKey
ALTER TABLE "tts_caches" ADD CONSTRAINT "tts_caches_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
