import { z } from "zod";

export const profileField = z
  .string()
  .optional()
  .describe(
    "Foundry profile to use (maps to FOUNDRY_PROFILE env var). " +
    "Selects a [profile.<name>] section from foundry.toml, e.g. 'zksync', 'ci', 'production'.",
  );

export function buildEnv(profile?: string): NodeJS.ProcessEnv {
  if (!profile) return process.env;
  return { ...process.env, FOUNDRY_PROFILE: profile };
}
