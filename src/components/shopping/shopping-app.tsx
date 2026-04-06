"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { getCategoryIcon, getProductSubtitle } from "@/lib/products";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ProductIcon, ProductRow, ShoppingItemRow } from "@/lib/types";
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

function normalizeWhatsappNumber(value: string) {
  return value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
}

export function ShoppingApp({
  initialItems,
  userEmail,
  databaseReady,
  setupHint,
}: ShoppingAppProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const priceInputRef = useRef<HTMLInputElement | null>(null);
  const whatsappInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<ShoppingItemRow[]>(initialItems);
  const [draft, setDraft] = useState<DraftItem>(defaultDraft);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<ProductRow[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("+351 ");

  const total = useMemo(() => calculateListTotal(items), [items]);
  const totalUnits = useMemo(() => getTotalUnits(items), [items]);
  const hasItems = items.length > 0;
  const hasSearch = search.trim().length > 0;
  const whatsappMessage = useMemo(() => {
    const lines = [
      "Lista de compras",
      "",
      ...items.map(
        (item) =>
          `- ${item.name}: ${item.quantity} x ${formatCurrency(item.unit_price)} = ${formatCurrency(calculateItemSubtotal(item))}`,
      ),
      "",
      `Total geral: ${formatCurrency(total)}`,
      `Total de unidades: ${totalUnits}`,
    ];

    return lines.join("\n");
  }, [items, total, totalUnits]);

  useEffect(() => {
    if (!supabase || !hasSearch) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }

    const query = search.trim();
    const timeoutId = window.setTimeout(async () => {
      setSearchLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .ilike("name", `%${query}%`)
        .order("name")
        .limit(6);

      if (error) {
        setSuggestions([]);
        setSearchLoading(false);
        return;
      }

      setSuggestions(data ?? []);
      setSearchLoading(false);
    }, 260);

    return () => window.clearTimeout(timeoutId);
  }, [hasSearch, search, supabase]);

  useEffect(() => {
    if (!isWhatsappOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      whatsappInputRef.current?.focus();
      whatsappInputRef.current?.setSelectionRange(
        whatsappInputRef.current.value.length,
        whatsappInputRef.current.value.length,
      );
    }, 40);

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsWhatsappOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isWhatsappOpen]);

  function setOptimisticItems(nextItems: ShoppingItemRow[]) {
    setItems([...nextItems].sort((left, right) => right.updated_at.localeCompare(left.updated_at)));
  }

  function syncDraftName(name: string) {
    setDraft((current) => ({ ...current, name }));

    if (selectedProduct && selectedProduct.name !== name) {
      setSelectedProduct(null);
    }
  }

  function handleSuggestionSelect(product: ProductRow) {
    setSelectedProduct(product);
    setDraft((current) => ({ ...current, name: product.name }));
    setSearch("");
    setSuggestions([]);
    requestAnimationFrame(() => {
      priceInputRef.current?.focus();
    });
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
    category: string | null;
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
    setSelectedProduct(null);
    setSearch("");
    setSuggestions([]);
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
      category: selectedProduct?.category ?? null,
      icon: getCategoryIcon(selectedProduct?.category),
    });
  }

  function handleOpenWhatsapp() {
    if (!hasItems) {
      return;
    }

    setFeedback("");
    setIsWhatsappOpen(true);
  }

  function handleSendToWhatsapp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedValue = normalizeWhatsappNumber(whatsappNumber.trim());
    const digits = normalizedValue.replace(/\D/g, "");

    if (!digits || digits.length < 8 || !normalizedValue.startsWith("+")) {
      setFeedback("Informe um numero de WhatsApp com prefixo do pais. Ex.: +351912345678");
      return;
    }

    const whatsappUrl = `https://wa.me/${digits}?text=${encodeURIComponent(whatsappMessage)}`;
    setIsWhatsappOpen(false);
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
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
              {userEmail ?? "A sua lista sincronizada em tempo real"}
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
          <div className="relative">
            <div className="flex items-center gap-2 rounded-2xl border border-line/90 bg-canvas/85 px-3 py-3">
              <Search className="h-4 w-4 text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar item"
                className="w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted"
              />
              {searchLoading ? <LoaderCircle className="h-4 w-4 animate-spin text-muted" /> : null}
            </div>

            {hasSearch ? (
              <div className="absolute inset-x-0 top-[calc(100%+0.45rem)] z-10 overflow-hidden rounded-[1.35rem] border border-white/70 bg-[rgba(156,163,175,0.8)] shadow-[0_22px_50px_-22px_rgba(15,23,42,0.45)] backdrop-blur-md">
                {suggestions.length > 0 ? (
                  <div className="max-h-72 overflow-y-auto p-1.5">
                    {suggestions.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSuggestionSelect(product)}
                        className="flex w-full items-center gap-3 rounded-[1rem] bg-white/88 px-2.5 py-2.5 text-left transition hover:bg-white"
                      >
                        <ProductAvatar
                          icon={getCategoryIcon(product.category)}
                          className="h-9 w-9 rounded-[0.9rem]"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
                          <p className="truncate text-[11px] text-muted">
                            {getProductSubtitle(product)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-3 text-sm text-slate-700">Sem produtos encontrados.</div>
                )}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-[1fr_108px] gap-2">
            <input
              value={draft.name}
              onChange={(event) => syncDraftName(event.target.value)}
              placeholder="Novo item"
              className="rounded-2xl border border-line/90 bg-canvas/85 px-3 py-3 text-sm outline-none placeholder:text-muted focus:border-brand focus:bg-white"
            />
            <input
              ref={priceInputRef}
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
            className="w-full rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Adicionar rapido
          </button>
        </form>
      </section>

      {feedback ? (
        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {feedback}
        </div>
      ) : null}

      <section className="flex-1">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Lista atual</p>
            <p className="text-[11px] text-muted">Somente os itens adicionados nesta compra</p>
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
          {items.length > 0 ? (
            items.map((item) => (
              <article
                key={item.id}
                className="grid grid-cols-[auto_1fr] gap-3 rounded-[1.45rem] border border-white/80 bg-white/90 px-3 py-2.5 shadow-card backdrop-blur"
              >
                <ProductAvatar icon={item.icon} className="h-11 w-11 rounded-[1rem]" />

                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatCurrency(item.unit_price)} / unidade
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-ink">
                      {formatCurrency(calculateItemSubtotal(item))}
                    </p>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
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

                    <button
                      type="button"
                      onClick={() => removeItem(item)}
                      disabled={busyKey === item.id}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-canvas disabled:opacity-50"
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
              </article>
            ))
          ) : (
            <div className="rounded-[1.6rem] border border-dashed border-line bg-white/72 px-4 py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand-dark">
                <ShoppingBasket className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-semibold text-ink">Nenhum item adicionado</p>
              <p className="mt-2 text-sm text-muted">
                Pesquise um produto, preencha o preco e adicione rapidamente.
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
              onClick={handleOpenWhatsapp}
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

      {isWhatsappOpen ? (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-950/28 p-4 backdrop-blur-[2px] sm:items-center sm:px-5">
          <div className="w-full max-w-md rounded-[1.8rem] border border-white/80 bg-white/96 p-4 shadow-[0_30px_80px_-26px_rgba(15,23,42,0.35)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">Enviar para WhatsApp</p>
                <p className="mt-1 text-xs text-muted">
                  Informe o numero com prefixo do pais para abrir a mensagem pronta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWhatsappOpen(false)}
                className="rounded-full px-2 py-1 text-xs font-semibold text-muted transition hover:bg-canvas"
              >
                Fechar
              </button>
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleSendToWhatsapp}>
              <div className="space-y-1.5">
                <label htmlFor="whatsapp-number" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Numero de WhatsApp
                </label>
                <input
                  id="whatsapp-number"
                  ref={whatsappInputRef}
                  value={whatsappNumber}
                  onChange={(event) => setWhatsappNumber(normalizeWhatsappNumber(event.target.value))}
                  inputMode="tel"
                  placeholder="+351 912345678"
                  className="w-full rounded-2xl border border-line/90 bg-canvas/85 px-3 py-3 text-sm outline-none placeholder:text-muted focus:border-brand focus:bg-white"
                />
              </div>

              <div className="rounded-2xl border border-line/80 bg-canvas/70 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Resumo enviado
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">{items.length} itens</p>
                <p className="mt-1 text-sm text-muted">{totalUnits} unidades</p>
                <p className="mt-2 text-base font-semibold text-ink">{formatCurrency(total)}</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsWhatsappOpen(false)}
                  className="flex-1 rounded-2xl border border-line/90 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-canvas"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  Abrir WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
