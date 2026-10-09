import { siteConfig } from "@/config/site";
import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/toaster";
import { ViewTransition } from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: `Biblioteca 216 — ${siteConfig.name}`,
    template: `%s - ${siteConfig.name}`,
  },
  metadataBase: new URL(siteConfig.url),
  description: siteConfig.description,
  keywords: ["biblioteca", "fisica", "216", "caefisica"],
  authors: [
    {
      name: "@caefisica",
      url: "https://caefisica.com",
    },
  ],
  creator: "David Duran",
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${inter.className}`}>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <ViewTransition name="test">{children}</ViewTransition>
          </main>
          <Footer />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
