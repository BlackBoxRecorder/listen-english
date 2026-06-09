CREATE TABLE `sentence_analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subtitle_id` integer NOT NULL,
	`analysis_type` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`subtitle_id`) REFERENCES `subtitles`(`id`) ON UPDATE no action ON DELETE cascade
);
