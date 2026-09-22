import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/auth/AuthProvider";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Smart Bin Dashboard",
  description: "Solar-Powered Recycling Waste Sorting System",
  icons: {
    icon: [
      {
        url: "/icon.svg?v=2",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="dark">
      <head>
        {/* เปลี่ยนจาก <script> เป็น <Script> ตัว S ใหญ่ */}
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('app-theme') || 'dark';
                if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
