CREATE TABLE `chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`document_id` text NOT NULL,
	`space` text NOT NULL,
	`name` text NOT NULL,
	`content` text NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chunks_owner_space` ON `chunks` (`owner`,`space`);--> statement-breakpoint
CREATE INDEX `chunks_owner_document` ON `chunks` (`owner`,`document_id`);--> statement-breakpoint
CREATE TABLE `documents` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`space` text NOT NULL,
	`name` text NOT NULL,
	`object_key` text NOT NULL,
	`size` integer NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE INDEX `documents_owner_space` ON `documents` (`owner`,`space`);--> statement-breakpoint
CREATE TABLE `records` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`updated` integer NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE INDEX `records_owner_kind` ON `records` (`owner`,`kind`);--> statement-breakpoint
CREATE TABLE `usage` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`model` text NOT NULL,
	`input` integer,
	`output` integer,
	`elapsed` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `usage_owner_created` ON `usage` (`owner`,`created`);