-- Run once in Supabase's SQL Editor AFTER deploying the updated website code.
-- Replaces only the three old portfolio tables; preserves their current content.
-- Storage files, Auth and unrelated tables are untouched. Any error rolls everything back.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'skills_label') THEN
    RAISE EXCEPTION 'The old portfolio schema was not found. This migration runs only once.';
  END IF;
END;
$$;

LOCK TABLE public.projects, public.project_links, public.project_images IN ACCESS EXCLUSIVE MODE;
CREATE TEMP TABLE old_projects ON COMMIT DROP AS SELECT * FROM public.projects;
CREATE TEMP TABLE old_links ON COMMIT DROP AS SELECT * FROM public.project_links;
CREATE TEMP TABLE old_images ON COMMIT DROP AS SELECT * FROM public.project_images;

-- Sorting dates use the end month of each project; timeframe text stays unchanged.
CREATE TEMP TABLE project_metadata (
  slug text PRIMARY KEY, type text NOT NULL, project_date date NOT NULL
) ON COMMIT DROP;
INSERT INTO project_metadata (slug, type, project_date) VALUES
  ('cmdnavigator', 'school', '2026-07-01'),
  ('autoweek', 'internship', '2025-12-01'),
  ('exchange', 'school', '2024-12-01'),
  ('tweakers', 'internship', '2024-04-01'),
  ('colors', 'school', '2024-06-01'),
  ('webuildapps', 'internship', '2022-05-01'),
  ('intouch', 'school', '2024-02-01'),
  ('canvasheroes', 'internship', '2021-02-01');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM old_projects p LEFT JOIN project_metadata m USING (slug)
             WHERE m.slug IS NULL) THEN
    RAISE EXCEPTION 'An additional project needs a type/date in project_metadata above. Nothing was changed.';
  END IF;
  IF EXISTS (SELECT 1 FROM old_images WHERE src NOT LIKE
    'https://jxwsiatpapxbwoqedytp.supabase.co/storage/v1/object/public/%/%'
    OR src ~ '[%?#]') THEN
    RAISE EXCEPTION 'An image has an unexpected URL. Check its Storage path before migrating. Nothing was changed.';
  END IF;
END;
$$;

-- No CASCADE: unexpected dependencies cause a rollback instead of being removed.
DROP TABLE public.project_images;
DROP TABLE public.project_links;
DROP TABLE public.projects;

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


-- Reuse each label and skill across projects. Preserve skill spelling and order.
INSERT INTO public.skill_labels (label)
SELECT DISTINCT upper(btrim(skills_label)) FROM old_projects WHERE btrim(skills_label) <> '';

INSERT INTO public.skills (skill)
SELECT DISTINCT ON (lower(btrim(s.skill))) btrim(s.skill)
FROM old_projects p CROSS JOIN LATERAL unnest(p.skills) WITH ORDINALITY s(skill, position)
WHERE btrim(s.skill) <> ''
ORDER BY lower(btrim(s.skill)), p.sort_order, p.slug, s.position;

INSERT INTO public.projects
  (id, slug, title, description, body, skill_label_id, role, team, timeframe, project_date, type, created_at)
SELECT p.id, p.slug, p.title, p.description, p.body, l.id, p.role, p.team, p.timeframe,
       m.project_date, m.type, p.created_at
FROM old_projects p JOIN project_metadata m USING (slug)
LEFT JOIN public.skill_labels l ON l.label = upper(btrim(p.skills_label));

INSERT INTO public.project_skills (project_id, skill_id, sort_order)
SELECT p.id, s.id, (min(item.position) - 1)::integer
FROM old_projects p CROSS JOIN LATERAL unnest(p.skills) WITH ORDINALITY item(skill, position)
JOIN public.skills s ON lower(s.skill) = lower(btrim(item.skill))
GROUP BY p.id, s.id;

CREATE TEMP TABLE image_sources ON COMMIT DROP AS
SELECT i.*, split_part(path, '/', 1) AS bucket,
  substr(path, strpos(path, '/') + 1) AS storage_path
FROM old_images i CROSS JOIN LATERAL (
  SELECT substr(i.src, length('https://jxwsiatpapxbwoqedytp.supabase.co/storage/v1/object/public/') + 1) AS path
) source;

INSERT INTO public.images (bucket, storage_path, original_filename, width, height)
SELECT DISTINCT ON (bucket, storage_path) bucket, storage_path,
       regexp_replace(storage_path, '^.*/', ''), width, height
FROM image_sources ORDER BY bucket, storage_path, id;

INSERT INTO public.project_images (id, project_id, image_id, alt, caption, sort_order)
SELECT old.id, old.project_id, asset.id, old.alt, old.caption, old.sort_order
FROM image_sources old JOIN public.images asset USING (bucket, storage_path);

INSERT INTO public.project_links (id, project_id, label, url, sort_order)
SELECT id, project_id, label, url, sort_order FROM old_links;

-- Verify preservation before committing. Failed checks also restore the old schema.
DO $$
BEGIN
  IF (SELECT count(*) FROM public.projects) <> (SELECT count(*) FROM old_projects)
     OR (SELECT count(*) FROM public.project_links) <> (SELECT count(*) FROM old_links)
     OR (SELECT count(*) FROM public.project_images) <> (SELECT count(*) FROM old_images) THEN
    RAISE EXCEPTION 'Content counts do not match; migration cancelled.';
  END IF;
  IF EXISTS (
    SELECT id, slug, title, description, body, role, team, timeframe, created_at FROM old_projects
    EXCEPT SELECT id, slug, title, description, body, role, team, timeframe, created_at FROM public.projects
  ) OR EXISTS (
    SELECT id, project_id, upper(btrim(label)), url, sort_order FROM old_links
    EXCEPT SELECT id, project_id, label, url, sort_order FROM public.project_links
  ) OR EXISTS (
    SELECT id, project_id, src, alt, width, height, caption, sort_order FROM old_images
    EXCEPT SELECT p.id, p.project_id,
      'https://jxwsiatpapxbwoqedytp.supabase.co/storage/v1/object/public/' || i.bucket || '/' || i.storage_path,
      p.alt, i.width, i.height, p.caption, p.sort_order
    FROM public.project_images p JOIN public.images i ON i.id = p.image_id
  ) OR EXISTS (
    SELECT p.id, lower(btrim(item.skill)), (min(item.position) - 1)::integer
    FROM old_projects p CROSS JOIN LATERAL unnest(p.skills) WITH ORDINALITY item(skill, position)
    WHERE btrim(item.skill) <> '' GROUP BY p.id, lower(btrim(item.skill))
    EXCEPT SELECT p.project_id, lower(s.skill), p.sort_order
    FROM public.project_skills p JOIN public.skills s ON s.id = p.skill_id
  ) THEN
    RAISE EXCEPTION 'Content preservation check failed; migration cancelled.';
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;

SELECT 'projects' AS item, count(*) FROM public.projects
UNION ALL SELECT 'links', count(*) FROM public.project_links
UNION ALL SELECT 'image placements', count(*) FROM public.project_images
UNION ALL SELECT 'image assets', count(*) FROM public.images
UNION ALL SELECT 'skills', count(*) FROM public.skills
UNION ALL SELECT 'skill labels', count(*) FROM public.skill_labels;
