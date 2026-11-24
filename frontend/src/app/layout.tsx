import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import SessionProvider from "@/components/providers/SessionProvider";

const cormorant = Cormorant_Garamond({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["latin", "vietnamese"],
  variable: "--font-cormorant",
  display: 'swap',
});

import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Áo Dài Thanh Lộc — May áo dài riêng tại Buôn Ma Thuột",
  description:
    "Tiệm may áo dài Thanh Lộc ở Buôn Ma Thuột, Đắk Lắk: may áo dài riêng vừa dáng, áo dài cưới và cho thuê áo dài.",
  // Ảnh đại diện (OpenGraph) khi chia sẻ link — mặt tiền tiệm Áo Dài Thanh Lộc.
  // Các trang có openGraph riêng (vd bài blog) sẽ tự ghi đè ảnh này.
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Áo Dài Thanh Lộc",
    images: [
      {
        url: "/shop/storefront.jpg",
        width: 1080,
        height: 1140,
        alt: "Mặt tiền tiệm Áo Dài Thanh Lộc",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${cormorant.variable} antialiased`}
      >
        <SessionProvider>
          <ReactQueryProvider>
            {children}
          </ReactQueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
