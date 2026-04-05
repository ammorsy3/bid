CREATE TABLE IF NOT EXISTS "tour_progress" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL,
  "tour_id" text NOT NULL,
  "dismissed_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "tour_progress_user_tour_uniq" UNIQUE ("user_id", "tour_id")
);
--> statement-breakpoint
ALTER TABLE "tour_progress" ADD CONSTRAINT "tour_progress_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE no action;
