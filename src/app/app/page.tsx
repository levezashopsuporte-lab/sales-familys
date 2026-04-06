import { redirect } from "next/navigation";

import { ShoppingApp } from "@/components/shopping/shopping-app";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return (
        <ShoppingApp
          initialItems={[]}
          userEmail={null}
          databaseReady={false}
          setupHint="Supabase nao configurado. Defina as envs publicas na Vercel para carregar a lista."
        />
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("[app] Falha ao validar usuario autenticado.", userError);
      return (
        <ShoppingApp
          initialItems={[]}
          userEmail={null}
          databaseReady={false}
          setupHint="Nao foi possivel validar a sessao agora. Tente recarregar em alguns instantes."
        />
      );
    }

    if (!user) {
      redirect("/login");
    }

    const { data: items, error } = await supabase
      .from("shopping_items")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[app] Falha ao carregar itens iniciais da lista.", error);
    }

    return (
      <ShoppingApp
        initialItems={items ?? []}
        userEmail={user.email ?? null}
        databaseReady={!error}
        setupHint={
          error
            ? "Banco ainda nao preparado ou temporariamente indisponivel. Execute as migrations e confira a conexao do Supabase."
            : undefined
        }
      />
    );
  } catch (error) {
    console.error("[app] Erro inesperado ao renderizar a tela principal.", error);

    return (
      <ShoppingApp
        initialItems={[]}
        userEmail={null}
        databaseReady={false}
        setupHint="Ocorreu um erro ao abrir a lista. Tente recarregar. Se persistir, confira os logs da Vercel e do Supabase."
      />
    );
  }
}
