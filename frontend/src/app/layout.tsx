import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Tailor Project - Hệ thống May Đo Thông Minh",
  description: "Nền tảng quản lý đơn hàng và sản xuất cho xưởng may đo cao cấp",
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
        {children}
      </body>
    </html>
  );
}
