import { siteConfig } from "@/config/site";
import type React from "react";
import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/toaster";
import { ViewTransition } from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif" });

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
      <body className={`${inter.variable} ${sourceSerif.variable}`}>
        <a
          href="#contenido"
          className="fixed left-2 top-2 z-100 -translate-y-16 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:translate-y-0"
        >
          Saltar al contenido
        </a>
        <div className="flex min-h-dvh flex-col">
          <Header />
          <main id="contenido" className="flex-1">
            <ViewTransition name="page">{children}</ViewTransition>
          </main>
          <Footer />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
