CREATE TABLE `app_values` (
	`owner` text NOT NULL,
	`app` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated` integer NOT NULL,
	PRIMARY KEY(`owner`, `app`, `key`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`state` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`lease` integer DEFAULT 0 NOT NULL,
	`updated` integer NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE INDEX `jobs_owner_updated` ON `jobs` (`owner`,`updated`);--> statement-breakpoint
CREATE TABLE `vault` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`sealed` text NOT NULL,
	`updated` integer NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE TABLE `versions` (
	`owner` text NOT NULL,
	`resource` text NOT NULL,
	`version` integer NOT NULL,
	`data` text NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`owner`, `resource`, `version`)
);
