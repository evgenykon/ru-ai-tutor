ALTER TABLE "api_keys" ADD COLUMN "user_id" TEXT;
UPDATE "api_keys" SET "user_id" = (SELECT id FROM "users" LIMIT 1) WHERE "user_id" IS NULL;
ALTER TABLE "api_keys" ALTER COLUMN "user_id" SET NOT NULL;

CREATE TABLE "user_courses" (
  "user_id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  PRIMARY KEY ("user_id", "course_id")
);

CREATE TABLE "user_assistants" (
  "user_id" TEXT NOT NULL,
  "assistant_id" TEXT NOT NULL,
  PRIMARY KEY ("user_id", "assistant_id")
);

ALTER TABLE "user_courses" ADD FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_courses" ADD FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE;
ALTER TABLE "user_assistants" ADD FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_assistants" ADD FOREIGN KEY ("assistant_id") REFERENCES "assistants"("id") ON DELETE CASCADE;

INSERT INTO "user_courses" ("user_id", "course_id") SELECT (SELECT id FROM "users" LIMIT 1), id FROM "courses" ON CONFLICT DO NOTHING;
INSERT INTO "user_assistants" ("user_id", "assistant_id") SELECT (SELECT id FROM "users" LIMIT 1), id FROM "assistants" ON CONFLICT DO NOTHING;
