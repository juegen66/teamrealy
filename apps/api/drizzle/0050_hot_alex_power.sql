CREATE TABLE "initiative_link" (
	"id" text PRIMARY KEY NOT NULL,
	"initiative_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "initiative_update" (
	"id" text PRIMARY KEY NOT NULL,
	"initiative_id" text NOT NULL,
	"user_id" text,
	"health" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "initiative" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "initiative" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "initiative" ADD COLUMN "priority" text DEFAULT 'no-priority' NOT NULL;--> statement-breakpoint
ALTER TABLE "initiative_link" ADD CONSTRAINT "initiative_link_initiative_id_initiative_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiative"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "initiative_update" ADD CONSTRAINT "initiative_update_initiative_id_initiative_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiative"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "initiative_update" ADD CONSTRAINT "initiative_update_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "initiative_link_initiativeId_idx" ON "initiative_link" USING btree ("initiative_id");--> statement-breakpoint
CREATE INDEX "initiative_update_initiativeId_createdAt_idx" ON "initiative_update" USING btree ("initiative_id","created_at");