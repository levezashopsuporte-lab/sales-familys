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
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY_PUBLICA
```

Estas mesmas variaveis precisam existir na Vercel em:

- `Project Settings > Environment Variables > Production`
- `Project Settings > Environment Variables > Preview`
- `Project Settings > Environment Variables > Development` se quiser consistencia entre ambientes

Variaveis obrigatorias para o app atual:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Importante:

- Use a `anon key` publica do Supabase, nunca a `service_role`
- A URL deve ser HTTPS valida
- Se alguma env estiver ausente ou invalida, o app agora registra erro explicito no console/logs da Vercel

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
