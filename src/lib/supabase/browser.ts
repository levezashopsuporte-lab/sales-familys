"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/types";
import { getSupabaseEnv } from "@/lib/supabase/env";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    console.warn("[supabase] createSupabaseBrowserClient chamado fora do browser.");
    return null;
  }

  const env = getSupabaseEnv({ context: "supabase-browser-client" });

  if (!env) {
    console.error(
      "[supabase] Cliente browser nao inicializado. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel.",
    );
    return null;
  }

  if (!client) {
    client = createBrowserClient<Database>(env.url, env.anonKey);
  }

  return client;
}
