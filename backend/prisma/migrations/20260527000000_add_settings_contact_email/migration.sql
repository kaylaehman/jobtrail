-- Contact email shown to upstream APIs (specifically SEC EDGAR, which 403s requests
-- without an email in the User-Agent per their fair-use policy). Nullable so existing
-- single-row settings default; frontend shows a banner until the user fills it in.
ALTER TABLE "user_settings" ADD COLUMN "contact_email" TEXT;
