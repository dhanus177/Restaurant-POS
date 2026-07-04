-- CreateTable
CREATE TABLE "BackupSchedule" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "frequencyHours" INTEGER NOT NULL DEFAULT 24,
    "retentionCount" INTEGER NOT NULL DEFAULT 14,
    "verifyChecksum" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackupSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupSnapshot" (
    "id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "sizeBytes" INTEGER NOT NULL,
    "exportedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedBy" TEXT NOT NULL,
    "openingFloat" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "expectedCash" DOUBLE PRECISION,
    "countedCash" DOUBLE PRECISION,
    "variance" DOUBLE PRECISION,
    "denominations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackupSnapshot_createdAt_idx" ON "BackupSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "BackupSnapshot_trigger_idx" ON "BackupSnapshot"("trigger");

-- CreateIndex
CREATE INDEX "Shift_status_idx" ON "Shift"("status");

-- CreateIndex
CREATE INDEX "Shift_openedAt_idx" ON "Shift"("openedAt");

-- CreateIndex
CREATE INDEX "Shift_closedAt_idx" ON "Shift"("closedAt");
