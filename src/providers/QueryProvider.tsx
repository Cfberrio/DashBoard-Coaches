"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Global QueryClientProvider for TanStack Query
 * Wraps the entire application to provide React Query functionality
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create a new QueryClient instance per component instance
  // This ensures each user session has its own cache
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30 * 1000, // 30 seconds
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
