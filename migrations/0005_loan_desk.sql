ALTER TABLE `borrow_requests` ADD `rejection_reason` text;--> statement-breakpoint
CREATE INDEX `borrow_requests_queue_idx` ON `borrow_requests` (`request_date`,`id`) WHERE "borrow_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX `borrow_requests_due_idx` ON `borrow_requests` (`due_date`,`id`) WHERE "borrow_requests"."status" = 'approved';--> statement-breakpoint
CREATE INDEX `copies_book_status_idx` ON `copies` (`book_id`,`status`);