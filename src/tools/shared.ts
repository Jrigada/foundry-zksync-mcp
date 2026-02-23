import { z } from "zod";
import { join } from "node:path";
import { homedir } from "node:os";

export const profileField = z
  .string()
  .optional()
  .describe(
    "Foundry profile to use (maps to FOUNDRY_PROFILE env var). " +
    "Selects a [profile.<name>] section from foundry.toml, e.g. 'zksync', 'ci', 'production'.",
  );

export const walletFields = {
  privateKey: z
    .string()
    .optional()
    .describe(
      "Raw private key for signing. Only use for local development with " +
      "well-known test keys (e.g. anvil-zksync accounts). For production, " +
      "use 'account' (named keystore) or hardware wallets instead.",
    ),
  account: z
    .string()
    .optional()
    .describe(
      "Named keystore account from ~/.foundry/keystores (recommended for production). " +
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
      "For nodes that manage keys natively.",
    ),
  from: z
    .string()
    .optional()
    .describe(
      "Sender address, used with --unlocked or hardware wallets. " +
      "Maps to --from for cast/deploy, --sender for forge script.",
    ),
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

function ensureFoundryPath(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const foundryBin = join(homedir(), ".foundry", "bin");
  if (env.PATH && !env.PATH.includes(foundryBin)) {
    env.PATH = `${foundryBin}:${env.PATH}`;
  }
  return env;
}

export function buildEnv(profile?: string): NodeJS.ProcessEnv {
  const env = ensureFoundryPath();
  if (profile) {
    env.FOUNDRY_PROFILE = profile;
  }
  return env;
}

interface WalletInput {
  privateKey?: string;
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

  if (input.privateKey) {
    args.push("--private-key", input.privateKey);
  }
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

export function buildWalletArgsForScript(input: WalletInput): string[] {
  const args: string[] = [];

  if (input.privateKey) {
    args.push("--private-key", input.privateKey);
  }
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
  // forge script uses --sender, not --from
  if (input.from) {
    args.push("--sender", input.from);
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
    input.privateKey ||
    input.account ||
    input.keystore ||
    input.unlocked ||
    input.ledger ||
    input.trezor ||
    input.aws ||
    input.gcp
  );
}
