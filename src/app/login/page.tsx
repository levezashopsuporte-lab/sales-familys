import { redirect } from "next/navigation";

import { LoginScreen } from "@/components/auth/login-screen";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return <LoginScreen configured={false} />;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/app");
  }

  return <LoginScreen configured />;
}
