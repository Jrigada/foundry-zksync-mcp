import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolResult } from "./compile.js";

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

  privateKey: z
    .string()
    .optional()
    .describe("Private key for signing. Visible in process args — prefer keystore for production."),
  keystore: z
    .string()
    .optional()
    .describe("Path to an encrypted keystore file (safer alternative to raw private key)"),
  keystorePassword: z
    .string()
    .optional()
    .describe("Password to decrypt the keystore file"),

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
  if (!input.privateKey && !input.keystore) {
    return {
      success: false,
      output: "Either privateKey or keystore must be provided for signing the transaction.",
    };
  }

  const args: string[] = ["send", input.to, input.signature];

  if (input.args) {
    args.push(...input.args);
  }

  args.push("--rpc-url", input.rpcUrl);

  if (input.privateKey) {
    args.push("--private-key", input.privateKey);
  }
  if (input.keystore) {
    args.push("--keystore", input.keystore);
    if (input.keystorePassword) {
      args.push("--password", input.keystorePassword);
    }
  }

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
