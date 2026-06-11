import Image from "next/image";
import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * PostBody — renders a Markdown blog body with the boutique's typographic style.
 * Server Component (react-markdown renders statically; no client JS shipped).
 * The element overrides replace the missing @tailwindcss/typography "prose" plugin.
 */

const CORMORANT = { fontFamily: "Cormorant Garamond, serif" } as const;

type Props<T extends keyof React.JSX.IntrinsicElements> = ComponentPropsWithoutRef<T>;

export function PostBody({ markdown }: { markdown: string }) {
  return (
    <div className="max-w-2xl mx-auto text-[#374151] text-[17px] leading-[1.8]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }: Props<"h2">) => (
            <h2
              className="mt-12 mb-4 text-3xl font-serif font-semibold text-[#1A2B4C]"
              style={CORMORANT}
            >
              {children}
            </h2>
          ),
          h3: ({ children }: Props<"h3">) => (
            <h3
              className="mt-9 mb-3 text-2xl font-serif font-semibold text-[#1A2B4C]"
              style={CORMORANT}
            >
              {children}
            </h3>
          ),
          p: ({ children }: Props<"p">) => <p className="my-5">{children}</p>,
          a: ({ href, children }: Props<"a">) => (
            <a
              href={href}
              className="text-[#9c7b1f] underline underline-offset-2 hover:text-[#D4AF37] transition-colors"
              {...(href?.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {children}
            </a>
          ),
          ul: ({ children }: Props<"ul">) => (
            <ul className="my-5 list-disc pl-6 space-y-2 marker:text-[#D4AF37]">{children}</ul>
          ),
          ol: ({ children }: Props<"ol">) => (
            <ol className="my-5 list-decimal pl-6 space-y-2 marker:text-[#D4AF37]">{children}</ol>
          ),
          li: ({ children }: Props<"li">) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }: Props<"blockquote">) => (
            <blockquote
              className="my-7 border-l-4 border-[#D4AF37] pl-5 italic text-[#1A2B4C] font-serif text-xl"
              style={CORMORANT}
            >
              {children}
            </blockquote>
          ),
          strong: ({ children }: Props<"strong">) => (
            <strong className="font-semibold text-[#1A2B4C]">{children}</strong>
          ),
          hr: () => <hr className="my-10 border-t border-[#ece7da]" />,
          img: ({ src, alt }: Props<"img">) =>
            typeof src === "string" && src ? (
              <Image
                src={src}
                alt={alt ?? ""}
                width={1280}
                height={720}
                className="my-8 w-full h-auto rounded-2xl border border-[#ece7da]"
              />
            ) : null,
          table: ({ children }: Props<"table">) => (
            <div className="my-7 overflow-x-auto">
              <table className="w-full text-left border-collapse text-[15px]">{children}</table>
            </div>
          ),
          th: ({ children }: Props<"th">) => (
            <th className="border-b-2 border-[#e3dcc9] px-3 py-2 font-semibold text-[#1A2B4C]">
              {children}
            </th>
          ),
          td: ({ children }: Props<"td">) => (
            <td className="border-b border-[#ece7da] px-3 py-2 align-top">{children}</td>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
