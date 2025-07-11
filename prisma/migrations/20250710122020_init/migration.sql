-- CreateTable
CREATE TABLE `karyawan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `foto_profile` VARCHAR(255) NULL,
    `nik` VARCHAR(20) NOT NULL,
    `nama` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `no_telepon` VARCHAR(15) NOT NULL,
    `alamat` TEXT NOT NULL,
    `tanggal_bergabung` DATE NOT NULL DEFAULT (curdate()),
    `status` ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',

    UNIQUE INDEX `user_id`(`user_id`),
    UNIQUE INDEX `nik`(`nik`),
    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `karyawan_id` INTEGER NOT NULL,
    `jenis` ENUM('cuti', 'sakit', 'dinas') NOT NULL,
    `tanggal_mulai` DATE NOT NULL,
    `tanggal_selesai` DATE NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NULL DEFAULT 'pending',
    `keterangan` TEXT NULL,
    `foto_bukti` VARCHAR(255) NULL,
    `approved_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_approved_by`(`approved_by`),
    INDEX `karyawan_id`(`karyawan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lokasi_kantor` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nama_kantor` VARCHAR(100) NOT NULL,
    `latitude` DECIMAL(15, 12) NOT NULL,
    `longitude` DECIMAL(15, 12) NOT NULL,
    `radius_meter` INTEGER NOT NULL DEFAULT 50,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `presensi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `karyawan_id` INTEGER NOT NULL,
    `tanggal` DATE NOT NULL,
    `checkin_time` DATETIME(0) NULL,
    `checkout_time` DATETIME(0) NULL,
    `checkin_lat` DECIMAL(10, 7) NULL,
    `checkin_lng` DECIMAL(10, 7) NULL,
    `checkout_lat` DECIMAL(10, 7) NULL,
    `checkout_lng` DECIMAL(10, 7) NULL,
    `status` VARCHAR(20) NOT NULL,
    `keterangan` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_presensi_karyawan`(`karyawan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qr_batches` (
    `id` VARCHAR(50) NOT NULL,
    `type` ENUM('checkin', 'checkout') NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `created_by` INTEGER NULL,

    INDEX `created_by`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(250) NOT NULL,
    `role` ENUM('admin', 'sales', 'supervisor', 'karyawan') NULL,

    UNIQUE INDEX `username`(`username`),
    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `karyawan` ADD CONSTRAINT `fk_karyawan_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `fk_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_ibfk_1` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `presensi` ADD CONSTRAINT `fk_presensi_karyawan` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
