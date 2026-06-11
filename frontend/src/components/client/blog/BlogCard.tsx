import Image from "next/image";
import Link from "next/link";

import type { BlogPostMeta } from "@/lib/blog";
import { formatBlogDate } from "@/lib/format-date";

const CORMORANT = { fontFamily: "Cormorant Garamond, serif" } as const;

/**
 * BlogCard — a single post teaser, styled to match the boutique brand
 * (Heritage Gold eyebrow, Cormorant heading, Indigo text). Server Component.
 */
export function BlogCard({ post }: { post: BlogPostMeta }) {
  return (
    <article className="group h-full flex flex-col bg-white border border-[#ece7da] rounded-2xl overflow-hidden shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
      <Link
        href={`/blog/${post.slug}`}
        className="block focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
      >
        <div className="relative aspect-[16/10] bg-[#f1ece0]">
          {post.image ? (
            <Image
              src={post.image}
              alt={post.imageAlt}
              fill
              sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(120%_90%_at_30%_0%,rgba(212,175,55,0.22),transparent_55%),linear-gradient(140deg,#22335a,#1A2B4C_45%,#101b33)]"
            />
          )}
        </div>
      </Link>

      <div className="flex flex-col flex-1 p-6">
        <div className="flex items-center gap-2 mb-3 text-xs">
          <span className="font-semibold uppercase tracking-[0.16em] text-[#D4AF37]">
            {post.categoryLabel}
          </span>
          <span aria-hidden="true" className="text-[#d8cdb6]">·</span>
          <span className="text-[#6B7280]">{post.readingMinutes} phút đọc</span>
        </div>

        <h3 className="text-2xl font-serif font-semibold text-[#1A2B4C] mb-2 leading-snug" style={CORMORANT}>
          <Link
            href={`/blog/${post.slug}`}
            className="hover:text-[#9c7b1f] transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
          >
            {post.title}
          </Link>
        </h3>

        {post.excerpt && (
          <p className="text-[#6B7280] text-[15px] leading-relaxed line-clamp-3 flex-1">
            {post.excerpt}
          </p>
        )}

        {post.publishedDate && (
          <time dateTime={post.publishedDate} className="mt-4 block text-xs text-[#9aa1ad]">
            {formatBlogDate(post.publishedDate)}
          </time>
        )}
      </div>
    </article>
  );
}
