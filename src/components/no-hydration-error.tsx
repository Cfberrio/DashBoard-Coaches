"use client";

import { useEffect } from "react";

/**
 * Componente simple que suprime errores de hidratación
 * Se ejecuta solo en el cliente y suprime los errores de la consola
 */
export function NoHydrationError() {
  useEffect(() => {
    // Suprimir errores de hidratación en la consola
    const originalError = console.error;
    console.error = (...args) => {
      const message = args[0];
      if (typeof message === "string" && message.includes("hydrated")) {
        return; // No mostrar errores de hidratación
      }
      originalError.apply(console, args);
    };

    // Limpiar al desmontar
    return () => {
      console.error = originalError;
    };
  }, []);

  return null; // No renderiza nada
}
