import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import './globals.css'
import { Toaster } from "react-hot-toast";
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],

});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sync Beats",
  description: "Play Music In Sync with multiple devices at same time",
  icons: {
    icon: '/images/favicon.svg',
  },
};

import { ThemeProvider } from "./context/ThemeContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster
          position="top-center"
          containerStyle={{
            zIndex: 99999,
          }}
          toastOptions={{
            style: {
              background: 'var(--sb-surface-2)',
              color: 'var(--sb-text-main)',
              border: '1px solid var(--sb-border)',
            },
            success: {
              iconTheme: {
                primary: 'var(--sb-success)',
                secondary: 'var(--sb-bg)',
              },
            },
            error: {
              iconTheme: {
                primary: 'var(--sb-error)',
                secondary: 'var(--sb-bg)',
              },
            },
          }}
        />
        <SpeedInsights />
      </body>
    </html>
  );
}
