import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolResult } from "./compile.js";

const execFileAsync = promisify(execFile);

export const castAbiEncodeSchema = z.object({
  signature: z
    .string()
    .describe(
      'Solidity function or constructor signature, e.g. "constructor(address,uint256)" or "transfer(address,uint256)"',
    ),
  args: z
    .array(z.string())
    .describe(
      'Values to encode, matching the signature types in order, e.g. ["0x1234...", "1000000"]',
    ),
});

export type CastAbiEncodeInput = z.infer<typeof castAbiEncodeSchema>;

export async function castAbiEncode(input: CastAbiEncodeInput): Promise<ToolResult> {
  const args: string[] = ["abi-encode", input.signature, ...input.args];

  try {
    const { stdout, stderr } = await execFileAsync("cast", args, {
      timeout: 10_000,
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
