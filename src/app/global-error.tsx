"use client";

import { useEffect } from "react";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorPage({ error, reset }: GlobalErrorPageProps) {
  useEffect(() => {
    console.error("[global-error] Erro fatal capturado na raiz da aplicacao.", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="bg-mesh">
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
          <section className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-float backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark/80">
              Falha critica
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl leading-tight text-ink">
              Ocorreu um erro inesperado na aplicacao.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Tente recarregar a pagina. Se o problema continuar, confira os logs da Vercel
              com os prefixos <code>[global-error]</code>, <code>[app]</code> e <code>[supabase]</code>.
            </p>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={reset}
                className="flex-1 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Recarregar
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
      </body>
    </html>
  );
}
