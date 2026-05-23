CREATE TABLE `listening_materials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`audio_file_path` text NOT NULL,
	`original_text` text,
	`duration` integer,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `subtitles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listening_id` integer NOT NULL,
	`line_index` integer NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`english_text` text,
	`chinese_text` text,
	FOREIGN KEY (`listening_id`) REFERENCES `listening_materials`(`id`) ON UPDATE no action ON DELETE cascade
);
