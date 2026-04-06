import { validateRequiredEnv, type EnvRequirement } from "@/lib/env";

type SupabaseEnv = {
  url: string;
  anonKey: string;
};

const SUPABASE_ENV_KEYS: EnvRequirement[] = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    description: "URL publica do projeto Supabase usada no browser, middleware e server components.",
    validate: (value: string) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    description: "Chave anon publica do projeto Supabase usada para auth e queries client/server.",
    validate: (value: string) => value.length > 20,
  },
];

let cachedEnv: SupabaseEnv | null | undefined;

function mapSupabaseEnv(values: Record<string, string>): SupabaseEnv {
  return {
    url: values.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: values.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getSupabaseEnv(options?: { required?: boolean; context?: string }) {
  const required = options?.required ?? false;
  const context = options?.context ?? "supabase";

  if (cachedEnv !== undefined) {
    if (required && !cachedEnv) {
      throw new Error(
        `[supabase] Configuracao obrigatoria ausente em ${context}. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel.`,
      );
    }

    return cachedEnv;
  }

  const result = validateRequiredEnv(SUPABASE_ENV_KEYS, {
    context,
    allowMissing: !required,
  });

  if (result.missing.length > 0 || result.invalid.length > 0) {
    cachedEnv = null;

    if (required) {
      throw new Error(
        `[supabase] Configuracao obrigatoria ausente ou invalida em ${context}. Verifique as envs publicas do Supabase na Vercel.`,
      );
    }

    return cachedEnv;
  }

  cachedEnv = mapSupabaseEnv(result.values);
  return cachedEnv;
}

export function assertSupabaseEnv(context = "supabase") {
  const env = getSupabaseEnv({ required: true, context });

  if (!env) {
    throw new Error(`[supabase] Configuracao obrigatoria ausente em ${context}.`);
  }

  return env;
}

export function isSupabaseConfigured() {
  return getSupabaseEnv({ context: "supabase-config-check" }) !== null;
}

export function getRequiredSupabaseEnvKeys() {
  return SUPABASE_ENV_KEYS.map(({ key, description }) => ({ key, description }));
}
