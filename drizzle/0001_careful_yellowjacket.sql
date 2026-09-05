CREATE TABLE `trace_events` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`input` text NOT NULL,
	`output` text NOT NULL,
	`evidence_keys` text NOT NULL,
	`decision` text NOT NULL,
	`latency_ms` integer NOT NULL,
	`prism_forwarded` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
