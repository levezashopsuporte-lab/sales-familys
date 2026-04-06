export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mesh px-4 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-float backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark/80">
          A carregar
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl leading-tight text-ink">
          A preparar a sua lista.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Estamos a validar a sessao e a buscar os dados iniciais com seguranca.
        </p>
      </section>
    </main>
  );
}
