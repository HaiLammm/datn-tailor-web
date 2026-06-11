import type { MetadataRoute } from "next";

import { getAllPosts } from "@/lib/blog";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nhamaythanhloc.vn").replace(/\/$/, "");

/** Sitemap: public marketing routes + every published blog post. */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/showroom", "/about", "/blog", "/contact", "/booking"].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const posts = getAllPosts().map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.publishedDate || undefined,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...posts];
}
