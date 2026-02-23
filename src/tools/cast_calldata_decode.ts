import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolResult } from "./compile.js";

const execFileAsync = promisify(execFile);

export const castCalldataDecodeSchema = z.object({
  signature: z
    .string()
    .describe('Function signature, e.g. "transfer(address,uint256)"'),
  calldata: z
    .string()
    .describe("Raw transaction calldata (0x-prefixed, includes the 4-byte selector)"),
});

export type CastCalldataDecodeInput = z.infer<typeof castCalldataDecodeSchema>;

export async function castCalldataDecode(
  input: CastCalldataDecodeInput,
): Promise<ToolResult> {
  const args: string[] = ["calldata-decode", input.signature, input.calldata];

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
