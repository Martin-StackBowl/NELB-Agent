import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Header from "@/components/Header";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

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
      <body className={`${workSans.className} bg-nelb-light text-nelb-dark min-h-screen`}>
        <Header />
        {children}
      </body>
    </html>
  );
}
