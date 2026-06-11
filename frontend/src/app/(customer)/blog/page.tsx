import type { Metadata } from "next";

import { HeroBanner } from "@/components/client/brand/HeroBanner";
import { RevealOnScroll } from "@/components/client/brand/RevealOnScroll";
import { BlogCard } from "@/components/client/blog/BlogCard";
import { getAllPosts } from "@/lib/blog";

/**
 * Blog index — file-based posts from `content/blog/*.md`, rendered SSG.
 * Lives in the (customer) route group so it inherits the navbar + footer chrome.
 */

export const metadata: Metadata = {
  title: "Nhật ký áo dài — Nhà May Thanh Lộc",
  description:
    "Cẩm nang chọn và giữ gìn áo dài, câu chuyện nghề may và những nét duyên Việt — góp nhặt từ Nhà May Thanh Lộc.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Nhật ký áo dài — Nhà May Thanh Lộc",
    description:
      "Cẩm nang chọn và giữ gìn áo dài, câu chuyện nghề may và những nét duyên Việt.",
    type: "website",
    url: "/blog",
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="bg-[#F9F7F2] min-h-screen">
      <HeroBanner
        variant="showroom-compact"
        eyebrow="Nhật ký · Nhà May Thanh Lộc"
        title="Chuyện tà áo dài"
        subline="Cẩm nang chọn vải, giữ dáng áo, và những câu chuyện nghề được góp nhặt qua bao mùa."
      />

      <section className="py-16">
        <div className="container mx-auto px-4">
          {posts.length === 0 ? (
            <p className="text-center text-[#6B7280] py-16">
              Chưa có bài viết nào. Mời bạn ghé lại sau nhé.
            </p>
          ) : (
            <RevealOnScroll>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post) => (
                  <li key={post.slug} className="h-full">
                    <BlogCard post={post} />
                  </li>
                ))}
              </ul>
            </RevealOnScroll>
          )}
        </div>
      </section>
    </div>
  );
}
