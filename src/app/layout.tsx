import type { Metadata, Viewport } from "next";
import { Fredoka, Permanent_Marker, Poppins } from "next/font/google";
import { CartUiProvider } from "@/components/CartUiContext";
import { Navbar } from "@/components/Navbar";
import { HiddenAdminAccess } from "@/components/HiddenAdminAccess";
import { STORE_CONFIG } from "@/config/store";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-marker",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${STORE_CONFIG.brandName} ${STORE_CONFIG.brandSub} | Open Pre Order Friesmoy & Macmoy`,
  description: STORE_CONFIG.brandDescription,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ea6c04",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${poppins.variable} ${fredoka.variable} ${permanentMarker.variable}`}
    >
      <body className="min-h-screen bg-brand-paper text-brand-dark selection:bg-brand-orange selection:text-white flex flex-col">
        <CartUiProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-20">
            {children}
          </main>
          <footer className="w-full border-t border-brand-border bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-xs text-brand-muted flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <HiddenAdminAccess />
                <span>Open Pre Order Friesmoy &amp; Macmoy</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-semibold">
                <span>WhatsApp: {STORE_CONFIG.adminWhatsAppDisplay}</span>
                <a
                  href={STORE_CONFIG.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-orange hover:underline"
                >
                  Instagram: {STORE_CONFIG.instagramHandle}
                </a>
              </div>
            </div>
          </footer>
        </CartUiProvider>
      </body>
    </html>
  );
}
