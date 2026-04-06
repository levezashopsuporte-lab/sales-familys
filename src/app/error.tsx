"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[app-error] Erro capturado pelo boundary global.", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-mesh px-4 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-float backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark/80">
          Erro temporario
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl leading-tight text-ink">
          Nao foi possivel carregar esta pagina.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          O app encontrou um erro inesperado. Pode ser uma falha temporaria de sessao,
          rede ou dados. Tente novamente abaixo.
        </p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="flex-1 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Tentar novamente
          </button>
          <a
            href="/login"
            className="flex-1 rounded-2xl border border-line/90 bg-white px-4 py-3 text-center text-sm font-semibold text-ink transition hover:bg-canvas"
          >
            Ir para login
          </a>
        </div>
      </section>
    </main>
  );
}
