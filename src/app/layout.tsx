import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { RoleProvider } from "@/contexts/RoleContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oficio Billing - Contract & Billing Management",
  description: "Automatic contract and billing program for Oficio Property Leasing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('theme');
                const dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (dark) document.documentElement.classList.add('dark');
              } catch {}
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <RoleProvider>
            <ThemeProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </ThemeProvider>
          </RoleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
