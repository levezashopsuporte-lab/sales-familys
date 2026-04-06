import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/types";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();

  if (!env) {
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

  void supabase.auth.getUser();

  return response;
}

