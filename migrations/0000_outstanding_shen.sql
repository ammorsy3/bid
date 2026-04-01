CREATE TABLE "admin_setup_token" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text,
	"used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"suggestions" jsonb,
	"tender_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_chat_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"company_id" varchar,
	"title" text NOT NULL,
	"tender_id" varchar,
	"tender_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text,
	"user_id" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" varchar NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" varchar NOT NULL,
	"before_state" text,
	"after_state" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "awards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"offer_id" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"block_reason" text,
	"awarded_by" varchar,
	"awarded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"legal_name" text NOT NULL,
	"cr_number" text NOT NULL,
	"vat_number" text,
	"city" text,
	"category" text,
	"certifications" jsonb DEFAULT '[]'::jsonb,
	"documents" jsonb,
	"verification_status" text DEFAULT 'not_verified' NOT NULL,
	"onboarding_state" text DEFAULT 'draft' NOT NULL,
	"rejection_reason" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug"),
	CONSTRAINT "companies_cr_number_unique" UNIQUE("cr_number"),
	CONSTRAINT "companies_vat_number_unique" UNIQUE("vat_number")
);
--> statement-breakpoint
CREATE TABLE "company_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"logo_url" text,
	"header_url" text,
	"brochure_url" text,
	"social_links" jsonb,
	"is_public" boolean DEFAULT true NOT NULL,
	"traction_slug" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_profiles_company_id_unique" UNIQUE("company_id"),
	CONSTRAINT "company_profiles_traction_slug_unique" UNIQUE("traction_slug")
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"company_id" varchar,
	"source" varchar(20) NOT NULL,
	"method" varchar(10),
	"path" text,
	"status_code" integer,
	"error_message" text NOT NULL,
	"stack" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_company_id" varchar NOT NULL,
	"tender_id" varchar,
	"vendor_email" text NOT NULL,
	"token" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	CONSTRAINT "invitation_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_id" varchar NOT NULL,
	"company_id" varchar,
	"vendor_email" text,
	"vendor_name" text,
	"invitation_token" varchar,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_invitation_token_unique" UNIQUE("invitation_token")
);
--> statement-breakpoint
CREATE TABLE "join_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_company_id" varchar,
	"vendor_company_id" varchar,
	"created_by" varchar,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"decided_by" varchar,
	"decided_at" timestamp,
	"requester_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "negotiation_actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_id" varchar NOT NULL,
	"offer_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"action_type" text NOT NULL,
	"message" text NOT NULL,
	"comment" text,
	"metadata" jsonb,
	"status" text DEFAULT 'sent' NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" varchar NOT NULL,
	"viewer_id" varchar NOT NULL,
	"viewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"created_by" varchar NOT NULL,
	"technical_file_url" text,
	"financial_file_url" text,
	"combined_file_url" text,
	"notes" text,
	"quote_price" integer,
	"video_url" text,
	"conditional_submission" boolean DEFAULT false NOT NULL,
	"resubmission_allowed" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_by" varchar,
	"decided_at" timestamp,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"company_id" varchar,
	"user_id" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_analyses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_id" varchar NOT NULL,
	"offer_id" varchar NOT NULL,
	"scores" jsonb,
	"overall_score" integer,
	"extracted_data" jsonb,
	"recommendation" text,
	"model_used" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"executive_summary" text,
	"table_of_contents" jsonb,
	"criteria_mapping" jsonb,
	"deliverables" jsonb,
	"financial" jsonb,
	"analyzed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requester_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"company_name" text,
	"industry" text,
	"description" text,
	"logo_url" text,
	"website" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tender_questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_id" varchar NOT NULL,
	"asked_by_user_id" varchar NOT NULL,
	"asked_by_company_id" varchar,
	"question" text NOT NULL,
	"answer" text,
	"answered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tender_savings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_id" varchar NOT NULL,
	"selected_offer_id" varchar NOT NULL,
	"selected_company_id" varchar NOT NULL,
	"selected_price" integer NOT NULL,
	"highest_price" integer NOT NULL,
	"lowest_price" integer NOT NULL,
	"savings_amount" integer NOT NULL,
	"savings_percentage" integer NOT NULL,
	"selected_by" varchar NOT NULL,
	"selected_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tender_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cards" jsonb NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar,
	"created_by" varchar,
	"requester_id" varchar,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"deadline" text NOT NULL,
	"skills" text[],
	"scope" text,
	"budget" text,
	"budget_range" text,
	"budget_min" integer,
	"budget_max" integer,
	"currency" text DEFAULT 'SAR',
	"project_size" text,
	"show_price_to_vendors" boolean DEFAULT true,
	"pricing_model" text,
	"milestones" jsonb,
	"duration" text,
	"project_timeline" text,
	"start_date" text,
	"end_date" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"submission_type" text,
	"video_required" boolean,
	"inquiry_type" text,
	"whatsapp_contact" text,
	"email_contact" text,
	"evaluation_criteria" jsonb,
	"objective" text,
	"deliverables" jsonb,
	"vendor_requirements" jsonb,
	"voice_note_url" text,
	"video_url" text,
	"attachments" jsonb,
	"form_cards" jsonb,
	"language" text DEFAULT 'en',
	"allow_translation" boolean DEFAULT false,
	"translated_content" jsonb,
	"rfp_requirements" jsonb,
	"rfp_requirements_ar" jsonb,
	"invitation_token" varchar NOT NULL,
	"allow_conditional_submission" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenders_invitation_token_unique" UNIQUE("invitation_token")
);
--> statement-breakpoint
CREATE TABLE "user_companies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"role_in_company" text NOT NULL,
	"invited_by" varchar,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"profile_picture_url" text,
	"job_title" text,
	"timezone" text,
	"linkedin_url" text,
	"phone_number" text,
	"tender_inquiry_email" text,
	"language" text DEFAULT 'en',
	"email_verified" boolean DEFAULT false NOT NULL,
	"email_verification_code" text,
	"email_verification_expiry" timestamp,
	"otp_verified" boolean DEFAULT false NOT NULL,
	"otp_failed_attempts" integer DEFAULT 0 NOT NULL,
	"otp_locked_until" timestamp,
	"otp_send_count" integer DEFAULT 0 NOT NULL,
	"otp_send_window_start" timestamp,
	"role" text,
	"company" text,
	"expertise" text,
	"rating" integer,
	"verification_status" text,
	"onboarding_state" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendor_qualifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" varchar,
	"qualification_type" text,
	"status" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vendors_base" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_company_id" varchar,
	"vendor_company_id" varchar,
	"join_method" text NOT NULL,
	"added_by" varchar,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"requester_id" varchar,
	"vendor_id" varchar
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_session_id_ai_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_awarded_by_users_id_fk" FOREIGN KEY ("awarded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_links" ADD CONSTRAINT "invitation_links_requester_company_id_companies_id_fk" FOREIGN KEY ("requester_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_links" ADD CONSTRAINT "invitation_links_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_requester_company_id_companies_id_fk" FOREIGN KEY ("requester_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_vendor_company_id_companies_id_fk" FOREIGN KEY ("vendor_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_actions" ADD CONSTRAINT "negotiation_actions_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_actions" ADD CONSTRAINT "negotiation_actions_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_actions" ADD CONSTRAINT "negotiation_actions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_actions" ADD CONSTRAINT "negotiation_actions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_views" ADD CONSTRAINT "offer_views_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_views" ADD CONSTRAINT "offer_views_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_analyses" ADD CONSTRAINT "proposal_analyses_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_analyses" ADD CONSTRAINT "proposal_analyses_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_questions" ADD CONSTRAINT "tender_questions_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_questions" ADD CONSTRAINT "tender_questions_asked_by_user_id_users_id_fk" FOREIGN KEY ("asked_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_questions" ADD CONSTRAINT "tender_questions_asked_by_company_id_companies_id_fk" FOREIGN KEY ("asked_by_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_savings" ADD CONSTRAINT "tender_savings_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_savings" ADD CONSTRAINT "tender_savings_selected_offer_id_offers_id_fk" FOREIGN KEY ("selected_offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_savings" ADD CONSTRAINT "tender_savings_selected_company_id_companies_id_fk" FOREIGN KEY ("selected_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_savings" ADD CONSTRAINT "tender_savings_selected_by_users_id_fk" FOREIGN KEY ("selected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_templates" ADD CONSTRAINT "tender_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_templates" ADD CONSTRAINT "tender_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors_base" ADD CONSTRAINT "vendors_base_requester_company_id_companies_id_fk" FOREIGN KEY ("requester_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors_base" ADD CONSTRAINT "vendors_base_vendor_company_id_companies_id_fk" FOREIGN KEY ("vendor_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors_base" ADD CONSTRAINT "vendors_base_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;