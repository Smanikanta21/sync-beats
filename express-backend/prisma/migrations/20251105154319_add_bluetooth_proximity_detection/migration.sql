-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "bluetoothId" TEXT,
ADD COLUMN     "bluetoothSignalStrength" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "Room" ALTER COLUMN "code" SET DEFAULT LPAD(FLOOR(RANDOM() * 100000)::text, 5, '0');
