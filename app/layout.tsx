import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";

/** The one face (design §3, D-008): the variable Geist file that ships with the app. */
const fontGeist = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Lynq",
  description: "Analytics that respects your visitors.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn("bg-canvas font-sans text-ink", fontGeist.variable)}>
        {children}
        {/* Lynq tracks itself (design §11). */}
        <script
          defer
          src="/js/lynq.js"
          data-site="lynq.byharsh.com"
          data-vitals=""
          data-outbound=""
          data-auto-events=""
        />
      </body>
    </html>
  );
}
