import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@tanstack/react-query"],
  },
  // Configuración para mejorar la hidratación
  reactStrictMode: true,
  swcMinify: true,
  // Configuración para evitar problemas de hidratación
  compiler: {
    // Remover console.log en producción
    removeConsole: process.env.NODE_ENV === "production",
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
