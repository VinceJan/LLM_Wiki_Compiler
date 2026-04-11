import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLM Wiki Compiler",
  description: "可视化的 LLM Wiki 编译器",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
