import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ThemeProvider from "@/components/ThemeProvider";
import BackgroundGlow from "@/components/BackgroundGlow";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "NELB — No Employee Left Behind",
  description:
    "Intelligent reasoning agent for fair job distribution in community-level gig economies.",
};

// Set the theme class before paint to avoid a flash of the wrong theme.
const noFlashScript = `
(function() {
  try {
    var s = localStorage.getItem('nelb-theme');
    var dark = s ? JSON.parse(s).state.isDark : false;
    if (dark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className={`${workSans.className} text-foreground h-screen overflow-hidden`}>
        <ThemeProvider>
          <BackgroundGlow />
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              <Header />
              <main className="flex-1 min-h-0 relative">{children}</main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
