"use client";

import { startTransition, useMemo, useState } from "react";
import {
  LoaderCircle,
  LogOut,
  Minus,
  Plus,
  ReceiptText,
  Search,
  ShoppingBasket,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { ProductAvatar } from "@/components/ui/product-avatar";
import { quickAddProducts } from "@/lib/catalog";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ProductIcon, ShoppingItemRow } from "@/lib/types";
import {
  calculateItemSubtotal,
  calculateListTotal,
  cn,
  formatCurrency,
  getTotalUnits,
} from "@/lib/utils";

type ShoppingAppProps = {
  initialItems: ShoppingItemRow[];
  userEmail: string | null;
  databaseReady: boolean;
  setupHint?: string;
};

type DraftItem = {
  name: string;
  unitPrice: string;
};

const defaultDraft: DraftItem = {
  name: "",
  unitPrice: "",
};

export function ShoppingApp({
  initialItems,
  userEmail,
  databaseReady,
  setupHint,
}: ShoppingAppProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [items, setItems] = useState<ShoppingItemRow[]>(initialItems);
  const [draft, setDraft] = useState<DraftItem>(defaultDraft);
  const [search, setSearch] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const filteredItems = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => item.name.toLowerCase().includes(normalizedQuery));
  }, [items, search]);

  const total = useMemo(() => calculateListTotal(items), [items]);
  const totalUnits = useMemo(() => getTotalUnits(items), [items]);
  const hasItems = items.length > 0;

  function setOptimisticItems(nextItems: ShoppingItemRow[]) {
    setItems([...nextItems].sort((left, right) => right.updated_at.localeCompare(left.updated_at)));
  }

  async function incrementExistingItem(item: ShoppingItemRow) {
    const previousItems = items;
    const optimisticItem = {
      ...item,
      quantity: item.quantity + 1,
      updated_at: new Date().toISOString(),
    };

    setOptimisticItems(items.map((entry) => (entry.id === item.id ? optimisticItem : entry)));

    const { error } =
      (await supabase
        ?.from("shopping_items")
        .update({ quantity: optimisticItem.quantity, updated_at: optimisticItem.updated_at })
        .eq("id", item.id)) ?? { error: new Error("Supabase indisponivel.") };

    if (error) {
      setOptimisticItems(previousItems);
      setFeedback(error.message);
      return false;
    }

    return true;
  }

  async function addOrIncrementItem(params: {
    name: string;
    unitPrice: number;
    category: string;
    icon: ProductIcon;
  }) {
    if (!supabase || !databaseReady) {
      setFeedback(setupHint ?? "Conecte o Supabase para salvar a lista.");
      return;
    }

    setBusyKey(`add-${params.name}`);
    setFeedback("");

    const existing = items.find((item) => item.name.toLowerCase() === params.name.toLowerCase());

    if (existing) {
      await incrementExistingItem(existing);
      setBusyKey(null);
      return;
    }

    const { data, error } = await supabase
      .from("shopping_items")
      .insert({
        name: params.name,
        unit_price: params.unitPrice,
        category: params.category,
        icon: params.icon,
        quantity: 1,
      })
      .select()
      .single();

    if (error?.code === "23505") {
      const { data: duplicate } = await supabase
        .from("shopping_items")
        .select("*")
        .ilike("name", params.name)
        .limit(1)
        .maybeSingle();

      if (duplicate) {
        await incrementExistingItem(duplicate);
        setBusyKey(null);
        return;
      }
    }

    if (error || !data) {
      setFeedback(error?.message ?? "Nao foi possivel adicionar o item.");
      setBusyKey(null);
      return;
    }

    setOptimisticItems([data, ...items]);
    setDraft(defaultDraft);
    setBusyKey(null);
  }

  async function changeQuantity(item: ShoppingItemRow, delta: number) {
    if (!supabase || !databaseReady) {
      setFeedback(setupHint ?? "Conecte o Supabase para editar a lista.");
      return;
    }

    const nextQuantity = item.quantity + delta;
    setBusyKey(item.id);
    setFeedback("");

    if (nextQuantity <= 0) {
      const previousItems = items;
      setOptimisticItems(items.filter((entry) => entry.id !== item.id));

      const { error } = await supabase.from("shopping_items").delete().eq("id", item.id);

      if (error) {
        setOptimisticItems(previousItems);
        setFeedback(error.message);
      }

      setBusyKey(null);
      return;
    }

    const previousItems = items;
    const optimisticItem = {
      ...item,
      quantity: nextQuantity,
      updated_at: new Date().toISOString(),
    };

    setOptimisticItems(items.map((entry) => (entry.id === item.id ? optimisticItem : entry)));

    const { error } = await supabase
      .from("shopping_items")
      .update({ quantity: nextQuantity, updated_at: optimisticItem.updated_at })
      .eq("id", item.id);

    if (error) {
      setOptimisticItems(previousItems);
      setFeedback(error.message);
    }

    setBusyKey(null);
  }

  async function removeItem(item: ShoppingItemRow) {
    if (!supabase || !databaseReady) {
      setFeedback(setupHint ?? "Conecte o Supabase para editar a lista.");
      return;
    }

    setBusyKey(item.id);
    setFeedback("");

    const previousItems = items;
    setOptimisticItems(items.filter((entry) => entry.id !== item.id));

    const { error } = await supabase.from("shopping_items").delete().eq("id", item.id);

    if (error) {
      setOptimisticItems(previousItems);
      setFeedback(error.message);
    }

    setBusyKey(null);
  }

  async function clearList() {
    if (!supabase || !databaseReady || !hasItems) {
      return;
    }

    const previousItems = items;
    setBusyKey("clear");
    setFeedback("");
    setItems([]);

    const { error } = await supabase
      .from("shopping_items")
      .delete()
      .in(
        "id",
        previousItems.map((item) => item.id),
      );

    if (error) {
      setItems(previousItems);
      setFeedback(error.message);
    }

    setBusyKey(null);
  }

  async function handleLogout() {
    if (!supabase) {
      router.replace("/login");
      return;
    }

    setBusyKey("logout");
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function handleCustomAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedPrice = Number(draft.unitPrice.replace(",", "."));

    if (!draft.name.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setFeedback("Informe nome e preco valido para adicionar o item.");
      return;
    }

    await addOrIncrementItem({
      name: draft.name.trim(),
      unitPrice: parsedPrice,
      category: "Personalizado",
      icon: "sparkles",
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-40 pt-4 sm:px-5">
      <header className="mb-3 overflow-hidden rounded-[1.9rem] border border-white/80 bg-white/88 p-4 shadow-card backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-dark">
              <Sparkles className="h-3.5 w-3.5" />
              Compra inteligente
            </div>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-[1.9rem] leading-none text-ink">
              Mercado da semana
            </h1>
            <p className="mt-1 truncate text-sm text-muted">
              {userEmail ?? "Sua lista sincronizada em tempo real"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={busyKey === "logout"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line/90 bg-canvas/80 text-muted transition hover:bg-white disabled:cursor-not-allowed"
            aria-label="Sair"
          >
            {busyKey === "logout" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-canvas/90 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Itens</p>
            <p className="mt-1 text-base font-semibold text-ink">{items.length}</p>
          </div>
          <div className="rounded-2xl bg-canvas/90 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Unidades</p>
            <p className="mt-1 text-base font-semibold text-ink">{totalUnits}</p>
          </div>
          <div className="rounded-2xl bg-brand/10 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-brand-dark/70">Total</p>
            <p className="mt-1 text-base font-semibold text-ink">{formatCurrency(total)}</p>
          </div>
        </div>
      </header>

      <section className="mb-3 rounded-[1.7rem] border border-white/80 bg-white/82 p-3 shadow-card backdrop-blur">
        <form className="space-y-2.5" onSubmit={handleCustomAdd}>
          <div className="flex items-center gap-2 rounded-2xl border border-line/90 bg-canvas/85 px-3 py-3">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar item"
              className="w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted"
            />
          </div>

          <div className="grid grid-cols-[1fr_108px] gap-2">
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Novo item"
              className="rounded-2xl border border-line/90 bg-canvas/85 px-3 py-3 text-sm outline-none placeholder:text-muted focus:border-brand focus:bg-white"
            />
            <input
              value={draft.unitPrice}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  unitPrice: event.target.value.replace(/[^0-9,.]/g, ""),
                }))
              }
              inputMode="decimal"
              placeholder="Preco"
              className="rounded-2xl border border-line/90 bg-canvas/85 px-3 py-3 text-sm outline-none placeholder:text-muted focus:border-brand focus:bg-white"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/92"
          >
            Adicionar rapido
          </button>
        </form>
      </section>

      <section className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Sugestoes</p>
            <p className="text-[11px] text-muted">Toque para somar sem sair da tela</p>
          </div>
          <p className="text-[11px] font-medium text-muted">Acesso rapido</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {quickAddProducts.map((product) => (
            <button
              key={product.name}
              type="button"
              onClick={() =>
                addOrIncrementItem({
                  name: product.name,
                  unitPrice: product.unitPrice,
                  category: product.category,
                  icon: product.icon,
                })
              }
              disabled={busyKey === `add-${product.name}`}
              className="flex items-center gap-3 rounded-[1.35rem] border border-white/80 bg-white/88 px-3 py-2.5 text-left shadow-card backdrop-blur transition hover:-translate-y-0.5 disabled:cursor-not-allowed"
            >
              <ProductAvatar icon={product.icon} className="h-10 w-10 rounded-[1rem]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-ink">{product.name}</p>
                <p className="mt-0.5 text-xs text-muted">{formatCurrency(product.unitPrice)}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {feedback ? (
        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {feedback}
        </div>
      ) : null}

      <section className="flex-1">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Sua lista</p>
            <p className="text-[11px] text-muted">Cards compactos e leitura rapida</p>
          </div>
          <button
            type="button"
            onClick={clearList}
            disabled={busyKey === "clear" || !hasItems}
            className="text-xs font-semibold text-muted disabled:opacity-40"
          >
            Limpar
          </button>
        </div>

        <div className="space-y-2.5">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <article
                key={item.id}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.45rem] border border-white/80 bg-white/90 px-3 py-2.5 shadow-card backdrop-blur"
              >
                <ProductAvatar icon={item.icon} className="h-11 w-11 rounded-[1rem]" />

                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                    <p className="shrink-0 text-sm font-semibold text-ink">
                      {formatCurrency(calculateItemSubtotal(item))}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted">{formatCurrency(item.unit_price)} / unidade</p>
                    <button
                      type="button"
                      onClick={() => removeItem(item)}
                      disabled={busyKey === item.id}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-canvas disabled:opacity-50"
                      aria-label={`Remover ${item.name}`}
                    >
                      {busyKey === item.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1 rounded-full border border-line/90 bg-canvas/90 p-1">
                  <button
                    type="button"
                    onClick={() => changeQuantity(item, -1)}
                    disabled={busyKey === item.id}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-sm disabled:opacity-60"
                    aria-label={`Diminuir ${item.name}`}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-7 text-center text-sm font-semibold text-ink">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeQuantity(item, 1)}
                    disabled={busyKey === item.id}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white shadow-sm disabled:opacity-60"
                    aria-label={`Aumentar ${item.name}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[1.6rem] border border-dashed border-line bg-white/72 px-4 py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand-dark">
                <ShoppingBasket className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-semibold text-ink">Lista vazia</p>
              <p className="mt-2 text-sm text-muted">
                Use as sugestoes acima ou crie um item personalizado.
              </p>
            </div>
          )}
        </div>
      </section>

      <footer className="safe-pb fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-4 pb-4 sm:px-5">
        <div className="rounded-[1.7rem] border border-emerald-200/80 bg-white/96 p-3 shadow-float backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
              <ReceiptText className="h-4.5 w-4.5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Total geral</p>
              <div className="flex items-end justify-between gap-2">
                <p className="truncate text-xl font-semibold leading-none text-ink">
                  {formatCurrency(total)}
                </p>
                <p className="text-right text-[11px] text-muted">
                  {items.length} itens - {totalUnits} un.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => startTransition(() => router.refresh())}
              className={cn(
                "shrink-0 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-brand-dark",
                !hasItems && "cursor-not-allowed bg-brand/60 hover:bg-brand/60",
              )}
              disabled={!hasItems}
            >
              Finalizar
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}
