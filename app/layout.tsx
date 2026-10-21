import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "幕云AI · 你的开放工作台",
  description: "自由选择模型，将知识变成行动。私人 AI 对话、知识空间、智能体与任务流。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
