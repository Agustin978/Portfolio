-- The init CHECKs let NULL through: in a CHECK, NULL counts as satisfied, so a published row
-- with a NULL es/en field was accepted. Require IS NOT NULL explicitly.

ALTER TABLE "projects" DROP CONSTRAINT "projects_published_complete";
ALTER TABLE "projects" ADD CONSTRAINT "projects_published_complete" CHECK (
  "status" <> 'published' OR (
    "title_es" IS NOT NULL AND btrim("title_es") <> '' AND
    "title_en" IS NOT NULL AND btrim("title_en") <> '' AND
    "summary_es" IS NOT NULL AND btrim("summary_es") <> '' AND
    "summary_en" IS NOT NULL AND btrim("summary_en") <> '' AND
    "description_es" IS NOT NULL AND btrim("description_es") <> '' AND
    "description_en" IS NOT NULL AND btrim("description_en") <> ''
  )
);

ALTER TABLE "experiences" DROP CONSTRAINT "experiences_published_complete";
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_published_complete" CHECK (
  "status" <> 'published' OR (
    "role_es" IS NOT NULL AND btrim("role_es") <> '' AND
    "role_en" IS NOT NULL AND btrim("role_en") <> '' AND
    "description_es" IS NOT NULL AND btrim("description_es") <> '' AND
    "description_en" IS NOT NULL AND btrim("description_en") <> ''
  )
);
