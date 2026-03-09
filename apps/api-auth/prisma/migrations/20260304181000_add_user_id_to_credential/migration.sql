/*
  Warnings:

  - Added the required column `userId` to the `Credential` table without a default value. This is required since the table is empty.

*/
-- AlterTable
ALTER TABLE "Credential" ADD COLUMN "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Credential_userId_key" ON "Credential"("userId");
