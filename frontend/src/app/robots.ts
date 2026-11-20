import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/** robots.txt: cho phép trang công khai, chặn khu vực nội bộ/tài khoản; trỏ sitemap. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/owner",
        "/tailor",
        "/design-session",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-otp",
        "/profile",
        "/checkout",
        "/measurement-gate",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
