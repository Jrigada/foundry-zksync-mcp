import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolResult } from "./compile.js";
import { buildEnv } from "./shared.js";

const execFileAsync = promisify(execFile);

export const castNonceSchema = z.object({
  address: z
    .string()
    .describe("Address to query the nonce of"),
  rpcUrl: z
    .string()
    .describe("RPC URL of the network"),
  blockTag: z
    .string()
    .optional()
    .describe('Block to query at, e.g. "latest", "pending", or a block number'),
});

export type CastNonceInput = z.infer<typeof castNonceSchema>;

export async function castNonce(input: CastNonceInput): Promise<ToolResult> {
  const args: string[] = ["nonce", input.address, "--rpc-url", input.rpcUrl];

  if (input.blockTag) {
    args.push("--block", input.blockTag);
  }

  try {
    const { stdout, stderr } = await execFileAsync("cast", args, {
      env: buildEnv(),
      timeout: 30_000,
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
