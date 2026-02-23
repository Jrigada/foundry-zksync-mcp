import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolResult } from "./compile.js";
import { buildEnv } from "./shared.js";

const execFileAsync = promisify(execFile);

export const castBalanceSchema = z.object({
  address: z
    .string()
    .describe("Address to query the balance of"),
  rpcUrl: z
    .string()
    .describe("RPC URL of the network"),
  blockTag: z
    .string()
    .optional()
    .describe('Block to query at, e.g. "latest", "pending", or a block number'),
  ether: z
    .boolean()
    .optional()
    .describe("If true, format the output in ether instead of wei"),
});

export type CastBalanceInput = z.infer<typeof castBalanceSchema>;

export async function castBalance(input: CastBalanceInput): Promise<ToolResult> {
  const args: string[] = ["balance", input.address, "--rpc-url", input.rpcUrl];

  if (input.blockTag) {
    args.push("--block", input.blockTag);
  }
  if (input.ether) {
    args.push("--ether");
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
