-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "Room" ALTER COLUMN "code" SET DEFAULT LPAD(FLOOR(RANDOM() * 100000)::text, 5, '0');
