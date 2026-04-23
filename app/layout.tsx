import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Тренажёр произношения (китайский)",
  description: "Практика произношения для русскоязычных",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="font-sans">{children}</body>
    </html>
  );
}
