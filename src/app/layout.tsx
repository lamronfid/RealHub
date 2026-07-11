import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RealHub — Portal de Agentes",
  description: "Plataforma de colaboración para agentes inmobiliarios. Publica propiedades, gestiona prospectos y conecta con colegas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable}`} data-scroll-behavior="smooth">
      <body className="font-sans antialiased bg-slate-50/50">
        {children}
      </body>
    </html>
  );
}
