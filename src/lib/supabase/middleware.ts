import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/types";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv({ context: "supabase-middleware" });

  if (!env) {
    console.error(
      "[supabase] Middleware sem configuracao do Supabase. Rotas seguirao sem refresh de sessao.",
    );
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Await the auth refresh so Safari and other stricter browsers do not race
  // against stale cookies during the first server render.
  try {
    await supabase.auth.getUser();
  } catch (error) {
    console.error("[supabase] Falha ao atualizar a sessao no middleware.", error);
  }

  return response;
}
