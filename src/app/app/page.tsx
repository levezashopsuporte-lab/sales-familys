import { redirect } from "next/navigation";

import { ShoppingApp } from "@/components/shopping/shopping-app";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { data: items, error } = await supabase
    .from("shopping_items")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <ShoppingApp
      initialItems={items ?? []}
      userEmail={session.user.email ?? null}
      databaseReady={!error}
      setupHint={
        error
          ? "Banco ainda nao preparado. Execute a migration do Supabase para liberar a lista."
          : undefined
      }
    />
  );
}
