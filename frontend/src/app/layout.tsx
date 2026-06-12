import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "NELB — No Employee Left Behind",
  description:
    "Intelligent reasoning agent for fair job distribution in community-level gig economies.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-nelb-light text-nelb-dark min-h-screen">
        <Header />
        {children}
      </body>
    </html>
  );
}
