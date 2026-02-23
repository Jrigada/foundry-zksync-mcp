import { z } from "zod";

export const profileField = z
  .string()
  .optional()
  .describe(
    "Foundry profile to use (maps to FOUNDRY_PROFILE env var). " +
    "Selects a [profile.<name>] section from foundry.toml, e.g. 'zksync', 'ci', 'production'.",
  );

export const walletFields = {
  account: z
    .string()
    .optional()
    .describe(
      "Named keystore account from ~/.foundry/keystores (recommended). " +
      "Create one with: cast wallet import <name> --interactive",
    ),
  keystore: z
    .string()
    .optional()
    .describe("Path to an encrypted keystore JSON file"),
  passwordFile: z
    .string()
    .optional()
    .describe("Path to a file containing the keystore password"),
  keystorePassword: z
    .string()
    .optional()
    .describe("Keystore password (prefer passwordFile to keep it out of process args)"),
  unlocked: z
    .boolean()
    .optional()
    .describe(
      "Use eth_sendTransaction with --from address (no local signing). " +
      "For anvil-zksync dev accounts or any node that manages keys.",
    ),
  from: z
    .string()
    .optional()
    .describe("Sender address, used with --unlocked or hardware wallets"),
  ledger: z
    .boolean()
    .optional()
    .describe("Sign with a Ledger hardware wallet"),
  trezor: z
    .boolean()
    .optional()
    .describe("Sign with a Trezor hardware wallet"),
  aws: z
    .boolean()
    .optional()
    .describe("Sign with AWS KMS (requires AWS_KMS_KEY_ID env var)"),
  gcp: z
    .boolean()
    .optional()
    .describe(
      "Sign with Google Cloud KMS (requires GCP_PROJECT_ID, GCP_LOCATION, " +
      "GCP_KEY_RING, GCP_KEY_NAME, GCP_KEY_VERSION env vars)",
    ),
};

export function buildEnv(profile?: string): NodeJS.ProcessEnv {
  if (!profile) return process.env;
  return { ...process.env, FOUNDRY_PROFILE: profile };
}

interface WalletInput {
  account?: string;
  keystore?: string;
  passwordFile?: string;
  keystorePassword?: string;
  unlocked?: boolean;
  from?: string;
  ledger?: boolean;
  trezor?: boolean;
  aws?: boolean;
  gcp?: boolean;
}

export function buildWalletArgs(input: WalletInput): string[] {
  const args: string[] = [];

  if (input.account) {
    args.push("--account", input.account);
  }
  if (input.keystore) {
    args.push("--keystore", input.keystore);
  }
  if (input.passwordFile) {
    args.push("--password-file", input.passwordFile);
  } else if (input.keystorePassword) {
    args.push("--password", input.keystorePassword);
  }
  if (input.unlocked) {
    args.push("--unlocked");
  }
  if (input.from) {
    args.push("--from", input.from);
  }
  if (input.ledger) {
    args.push("--ledger");
  }
  if (input.trezor) {
    args.push("--trezor");
  }
  if (input.aws) {
    args.push("--aws");
  }
  if (input.gcp) {
    args.push("--gcp");
  }

  return args;
}

export function hasSigningMethod(input: WalletInput): boolean {
  return !!(
    input.account ||
    input.keystore ||
    input.unlocked ||
    input.ledger ||
    input.trezor ||
    input.aws ||
    input.gcp
  );
}
