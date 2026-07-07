-- CreateTable
CREATE TABLE "usage_logs" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "model" TEXT,
    "tokens" INTEGER,
    "cost" DOUBLE PRECISION,
    "endpoint" TEXT,
    "status" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usage_logs_service_idx" ON "usage_logs"("service");

-- CreateIndex
CREATE INDEX "usage_logs_createdAt_idx" ON "usage_logs"("createdAt");
