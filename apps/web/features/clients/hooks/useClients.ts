"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import type { Client } from "../types";

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: () => apiClient.get<Client[]>("/clients"),
  });
}
