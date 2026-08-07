import type { Metadata } from "next";
import { Big_Shoulders, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// "Floodlight" identity fonts — condensed stadium-signage display, a clean
// body/UI grotesk, and tabular mono for scores/live clocks.
const displayFont = Big_Shoulders({
  variable: "--font-display",
  weight: "900",
  subsets: ["latin"],
});

const sansFont = IBM_Plex_Sans({
  variable: "--font-sans",
  weight: ["400", "600"],
  subsets: ["latin"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: "600",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "4EverFootball",
  description:
    "Every kickoff, goal, and final whistle — streamed from the touchline straight to your feed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
