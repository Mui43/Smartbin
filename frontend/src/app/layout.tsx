import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/auth/AuthProvider";

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
    <html lang="th">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
