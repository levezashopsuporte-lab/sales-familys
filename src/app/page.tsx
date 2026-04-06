import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      redirect("/login");
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("[home] Falha ao validar usuario no carregamento inicial.", error);
      redirect("/login");
    }

    redirect(user ? "/app" : "/login");
  } catch (error) {
    console.error("[home] Erro inesperado ao resolver a rota inicial.", error);
    redirect("/login");
  }
}
