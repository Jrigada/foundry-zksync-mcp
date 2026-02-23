import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolResult } from "./compile.js";
import { walletFields, buildWalletArgs, hasSigningMethod } from "./shared.js";

const execFileAsync = promisify(execFile);

export const castSendSchema = z.object({
  to: z
    .string()
    .describe("Address of the contract to send the transaction to"),
  signature: z
    .string()
    .describe('Function signature, e.g. "transfer(address,uint256)"'),
  args: z
    .array(z.string())
    .optional()
    .describe("Function arguments in order"),
  rpcUrl: z
    .string()
    .describe("RPC URL of the zkSync network"),

  ...walletFields,

  value: z
    .string()
    .optional()
    .describe('ETH value to send with the transaction, e.g. "0.1ether" or amount in wei'),
  gasLimit: z
    .string()
    .optional()
    .describe("Gas limit override"),
});

export type CastSendInput = z.infer<typeof castSendSchema>;

export async function castSend(input: CastSendInput): Promise<ToolResult> {
  if (!hasSigningMethod(input)) {
    return {
      success: false,
      output:
        "No signing method provided. Use one of:\n" +
        "  account   — named keystore from ~/.foundry/keystores (recommended)\n" +
        "  keystore  — path to encrypted keystore JSON file\n" +
        "  unlocked  — for anvil-zksync dev accounts (with 'from' address)\n" +
        "  ledger    — Ledger hardware wallet\n" +
        "  trezor    — Trezor hardware wallet\n" +
        "  aws       — AWS KMS\n" +
        "  gcp       — Google Cloud KMS\n\n" +
        "To create a named keystore: cast wallet import <name> --interactive",
    };
  }

  const args: string[] = ["send", input.to, input.signature];

  if (input.args) {
    args.push(...input.args);
  }

  args.push("--rpc-url", input.rpcUrl);
  args.push(...buildWalletArgs(input));

  if (input.value) {
    args.push("--value", input.value);
  }
  if (input.gasLimit) {
    args.push("--gas-limit", input.gasLimit);
  }

  try {
    const { stdout, stderr } = await execFileAsync("cast", args, {
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
    });

    const output = [stdout, stderr].filter(Boolean).join("\n").trim();
    return { success: true, output };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    const output = [e.stdout, e.stderr].filter(Boolean).join("\n") || e.message;
    return { success: false, output };
  }
}
