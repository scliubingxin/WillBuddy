CREATE TABLE `deleted_chats` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`data` text NOT NULL,
	`deleted` integer NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE INDEX `deleted_chats_owner_expires` ON `deleted_chats` (`owner`,`expires`);
