-- Empty portfolio schema. Run ONLY in a database without portfolio tables.
-- The existing database is already set up; do not run this there again.
BEGIN;

CREATE TABLE public.skill_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE CHECK (label <> '' AND label = upper(btrim(label)))
);

CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill text NOT NULL CHECK (skill <> '' AND skill = btrim(skill))
);
CREATE UNIQUE INDEX skills_name_unique ON public.skills (lower(skill));

CREATE TABLE public.images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL DEFAULT 'portfolio-images'
    CHECK (bucket <> '' AND bucket !~ '[/[:space:]]'),
  storage_path text NOT NULL
    CHECK (storage_path <> '' AND storage_path !~ '^/|(^|/)\.\.?(/|$)'),
  original_filename text NOT NULL DEFAULT '',
  width integer NOT NULL CHECK (width > 0),
  height integer NOT NULL CHECK (height > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, storage_path)
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (btrim(title) <> ''),
  description text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  skill_label_id uuid REFERENCES public.skill_labels(id) ON DELETE RESTRICT,
  role text NOT NULL DEFAULT '',
  team text NOT NULL DEFAULT '',
  timeframe text NOT NULL DEFAULT '',
  project_date date,
  type text NOT NULL DEFAULT 'personal'
    CHECK (type IN ('school', 'personal', 'internship', 'work')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_skill_label_idx ON public.projects (skill_label_id);
CREATE INDEX projects_date_idx ON public.projects (type, project_date DESC NULLS LAST);

CREATE TABLE public.project_skills (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE RESTRICT,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  PRIMARY KEY (project_id, skill_id)
);
CREATE INDEX project_skills_order_idx ON public.project_skills (project_id, sort_order);
CREATE INDEX project_skills_skill_idx ON public.project_skills (skill_id);

CREATE TABLE public.project_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  image_id uuid NOT NULL REFERENCES public.images(id) ON DELETE RESTRICT,
  alt text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  UNIQUE (project_id, image_id)
);
CREATE INDEX project_images_order_idx ON public.project_images (project_id, sort_order);
CREATE INDEX project_images_image_idx ON public.project_images (image_id);

CREATE TABLE public.project_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (label <> '' AND label = upper(btrim(label))),
  url text NOT NULL CHECK (url ~ '^https://[^[:space:]]+$|^/([^/[:space:]][^[:space:]]*)?$'),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0)
);
CREATE INDEX project_links_order_idx ON public.project_links (project_id, sort_order);

-- Normalize labels on insertion/update, including edits in Supabase's Table Editor.
CREATE OR REPLACE FUNCTION public.normalize_portfolio_label()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.label := upper(btrim(NEW.label));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.normalize_portfolio_label() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER normalize_skill_label BEFORE INSERT OR UPDATE OF label
  ON public.skill_labels FOR EACH ROW EXECUTE FUNCTION public.normalize_portfolio_label();
CREATE TRIGGER normalize_link_label BEFORE INSERT OR UPDATE OF label
  ON public.project_links FOR EACH ROW EXECUTE FUNCTION public.normalize_portfolio_label();

-- Visitors can read portfolio content. No public write or upload access is added.
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.projects, public.skill_labels, public.skills, public.project_skills,
  public.images, public.project_images, public.project_links FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.projects, public.skill_labels, public.skills, public.project_skills,
  public.images, public.project_images, public.project_links TO anon, authenticated;

CREATE POLICY portfolio_read ON public.projects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY portfolio_read ON public.skill_labels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY portfolio_read ON public.skills FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY portfolio_read ON public.project_skills FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY portfolio_read ON public.images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY portfolio_read ON public.project_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY portfolio_read ON public.project_links FOR SELECT TO anon, authenticated USING (true);

NOTIFY pgrst, 'reload schema';
COMMIT;
