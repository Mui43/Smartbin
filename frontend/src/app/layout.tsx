import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/auth/AuthProvider";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-prompt",
});

export const metadata: Metadata = {
  title: "Smart Bin Dashboard",
  description: "Solar-Powered Recycling Waste Sorting System",
 icons: {
  icon: [
    { url: '/icon.svg', type: 'image/svg+xml' }
  ]
}
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={prompt.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
