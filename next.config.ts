import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@tanstack/react-query"],
  },
  // Configuración para mejorar la hidratación
  reactStrictMode: true,
  // Configuración para evitar problemas de hidratación
  compiler: {
    // Remover console.log en producción
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Configuración para manejar extensiones del navegador
  onDemandEntries: {
    // Período en ms donde las páginas se mantienen en memoria
    maxInactiveAge: 25 * 1000,
    // Número de páginas que se deben mantener simultáneamente
    pagesBufferLength: 2,
  },
  // Configuración de headers para mejorar la seguridad
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
