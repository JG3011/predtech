CREATE TABLE "maintenances" (
	"id" serial PRIMARY KEY,
	"motor_id" integer NOT NULL,
	"motor_name" text NOT NULL,
	"performed_at" timestamp NOT NULL,
	"description" text NOT NULL,
	"reason" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "motor_ranges" (
	"motor_id" integer,
	"variable" text,
	"min" real NOT NULL,
	"max" real NOT NULL,
	"attention_band" real NOT NULL,
	CONSTRAINT "motor_ranges_pkey" PRIMARY KEY("motor_id","variable")
);
--> statement-breakpoint
CREATE TABLE "motors" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_logs" ADD COLUMN "event" text DEFAULT 'login' NOT NULL;--> statement-breakpoint
ALTER TABLE "access_logs" ADD COLUMN "page" text;--> statement-breakpoint
ALTER TABLE "failures" ADD COLUMN "motor_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "readings" ADD COLUMN "motor_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "motor_ranges" ADD CONSTRAINT "motor_ranges_motor_id_motors_id_fkey" FOREIGN KEY ("motor_id") REFERENCES "motors"("id") ON DELETE CASCADE;--> statement-breakpoint
INSERT INTO "motors" ("name") VALUES ('Motor 1');--> statement-breakpoint
INSERT INTO "motor_ranges" ("motor_id", "variable", "min", "max", "attention_band")
SELECT (SELECT MIN("id") FROM "motors"), "variable", "min", "max", "attention_band" FROM "ranges"
ON CONFLICT DO NOTHING;
