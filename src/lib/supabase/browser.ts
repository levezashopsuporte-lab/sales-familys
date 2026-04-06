"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/types";
import { getSupabaseEnv } from "@/lib/supabase/env";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createSupabaseBrowserClient() {
  const env = getSupabaseEnv();

  if (!env) {
    return null;
  }

  if (!client) {
    client = createBrowserClient<Database>(env.url, env.anonKey);
  }

  return client;
}

