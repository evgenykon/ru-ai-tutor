-- CreateTable
CREATE TABLE "service_credentials" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "key_value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_credentials_service_key" ON "service_credentials"("service");
