"use client";

import { useMemo, useState } from "react";
import { LoaderCircle, LockKeyhole, Mail, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type LoginScreenProps = {
  configured: boolean;
};

type AuthMode = "signin" | "signup";

export function LoginScreen({ configured }: LoginScreenProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!configured || !supabase) {
      setError("Configure as variaveis do Supabase para ativar o login.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    const response =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          })
        : await supabase.auth.signUp({
            email: normalizedEmail,
            password,
          });

    if (response.error) {
      setLoading(false);
      setError(response.error.message);
      return;
    }

    if (mode === "signup" && !response.data.session) {
      setLoading(false);
      setMessage("Conta criada. Confira seu email para confirmar o acesso.");
      return;
    }

    router.replace("/app");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-mesh px-4 py-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-float backdrop-blur xl:grid xl:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden bg-[#163524] p-10 text-white xl:flex xl:flex-col xl:justify-between">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/88">
            <ShoppingCart className="h-4 w-4" />
            Mercato Go
          </div>

          <div className="space-y-5">
            <p className="font-[family-name:var(--font-heading)] text-5xl leading-[0.95]">
              Compras mais rapidas, bonitas e organizadas.
            </p>
            <p className="max-w-md text-base text-white/72">
              Entre para salvar sua lista na nuvem, ajustar quantidades em segundos e acompanhar o total sem sair da tela.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5">
            <div className="mb-4 flex items-center justify-between text-sm text-white/70">
              <span>Resumo ao vivo</span>
              <span>Mobile first</span>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl bg-white/95 p-4 text-ink shadow-card">
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>Itens no carrinho</span>
                  <span>8</span>
                </div>
                <p className="mt-2 text-2xl font-semibold">R$ 126,40</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl bg-white/10 p-3 text-center">Cards compactos</div>
                <div className="rounded-2xl bg-white/10 p-3 text-center">Total fixo</div>
                <div className="rounded-2xl bg-white/10 p-3 text-center">Fluxo leve</div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-6 sm:px-7 sm:py-8">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 flex items-center gap-3 xl:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-card">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <p className="font-[family-name:var(--font-heading)] text-2xl">Mercato Go</p>
                <p className="text-sm text-muted">Lista de compras com visual premium</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.22em] text-brand-dark/80">Acesso</p>
              <h1 className="mt-2 font-[family-name:var(--font-heading)] text-4xl leading-tight text-ink">
                {mode === "signin" ? "Volte para sua lista" : "Crie sua conta em segundos"}
              </h1>
              <p className="mt-3 text-sm text-muted">
                Um login simples antes de entrar na tela principal do app.
              </p>
            </div>

            <div className="mb-5 inline-flex rounded-2xl border border-line bg-canvas p-1">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={cn(
                  "rounded-[1rem] px-4 py-2 text-sm font-semibold transition",
                  mode === "signin" ? "bg-white text-ink shadow-sm" : "text-muted",
                )}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={cn(
                  "rounded-[1rem] px-4 py-2 text-sm font-semibold transition",
                  mode === "signup" ? "bg-white text-ink shadow-sm" : "text-muted",
                )}
              >
                Criar conta
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Email</span>
                <div className="flex items-center gap-3 rounded-2xl border border-line bg-canvas px-4 py-3 focus-within:border-brand focus-within:bg-white">
                  <Mail className="h-4 w-4 text-muted" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@exemplo.com"
                    className="w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Senha</span>
                <div className="flex items-center gap-3 rounded-2xl border border-line bg-canvas px-4 py-3 focus-within:border-brand focus-within:bg-white">
                  <LockKeyhole className="h-4 w-4 text-muted" />
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimo de 6 caracteres"
                    className="w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted"
                  />
                </div>
              </label>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </div>
              ) : null}

              {!configured ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Defina <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> para ativar o fluxo real.
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading || !configured}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-brand/60"
              >
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {mode === "signin" ? "Entrar" : "Criar conta"}
              </button>
            </form>

            <p className="mt-5 text-xs leading-6 text-muted">
              Projeto preparado para Next.js, TypeScript, Tailwind, Supabase Auth e deploy na Vercel.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
