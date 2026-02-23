import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolResult } from "./compile.js";
import { buildEnv } from "./shared.js";

const execFileAsync = promisify(execFile);

export const castCallSchema = z.object({
  to: z
    .string()
    .describe("Address of the contract to call"),
  signature: z
    .string()
    .describe(
      'Function signature with return type, e.g. "balanceOf(address)(uint256)" or "name()(string)"',
    ),
  args: z
    .array(z.string())
    .optional()
    .describe("Function arguments in order, e.g. ['0x1234...']"),
  rpcUrl: z
    .string()
    .describe("RPC URL of the zkSync network to call against"),
  blockTag: z
    .string()
    .optional()
    .describe('Block to query at, e.g. "latest", "pending", or a block number'),
});

export type CastCallInput = z.infer<typeof castCallSchema>;

export async function castCall(input: CastCallInput): Promise<ToolResult> {
  const args: string[] = ["call", input.to, input.signature];

  if (input.args) {
    args.push(...input.args);
  }

  args.push("--rpc-url", input.rpcUrl);

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
