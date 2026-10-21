CREATE TABLE `chat_requests` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`chat` text NOT NULL,
	`digest` text NOT NULL,
	`status` text NOT NULL,
	`response` text,
	`updated` integer NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE INDEX `chat_requests_owner_chat` ON `chat_requests` (`owner`,`chat`);