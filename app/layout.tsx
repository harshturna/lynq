import { cn } from "@/lib/utils";
import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";

const fontSatoshi = localFont({
  src: [
    {
      path: "../public/assets/fonts/Satoshi-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/Satoshi-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/Satoshi-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/Satoshi-Black.woff2",
      weight: "900",
      style: "black",
    },
  ],
  variable: "--font-satoshi",
});

const fontHeading = localFont({
  src: "../public/assets/fonts/CalSans-SemiBold.woff2",
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Aivia",
  description: "Your AI suite",
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
      <body
        className={cn(
          "bg-black text-white",
          fontSatoshi.variable,
          fontHeading.variable
        )}
      >
        {children}
      </body>
    </html>
  );
}
