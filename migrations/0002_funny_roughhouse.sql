ALTER TABLE "survey_responses" ADD COLUMN "question8" text NOT NULL;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD COLUMN "total_score" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD COLUMN "score_percentage" integer NOT NULL;