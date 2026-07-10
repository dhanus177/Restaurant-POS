-- WhatsApp daily reports settings and dispatch log
ALTER TABLE "Settings"
  ADD COLUMN "whatsappReportsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "whatsappRecipient" TEXT,
  ADD COLUMN "whatsappBreakfastTime" TEXT NOT NULL DEFAULT '11:00',
  ADD COLUMN "whatsappLunchTime" TEXT NOT NULL DEFAULT '16:00',
  ADD COLUMN "whatsappDinnerTime" TEXT NOT NULL DEFAULT '22:00';

CREATE TABLE "WhatsAppReportDispatch" (
  "id" TEXT NOT NULL,
  "mealType" TEXT NOT NULL,
  "reportDate" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "messageSid" TEXT,

  CONSTRAINT "WhatsAppReportDispatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppReportDispatch_mealType_reportDate_key"
  ON "WhatsAppReportDispatch"("mealType", "reportDate");

CREATE INDEX "WhatsAppReportDispatch_sentAt_idx"
  ON "WhatsAppReportDispatch"("sentAt");
