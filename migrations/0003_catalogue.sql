DROP TABLE `borrow_requests`;--> statement-breakpoint
DELETE FROM `user_book_hearts`;--> statement-breakpoint
DELETE FROM `book_images`;--> statement-breakpoint
DROP TABLE `book_categories`;--> statement-breakpoint
DROP TABLE `donations`;--> statement-breakpoint
DROP TABLE `books`;--> statement-breakpoint
DROP TABLE `categories`;--> statement-breakpoint
DELETE FROM `donors`;--> statement-breakpoint
CREATE UNIQUE INDEX `donors_name_unique` ON `donors` (`name`);--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `total_donations`;--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`next_number` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "categories_code_check" CHECK("categories"."code" = upper("categories"."code"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_code_unique` ON `categories` (`code`);--> statement-breakpoint
CREATE INDEX `categories_parent_idx` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`category_id` text NOT NULL,
	`title` text NOT NULL,
	`author` text,
	`search` text NOT NULL,
	`title_key` text NOT NULL,
	`isbn` text,
	`description` text,
	`image_url` text,
	`next_copy` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `books_code_unique` ON `books` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `books_isbn_unique` ON `books` (`isbn`);--> statement-breakpoint
CREATE INDEX `books_category_idx` ON `books` (`category_id`);--> statement-breakpoint
CREATE INDEX `books_title_key_idx` ON `books` (`title_key`,`code`);--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`cabinet` text NOT NULL,
	`shelf` integer NOT NULL,
	`bay` integer NOT NULL,
	`category_id` text,
	`holds` text DEFAULT 'primary' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "locations_holds_check" CHECK("locations"."holds" IN ('primary', 'extra'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `locations_place_unique` ON `locations` (`cabinet`,`shelf`,`bay`);--> statement-breakpoint
CREATE TABLE `copies` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`number` integer NOT NULL,
	`code` text NOT NULL,
	`origin` text DEFAULT 'original' NOT NULL,
	`volume` text,
	`pieces` integer DEFAULT 1 NOT NULL,
	`edition` text,
	`year` integer,
	`country` text,
	`publisher` text,
	`location_id` text,
	`donor_id` text,
	`status` text DEFAULT 'present' NOT NULL,
	`condition` text,
	`labelled` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`donor_id`) REFERENCES `donors`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "copies_origin_check" CHECK("copies"."origin" IN ('original', 'copy')),
	CONSTRAINT "copies_status_check" CHECK("copies"."status" IN ('present', 'maintenance', 'missing')),
	CONSTRAINT "copies_condition_check" CHECK("copies"."condition" IS NULL OR "copies"."condition" IN ('good', 'fair', 'poor')),
	CONSTRAINT "copies_pieces_check" CHECK("copies"."pieces" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `copies_code_unique` ON `copies` (`code`);--> statement-breakpoint
CREATE INDEX `copies_location_idx` ON `copies` (`location_id`);--> statement-breakpoint
CREATE INDEX `copies_donor_idx` ON `copies` (`donor_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `copies_book_number_unique` ON `copies` (`book_id`,`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `copies_book_id_unique` ON `copies` (`book_id`,`id`);--> statement-breakpoint
CREATE TABLE `borrow_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`book_id` text NOT NULL,
	`copy_id` text,
	`request_date` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`librarian_id` text,
	`approved_date` integer,
	`due_date` integer,
	`return_date` integer,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`librarian_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`book_id`,`copy_id`) REFERENCES `copies`(`book_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "borrow_requests_status_check" CHECK("borrow_requests"."status" IN ('pending', 'approved', 'rejected', 'returned')),
	CONSTRAINT "borrow_requests_copy_check" CHECK("borrow_requests"."status" NOT IN ('approved', 'returned') OR "borrow_requests"."copy_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX `borrow_requests_user_idx` ON `borrow_requests` (`user_id`,`request_date`);--> statement-breakpoint
CREATE INDEX `borrow_requests_book_idx` ON `borrow_requests` (`book_id`);--> statement-breakpoint
CREATE INDEX `borrow_requests_date_idx` ON `borrow_requests` (`request_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `borrow_requests_pending_idx` ON `borrow_requests` (`book_id`,`user_id`) WHERE "borrow_requests"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX `borrow_requests_active_copy_idx` ON `borrow_requests` (`copy_id`) WHERE "borrow_requests"."status" = 'approved';--> statement-breakpoint
CREATE INDEX `book_images_book_idx` ON `book_images` (`book_id`,`display_order`);--> statement-breakpoint
CREATE INDEX `user_book_hearts_book_idx` ON `user_book_hearts` (`book_id`);
