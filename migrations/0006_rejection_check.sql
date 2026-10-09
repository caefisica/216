PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_borrow_requests` (
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
	`rejection_reason` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`librarian_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`book_id`,`copy_id`) REFERENCES `copies`(`book_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "borrow_requests_status_check" CHECK("__new_borrow_requests"."status" IN ('pending', 'approved', 'rejected', 'returned')),
	CONSTRAINT "borrow_requests_rejection_check" CHECK("__new_borrow_requests"."status" <> 'rejected' OR length(trim(coalesce("__new_borrow_requests"."rejection_reason", ''))) > 0),
	CONSTRAINT "borrow_requests_copy_check" CHECK("__new_borrow_requests"."status" NOT IN ('approved', 'returned') OR "__new_borrow_requests"."copy_id" IS NOT NULL)
);
--> statement-breakpoint
INSERT INTO `__new_borrow_requests`("id", "user_id", "book_id", "copy_id", "request_date", "status", "librarian_id", "approved_date", "due_date", "return_date", "notes", "rejection_reason", "created_at", "updated_at") SELECT "id", "user_id", "book_id", "copy_id", "request_date", "status", "librarian_id", "approved_date", "due_date", "return_date", "notes", "rejection_reason", "created_at", "updated_at" FROM `borrow_requests`;--> statement-breakpoint
DROP TABLE `borrow_requests`;--> statement-breakpoint
ALTER TABLE `__new_borrow_requests` RENAME TO `borrow_requests`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `borrow_requests_user_idx` ON `borrow_requests` (`user_id`,`request_date`);--> statement-breakpoint
CREATE INDEX `borrow_requests_queue_idx` ON `borrow_requests` (`request_date`,`id`) WHERE "borrow_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX `borrow_requests_due_idx` ON `borrow_requests` (`due_date`,`id`) WHERE "borrow_requests"."status" = 'approved';--> statement-breakpoint
CREATE INDEX `borrow_requests_book_idx` ON `borrow_requests` (`book_id`);--> statement-breakpoint
CREATE INDEX `borrow_requests_date_idx` ON `borrow_requests` (`request_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `borrow_requests_pending_idx` ON `borrow_requests` (`book_id`,`user_id`) WHERE "borrow_requests"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX `borrow_requests_active_copy_idx` ON `borrow_requests` (`copy_id`) WHERE "borrow_requests"."status" = 'approved';