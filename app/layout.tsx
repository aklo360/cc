import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://claudecode.wtf"),
  title: "$CC - Claude Code Coin",
  description: "The unofficial community memecoin celebrating Claude Code. 100% of fees to @bcherny.",
  openGraph: {
    title: "$CC - Claude Code Coin",
    description: "The unofficial community memecoin celebrating Claude Code. 100% of fees to @bcherny.",
    url: "https://claudecode.wtf",
    siteName: "$CC - Claude Code Coin",
    images: [
      {
        url: "https://claudecode.wtf/og.jpg",
        width: 1280,
        height: 737,
        alt: "Claude Code Coin",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "$CC - Claude Code Coin",
    description: "The unofficial community memecoin celebrating Claude Code. 100% of fees to @bcherny.",
    images: ["https://claudecode.wtf/og.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${jetbrainsMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
