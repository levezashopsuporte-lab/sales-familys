import { redirect } from "next/navigation";

import { LoginScreen } from "@/components/auth/login-screen";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return <LoginScreen configured={false} />;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("[login] Falha ao validar sessao antes de renderizar login.", error);
      return <LoginScreen configured />;
    }

    if (user) {
      redirect("/app");
    }

    return <LoginScreen configured />;
  } catch (error) {
    console.error("[login] Erro inesperado ao renderizar pagina de login.", error);
    return <LoginScreen configured={false} />;
  }
}
