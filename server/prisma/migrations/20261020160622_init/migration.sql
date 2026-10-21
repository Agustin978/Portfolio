-- CreateEnum
CREATE TYPE "publish_status" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "email_status" AS ENUM ('pending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "skill_group" AS ENUM ('development', 'data', 'infrastructure', 'other');

-- CreateEnum
CREATE TYPE "contact_lang" AS ENUM ('es', 'en');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "full_name" TEXT NOT NULL,
    "location" TEXT,
    "public_email" TEXT,
    "cv_url_es" TEXT,
    "cv_url_en" TEXT,
    "role_es" TEXT,
    "role_en" TEXT,
    "headline_es" TEXT,
    "headline_en" TEXT,
    "intro_es" TEXT,
    "intro_en" TEXT,
    "bio_es" TEXT,
    "bio_en" TEXT,
    "availability_es" TEXT,
    "availability_en" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_categories" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name_es" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "title_es" TEXT,
    "title_en" TEXT,
    "summary_es" TEXT,
    "summary_en" TEXT,
    "description_es" TEXT,
    "description_en" TEXT,
    "repo_url" TEXT,
    "live_url" TEXT,
    "started_at" DATE,
    "ended_at" DATE,
    "status" "publish_status" NOT NULL DEFAULT 'draft',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ(3),
    "deactivated_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" SERIAL NOT NULL,
    "company" TEXT NOT NULL,
    "company_url" TEXT,
    "location" TEXT,
    "role_es" TEXT,
    "role_en" TEXT,
    "description_es" TEXT,
    "description_en" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" "publish_status" NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "deactivated_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technologies" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "skill_group" "skill_group" NOT NULL DEFAULT 'other',
    "show_in_skills" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_technologies" (
    "project_id" INTEGER NOT NULL,
    "technology_id" INTEGER NOT NULL,

    CONSTRAINT "project_technologies_pkey" PRIMARY KEY ("project_id","technology_id")
);

-- CreateTable
CREATE TABLE "experience_technologies" (
    "experience_id" INTEGER NOT NULL,
    "technology_id" INTEGER NOT NULL,

    CONSTRAINT "experience_technologies_pkey" PRIMARY KEY ("experience_id","technology_id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" SERIAL NOT NULL,
    "cloudinary_public_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "alt_es" TEXT,
    "alt_en" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_images" (
    "project_id" INTEGER NOT NULL,
    "image_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "project_images_pkey" PRIMARY KEY ("project_id","image_id")
);

-- CreateTable
CREATE TABLE "experience_images" (
    "experience_id" INTEGER NOT NULL,
    "image_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "experience_images_pkey" PRIMARY KEY ("experience_id","image_id")
);

-- CreateTable
CREATE TABLE "social_links" (
    "id" SERIAL NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "social_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lang" "contact_lang" NOT NULL DEFAULT 'es',
    "email_status" "email_status" NOT NULL DEFAULT 'pending',
    "email_error" TEXT,
    "sent_at" TIMESTAMPTZ(3),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "project_categories_slug_key" ON "project_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_status_sort_order_idx" ON "projects"("status", "sort_order");

-- CreateIndex
CREATE INDEX "projects_category_id_idx" ON "projects"("category_id");

-- CreateIndex
CREATE INDEX "experiences_status_start_date_idx" ON "experiences"("status", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "technologies_slug_key" ON "technologies"("slug");

-- CreateIndex
CREATE INDEX "project_technologies_technology_id_idx" ON "project_technologies"("technology_id");

-- CreateIndex
CREATE INDEX "experience_technologies_technology_id_idx" ON "experience_technologies"("technology_id");

-- CreateIndex
CREATE UNIQUE INDEX "images_cloudinary_public_id_key" ON "images"("cloudinary_public_id");

-- CreateIndex
CREATE INDEX "project_images_image_id_idx" ON "project_images"("image_id");

-- CreateIndex
CREATE INDEX "experience_images_image_id_idx" ON "experience_images"("image_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_links_platform_key" ON "social_links"("platform");

-- CreateIndex
CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages"("created_at");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "project_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_technologies" ADD CONSTRAINT "experience_technologies_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_technologies" ADD CONSTRAINT "experience_technologies_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_images" ADD CONSTRAINT "experience_images_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_images" ADD CONSTRAINT "experience_images_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written constraints Prisma cannot express. Keep them below this line.
-- ---------------------------------------------------------------------------

-- profile is a singleton.
ALTER TABLE "profile" ADD CONSTRAINT "profile_singleton" CHECK ("id" = 1);

-- Publishing requires every required es/en field to be filled (not just whitespace),
-- enforced here so it holds even for writes that bypass the service layer.
ALTER TABLE "projects" ADD CONSTRAINT "projects_published_complete" CHECK (
  "status" <> 'published' OR (
    btrim("title_es") <> '' AND btrim("title_en") <> '' AND
    btrim("summary_es") <> '' AND btrim("summary_en") <> '' AND
    btrim("description_es") <> '' AND btrim("description_en") <> ''
  )
);

ALTER TABLE "experiences" ADD CONSTRAINT "experiences_published_complete" CHECK (
  "status" <> 'published' OR (
    btrim("role_es") <> '' AND btrim("role_en") <> '' AND
    btrim("description_es") <> '' AND btrim("description_en") <> ''
  )
);

-- At most one cover image per project.
CREATE UNIQUE INDEX "project_images_one_cover" ON "project_images" ("project_id") WHERE "is_cover";
