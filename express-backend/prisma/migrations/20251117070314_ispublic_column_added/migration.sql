/*
  Warnings:

  - You are about to drop the column `bluetoothId` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `bluetoothSignalStrength` on the `Device` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Device" DROP COLUMN "bluetoothId",
DROP COLUMN "bluetoothSignalStrength";

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wifiSSID" TEXT,
ALTER COLUMN "code" SET DEFAULT LPAD(FLOOR(RANDOM() * 100000)::text, 5, '0');
