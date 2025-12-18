import type { Metadata } from "next";
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
        {children}
      </body>
    </html>
  );
}
