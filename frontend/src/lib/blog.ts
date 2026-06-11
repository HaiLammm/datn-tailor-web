/**
 * File-based blog source (Story: Blog CMS + SEO automation).
 *
 * Posts are Markdown files in `frontend/content/blog/<slug>.md` with YAML
 * frontmatter. They are committed into the repo — by hand or by the SEO automation
 * (auto_workflow/seo-cockpit, which commits the same `title/description/excerpt/
 * publishedDate/category/image/imageAlt` frontmatter). The site reads them at BUILD
 * time (SSG), so a new post lands when the repo is redeployed.
 *
 * Server-only: uses `node:fs`. Never import from a Client Component.
 */

import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import readingTime from "reading-time";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

/** Non-post files living alongside the content (docs, not articles). */
const RESERVED = new Set(["README.md", "readme.md"]);

/** Display labels for known category slugs (plain Vietnamese, customer-facing). */
export const CATEGORY_LABELS: Record<string, string> = {
  "cam-nang": "Cẩm nang",
  "xu-huong": "Xu hướng",
  "cau-chuyen": "Câu chuyện nghề",
  "huong-dan": "Hướng dẫn",
  "cham-soc": "Chăm sóc áo dài",
};

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string; // SEO meta description
  excerpt: string; // card teaser
  publishedDate: string; // YYYY-MM-DD
  category: string; // raw slug
  categoryLabel: string; // display label
  tags: string[];
  image: string | null; // cover; absolute path under /public or external URL
  imageAlt: string;
  author: string;
  readingMinutes: number;
  draft: boolean;
}

export interface BlogPost extends BlogPostMeta {
  body: string; // Markdown body (no frontmatter)
}

/** Normalise a frontmatter date (gray-matter parses unquoted YAML dates to Date). */
function toISODate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string" && value.trim()) return value.trim().slice(0, 10);
  return "";
}

function labelFor(category: string): string {
  if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category];
  if (!category) return "Bài viết";
  // Fallback: turn a free-form/foreign category into a readable label.
  return category.charAt(0).toUpperCase() + category.slice(1).replace(/[-_]/g, " ");
}

function readPost(slug: string): BlogPost | null {
  const file = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;

  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);

  const category = String(data.category ?? "").trim();
  const tags = Array.isArray(data.tags)
    ? data.tags.map((t) => String(t)).filter(Boolean)
    : [];

  const title = String(data.title ?? slug).trim();
  const description = String(data.description ?? data.excerpt ?? "").trim();
  const excerpt = String(data.excerpt ?? data.description ?? "").trim();

  return {
    slug,
    title,
    description,
    excerpt,
    publishedDate: toISODate(data.publishedDate ?? data.date),
    category,
    categoryLabel: labelFor(category),
    tags,
    image: data.image ? String(data.image).trim() : null,
    imageAlt: String(data.imageAlt ?? title).trim(),
    author: String(data.author ?? "Nhà May Thanh Lộc").trim(),
    readingMinutes: Math.max(1, Math.round(readingTime(content).minutes)),
    draft: data.draft === true,
    body: content.trim(),
  };
}

/** True when a post should be visible on the live site (drafts hidden in prod). */
function isVisible(post: BlogPostMeta): boolean {
  if (process.env.NODE_ENV === "production") return !post.draft;
  return true;
}

/** All published slugs (for generateStaticParams). */
export function getAllSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md") && !RESERVED.has(f) && !f.startsWith("_"))
    .map((f) => f.replace(/\.md$/, ""))
    .filter((slug) => {
      const post = readPost(slug);
      return post !== null && isVisible(post);
    });
}

/** A single post by slug, or null (also returns null for hidden drafts in prod). */
export function getPostBySlug(slug: string): BlogPost | null {
  const post = readPost(slug);
  if (!post || !isVisible(post)) return null;
  return post;
}

/** All visible posts, newest first. */
export function getAllPosts(): BlogPost[] {
  return getAllSlugs()
    .map((slug) => readPost(slug))
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
}

/** Distinct categories present in visible posts, with labels and counts. */
export function getCategories(): { slug: string; label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of getAllPosts()) {
    if (!post.category) continue;
    counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([slug, count]) => ({ slug, label: labelFor(slug), count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
