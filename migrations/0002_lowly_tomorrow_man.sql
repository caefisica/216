CREATE TABLE `rate_limit` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`stamped_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limit_expires_at_idx` ON `rate_limit` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `book_images_image_url_idx` ON `book_images` (`image_url`);--> statement-breakpoint
CREATE UNIQUE INDEX `borrow_requests_pending_idx` ON `borrow_requests` (`book_id`,`user_id`) WHERE "borrow_requests"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX `user_book_hearts_user_book_idx` ON `user_book_hearts` (`user_id`,`book_id`);