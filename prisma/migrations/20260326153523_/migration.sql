-- CreateTable
CREATE TABLE `highlights` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `lessonId` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `blockIndex` INTEGER NOT NULL,
    `startOffset` INTEGER NOT NULL,
    `endOffset` INTEGER NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#a855f7',
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `highlights_userId_lessonId_idx`(`userId`, `lessonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `highlights` ADD CONSTRAINT `highlights_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `highlights` ADD CONSTRAINT `highlights_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
