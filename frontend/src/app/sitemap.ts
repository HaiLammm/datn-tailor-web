import type { MetadataRoute } from "next";

import { getAllPosts } from "@/lib/blog";
import { SITE_URL, garmentPath } from "@/lib/seo";
import { SHOWROOM_ENABLED } from "@/lib/store-info";

// Tạo lúc có request (lúc build Docker backend chưa chạy → không được đóng băng bản rỗng);
// dữ liệu sản phẩm vẫn được cache 1 giờ qua fetch revalidate.
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

async function fetchAllGarments(): Promise<{ id: string; name: string }[]> {
  const out: { id: string; name: string }[] = [];
  try {
    for (let page = 1; page <= 20; page++) {
      const res = await fetch(`${BACKEND_URL}/api/v1/garments?page=${page}&page_size=100`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;
      const json = await res.json();
      const items: { id: string; name: string }[] = json?.data?.items ?? [];
      out.push(...items.map(({ id, name }) => ({ id, name })));
      if (page >= (json?.data?.total_pages ?? 1)) break;
    }
  } catch {
    // Backend không truy cập được → sitemap vẫn có trang tĩnh + blog.
  }
  return out;
}

/** Sitemap: các trang công khai + bài blog + từng sản phẩm trong showroom. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = ["", ...(SHOWROOM_ENABLED ? ["/showroom"] : []), "/about", "/blog", "/contact", "/booking"];
  const staticRoutes = paths.map((path) => ({
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

  const garments = (SHOWROOM_ENABLED ? await fetchAllGarments() : []).map((g) => ({
    url: `${SITE_URL}${garmentPath(g)}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...posts, ...garments];
}
