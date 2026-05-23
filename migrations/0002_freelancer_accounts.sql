-- M1: Freelancer / Individual / Team Accounts — schema additions
-- Non-breaking: all new columns have defaults or are nullable.
-- Existing companies default to accountType='company', existing tenders to '{company}'.

ALTER TABLE "companies" ADD COLUMN "account_type" text NOT NULL DEFAULT 'company';
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "national_id_number" text;
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "owner_user_id" varchar;
--> statement-breakpoint
ALTER TABLE "tenders" ADD COLUMN "target_audience_types" text[] DEFAULT '{company}';
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_national_id_number_unique" UNIQUE("national_id_number");
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_user_id_users_id_fk"
  FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
