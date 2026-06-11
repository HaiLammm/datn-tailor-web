import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import SessionProvider from "@/components/providers/SessionProvider";

const cormorant = Cormorant_Garamond({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nhamaythanhloc.vn";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Nhà May Thanh Lộc - Hệ thống May Đo Thông Minh",
  description: "Nền tảng quản lý đơn hàng và sản xuất cho xưởng may đo cao cấp",
  // Ảnh đại diện (OpenGraph) khi chia sẻ link — mặt tiền tiệm Áo Dài Thanh Lộc.
  // Các trang có openGraph riêng (vd bài blog) sẽ tự ghi đè ảnh này.
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Nhà May Thanh Lộc",
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
