CREATE TABLE "access_logs" (
	"id" serial PRIMARY KEY,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user_label" text NOT NULL,
	"role" text NOT NULL,
	"success" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "failures" (
	"id" serial PRIMARY KEY,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"variable" text NOT NULL,
	"value" real NOT NULL,
	"unit" text NOT NULL,
	"status" text NOT NULL,
	"min" real NOT NULL,
	"max" real NOT NULL,
	"attention_band" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ranges" (
	"variable" text PRIMARY KEY,
	"min" real NOT NULL,
	"max" real NOT NULL,
	"attention_band" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readings" (
	"id" serial PRIMARY KEY,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"corrente" real NOT NULL,
	"temperatura" real NOT NULL,
	"vibracao" real NOT NULL,
	"rotacao" real NOT NULL
);
