import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { RoleProvider } from "@/contexts/RoleContext";
import { ToastProvider } from "@/contexts/ToastContext";
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
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <RoleProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </RoleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
