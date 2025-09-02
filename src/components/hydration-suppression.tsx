"use client";

import { useEffect, useState } from "react";

interface HydrationSuppressionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Componente que suprime errores de hidratación
 * Útil para contenido que cambia entre servidor y cliente
 */
export function HydrationSuppression({
  children,
  fallback = null,
}: HydrationSuppressionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // En el servidor o durante la hidratación, mostrar fallback
  if (!mounted) {
    return <>{fallback}</>;
  }

  // Una vez montado en el cliente, mostrar el contenido real
  return <>{children}</>;
}

/**
 * Hook para detectar si el componente está montado en el cliente
 */
export function useIsMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}

/**
 * Componente que solo renderiza en el cliente
 * Útil para componentes que dependen de APIs del navegador
 */
export function ClientOnly({
  children,
  fallback = null,
}: HydrationSuppressionProps) {
  const isMounted = useIsMounted();

  if (!isMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
