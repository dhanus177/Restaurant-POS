-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "activationKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'standard',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "License_activationKey_key" ON "License"("activationKey");