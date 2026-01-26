-- Cleanup migration: drop github_links and foreign_entities tables
-- These were added in migrations that won't be merged

-- Drop github_links indexes and table
DROP INDEX IF EXISTS idx_github_links_github_username;
DROP INDEX IF EXISTS idx_github_links_macro_id;
DROP INDEX IF EXISTS uq_github_links_github_user_id;
DROP INDEX IF EXISTS uq_github_links_fusionauth_user_id;
DROP TABLE IF EXISTS public.github_links;

-- Drop foreign_entities trigger, function, indexes, and table
DROP TRIGGER IF EXISTS trigger_update_foreign_entities_updated_at ON public.foreign_entities;
DROP FUNCTION IF EXISTS update_foreign_entities_updated_at();
DROP INDEX IF EXISTS idx_foreign_entities_path;
DROP INDEX IF EXISTS idx_foreign_entities_namespaced_identifier;
DROP TABLE IF EXISTS public.foreign_entities;
