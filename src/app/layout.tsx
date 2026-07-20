import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VK Studio — Calculadora de Cotizaciones",
  description: "Sistema interno de cotizaciones para VK Studio. Calcula precios de uñas, diseños y servicios.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
