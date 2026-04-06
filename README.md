# Mercato Go

App mobile-first de lista de compras com:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Database com RLS
- Deploy pronto para Vercel

## Setup

1. Instale dependencias:

```bash
npm install
```

2. Configure as variaveis em `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

3. Rode a migration em `supabase/migrations/20260406195500_create_shopping_items.sql`.

4. Inicie o projeto:

```bash
npm run dev
```

## Fluxo

- `/login`: tela elegante de autenticacao com email e senha
- `/app`: tela principal unica, compacta e mobile-first
- Itens persistidos por usuario no Supabase
- Total geral fixo no rodape
