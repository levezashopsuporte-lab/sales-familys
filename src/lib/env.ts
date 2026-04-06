export type EnvRequirement = {
  key: string;
  description?: string;
  validate?: (value: string) => boolean;
};

type EnvValidationOptions = {
  context: string;
  allowMissing?: boolean;
};

type EnvValidationResult = {
  values: Record<string, string>;
  missing: string[];
  invalid: string[];
};

const reportedContexts = new Set<string>();

function formatEnvMessage(result: EnvValidationResult, context: string) {
  const missingList = result.missing.length > 0 ? result.missing.join(", ") : "nenhuma";
  const invalidList = result.invalid.length > 0 ? result.invalid.join(", ") : "nenhuma";

  return `[env] Configuracao invalida em ${context}. Ausentes: ${missingList}. Invalidas: ${invalidList}.`;
}

export function validateRequiredEnv(
  requirements: EnvRequirement[],
  options: EnvValidationOptions,
) {
  const values: Record<string, string> = {};
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const requirement of requirements) {
    const rawValue = process.env[requirement.key];
    const value = typeof rawValue === "string" ? rawValue.trim() : "";

    if (!value) {
      missing.push(requirement.key);
      continue;
    }

    if (requirement.validate && !requirement.validate(value)) {
      invalid.push(requirement.key);
      continue;
    }

    values[requirement.key] = value;
  }

  const result: EnvValidationResult = {
    values,
    missing,
    invalid,
  };

  if (missing.length === 0 && invalid.length === 0) {
    return result;
  }

  const message = formatEnvMessage(result, options.context);

  if (!reportedContexts.has(options.context)) {
    console.error(message, {
      context: options.context,
      missing,
      invalid,
      required: requirements.map(({ key, description }) => ({ key, description })),
    });
    reportedContexts.add(options.context);
  }

  if (options.allowMissing) {
    return result;
  }

  throw new Error(message);
}
