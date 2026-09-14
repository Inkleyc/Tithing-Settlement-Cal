import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ward Tithing Declaration",
  description: "Public scheduling and admin management for ward tithing declarations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-100 text-slate-900">{children}</body>
    </html>
  );
}
