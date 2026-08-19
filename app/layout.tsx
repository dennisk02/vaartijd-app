import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { getSessionPayload } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { htmlLangFor, dirFor, type AppLanguage } from "@/lib/i18n";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Vaartijd",
  description: "Uren, scheepsbezetting en maaltijdregistratie",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vaartijd",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#b91c1c",
};

async function getCurrentLanguage(): Promise<AppLanguage> {
  const session = await getSessionPayload();
  if (!session?.userId) return "NL";
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { language: true } });
  return user?.language ?? "NL";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const language = await getCurrentLanguage();

  return (
    <html
      lang={htmlLangFor(language)}
      dir={dirFor(language)}
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
