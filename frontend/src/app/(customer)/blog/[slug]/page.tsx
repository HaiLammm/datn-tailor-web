import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RevealOnScroll } from "@/components/client/brand/RevealOnScroll";
import { BlogCard } from "@/components/client/blog/BlogCard";
import { PostBody } from "@/components/client/blog/PostBody";
import { getAllPosts, getAllSlugs, getPostBySlug } from "@/lib/blog";
import { formatBlogDate } from "@/lib/format-date";

const CORMORANT = { fontFamily: "Cormorant Garamond, serif" } as const;
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

/** SSG: pre-render every published post at build time. */
export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Không tìm thấy bài viết" };

  const url = `/blog/${post.slug}`;
  const images = post.image ? [{ url: post.image, alt: post.imageAlt }] : undefined;
  return {
    title: `${post.title} — Nhà May Thanh Lộc`,
    description: post.description || post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description || post.excerpt,
      type: "article",
      url,
      publishedTime: post.publishedDate || undefined,
      authors: [post.author],
      images,
    },
    twitter: {
      card: post.image ? "summary_large_image" : "summary",
      title: post.title,
      description: post.description || post.excerpt,
      images: post.image ? [post.image] : undefined,
    },
  };
}

export default async function BlogPostPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getAllPosts()
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, 3);

  const absolute = (p: string | null) =>
    !p ? undefined : p.startsWith("http") ? p : SITE_URL ? `${SITE_URL}${p}` : p;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description || post.excerpt,
    datePublished: post.publishedDate || undefined,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: "Nhà May Thanh Lộc" },
    image: absolute(post.image),
    mainEntityOfPage: SITE_URL ? `${SITE_URL}/blog/${post.slug}` : `/blog/${post.slug}`,
    articleSection: post.categoryLabel,
  };

  return (
    <div className="bg-[#F9F7F2] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article>
        {/* Header */}
        <header className="bg-gradient-to-b from-[#1A2B4C] to-[#22335A] text-[#F9F7F2]">
          <div className="container mx-auto px-4 max-w-3xl py-14 md:py-20 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-sm text-[#F9F7F2]/70 hover:text-[#D4AF37] transition-colors mb-6 focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            >
              ← Nhật ký áo dài
            </Link>
            <div className="flex items-center justify-center gap-2 mb-4 text-xs">
              <span className="font-semibold uppercase tracking-[0.16em] text-[#D4AF37]">
                {post.categoryLabel}
              </span>
              {post.publishedDate && (
                <>
                  <span aria-hidden="true" className="text-[#F9F7F2]/40">·</span>
                  <time dateTime={post.publishedDate} className="text-[#F9F7F2]/70">
                    {formatBlogDate(post.publishedDate)}
                  </time>
                </>
              )}
              <span aria-hidden="true" className="text-[#F9F7F2]/40">·</span>
              <span className="text-[#F9F7F2]/70">{post.readingMinutes} phút đọc</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold leading-tight" style={CORMORANT}>
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-5 text-lg text-[#F9F7F2]/85">{post.excerpt}</p>
            )}
          </div>
        </header>

        {/* Cover image */}
        {post.image && (
          <div className="container mx-auto px-4 max-w-3xl -mt-8 md:-mt-10">
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-[#ece7da] shadow-sm bg-[#f1ece0]">
              <Image
                src={post.image}
                alt={post.imageAlt}
                fill
                priority
                sizes="(min-width: 768px) 768px, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="container mx-auto px-4 py-12 md:py-16">
          <PostBody markdown={post.body} />

          {post.tags.length > 0 && (
            <div className="max-w-2xl mx-auto mt-12 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-3 py-1 rounded-full bg-[#efe9da] text-[#6B7280]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="py-16 bg-white border-t border-[#ece7da]">
          <div className="container mx-auto px-4">
            <h2
              className="text-3xl font-serif font-semibold text-[#1A2B4C] mb-10 text-center"
              style={CORMORANT}
            >
              Bài viết liên quan
            </h2>
            <RevealOnScroll>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {related.map((p) => (
                  <li key={p.slug} className="h-full">
                    <BlogCard post={p} />
                  </li>
                ))}
              </ul>
            </RevealOnScroll>
          </div>
        </section>
      )}
    </div>
  );
}
