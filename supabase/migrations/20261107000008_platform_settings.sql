-- ============================================================================
-- Platform settings: key-value store for global admin-configurable options.
-- Admin write via RLS; authenticated read; seeded with defaults.
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_settings_select ON public.platform_settings;
CREATE POLICY platform_settings_select ON public.platform_settings
  FOR SELECT TO authenticated
  USING (get_user_role() IS NOT NULL);

DROP POLICY IF EXISTS platform_settings_admin_write ON public.platform_settings;
CREATE POLICY platform_settings_admin_write ON public.platform_settings
  FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]));

INSERT INTO public.platform_settings (key, value) VALUES
  ('default_currency', '"GHS"'::jsonb),
  ('site_name', '"LMS"'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMIT;
