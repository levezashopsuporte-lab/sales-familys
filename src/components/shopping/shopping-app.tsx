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

  function setOptimisticItems(nextItems: ShoppingItemRow[]) {
    setItems([...nextItems].sort((left, right) => right.updated_at.localeCompare(left.updated_at)));
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
      const previousItems = items;
      const optimisticItem = {
        ...existing,
        quantity: existing.quantity + 1,
        updated_at: new Date().toISOString(),
      };

      setOptimisticItems(items.map((item) => (item.id === existing.id ? optimisticItem : item)));

      const { error } = await supabase
        .from("shopping_items")
        .update({ quantity: optimisticItem.quantity, updated_at: optimisticItem.updated_at })
        .eq("id", existing.id);

      if (error) {
        setOptimisticItems(previousItems);
        setFeedback(error.message);
      }

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
    if (!supabase || !databaseReady || items.length === 0) {
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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-32 pt-4 sm:px-5">
      <header className="mb-4 rounded-[1.75rem] border border-white/80 bg-white/85 p-4 shadow-card backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-dark">
              <Sparkles className="h-3.5 w-3.5" />
              Lista premium
            </div>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-[2rem] leading-none text-ink">
              Mercado da semana
            </h1>
            <p className="mt-2 truncate text-sm text-muted">
              {userEmail ?? "Sua lista sincronizada em tempo real"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={busyKey === "logout"}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-canvas text-muted transition hover:bg-white disabled:cursor-not-allowed"
            aria-label="Sair"
          >
            {busyKey === "logout" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl bg-canvas px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Itens</p>
            <p className="mt-1 text-lg font-semibold text-ink">{items.length}</p>
          </div>
          <div className="rounded-2xl bg-canvas px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Unidades</p>
            <p className="mt-1 text-lg font-semibold text-ink">{totalUnits}</p>
          </div>
          <div className="rounded-2xl bg-canvas px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Total</p>
            <p className="mt-1 text-lg font-semibold text-ink">{formatCurrency(total)}</p>
          </div>
        </div>
      </header>

      <section className="mb-3 rounded-[1.6rem] border border-white/70 bg-white/80 p-3 shadow-card backdrop-blur">
        <form className="space-y-3" onSubmit={handleCustomAdd}>
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-canvas px-3 py-3">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar item"
              className="w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted"
            />
          </div>

          <div className="grid grid-cols-[1fr_106px] gap-2">
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Novo item"
              className="rounded-2xl border border-line bg-canvas px-3 py-3 text-sm outline-none placeholder:text-muted focus:border-brand focus:bg-white"
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
              className="rounded-2xl border border-line bg-canvas px-3 py-3 text-sm outline-none placeholder:text-muted focus:border-brand focus:bg-white"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
          >
            Adicionar rapido
          </button>
        </form>
      </section>

      <section className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">Sugestoes</p>
          <p className="text-xs text-muted">Toque para somar</p>
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
              className="flex items-center gap-3 rounded-[1.3rem] border border-white/75 bg-white/85 px-3 py-3 text-left shadow-card backdrop-blur transition hover:-translate-y-0.5 disabled:cursor-not-allowed"
            >
              <ProductAvatar icon={product.icon} className="h-10 w-10 rounded-xl" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
                <p className="text-xs text-muted">{formatCurrency(product.unitPrice)}</p>
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
          <p className="text-sm font-semibold text-ink">Sua lista</p>
          <button
            type="button"
            onClick={clearList}
            disabled={busyKey === "clear" || items.length === 0}
            className="text-xs font-semibold text-muted disabled:opacity-40"
          >
            Limpar
          </button>
        </div>

        <div className="space-y-2">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <article
                key={item.id}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.4rem] border border-white/80 bg-white/88 px-3 py-3 shadow-card backdrop-blur"
              >
                <ProductAvatar icon={item.icon} />

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                  <p className="mt-1 text-xs text-muted">{formatCurrency(item.unit_price)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-ink">
                      {formatCurrency(calculateItemSubtotal(item))}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-line bg-canvas p-1">
                      <button
                        type="button"
                        onClick={() => changeQuantity(item, -1)}
                        disabled={busyKey === item.id}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink shadow-sm disabled:opacity-60"
                        aria-label={`Diminuir ${item.name}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-6 text-center text-xs font-semibold text-ink">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item, 1)}
                        disabled={busyKey === item.id}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white shadow-sm disabled:opacity-60"
                        aria-label={`Aumentar ${item.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

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
              </article>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-line bg-white/70 px-4 py-8 text-center">
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
        <div className="rounded-[1.8rem] border border-emerald-200/80 bg-white/94 p-4 shadow-float backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Total geral</p>
                <p className="text-2xl font-semibold text-ink">{formatCurrency(total)}</p>
              </div>
            </div>
            <div className="text-right text-xs text-muted">
              <p>{items.length} itens</p>
              <p>{totalUnits} unidades</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => startTransition(() => router.refresh())}
            className={cn(
              "w-full rounded-2xl bg-brand px-4 py-3.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-dark",
              items.length === 0 && "cursor-not-allowed bg-brand/60 hover:bg-brand/60",
            )}
            disabled={items.length === 0}
          >
            Finalizar lista
          </button>
        </div>
      </footer>
    </main>
  );
}
