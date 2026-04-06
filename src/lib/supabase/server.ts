import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/types";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function createSupabaseServerClient() {
  const env = getSupabaseEnv({ context: "supabase-server-client" });

  if (!env) {
    console.error(
      "[supabase] Cliente server nao inicializado. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel.",
    );
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          // Server Components may read cookies during render, but cookie writes
          // must be ignored here because middleware handles session refresh.
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          console.warn(
            "[supabase] Nao foi possivel atualizar cookies no Server Component. O middleware cuidara da renovacao da sessao.",
            error,
          );
        }
      },
    },
  });
}
