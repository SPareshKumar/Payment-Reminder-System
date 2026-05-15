import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/ui/Navbar"; // <-- Import the Navbar

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Payment Reminder System",
  description: "Take-home assignment for Binary Automates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background min-h-screen flex flex-col`}>
        {/* The Navbar will now persist across all page transitions */}
        <Navbar /> 
        
        {/* The specific page content loads here */}
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}