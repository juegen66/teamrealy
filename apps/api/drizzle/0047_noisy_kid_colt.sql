ALTER TABLE "agent_run" ALTER COLUMN "task_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "schedule" text;