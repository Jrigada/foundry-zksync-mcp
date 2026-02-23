import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolResult } from "./compile.js";
import { buildEnv } from "./shared.js";

const execFileAsync = promisify(execFile);

export const castAbiDecodeSchema = z.object({
  signature: z
    .string()
    .describe(
      'Solidity function signature whose output types to decode against, e.g. "balanceOf(address)(uint256)" or "transfer(address,uint256)"',
    ),
  data: z
    .string()
    .describe("Hex-encoded ABI data to decode (0x-prefixed)"),
  input: z
    .boolean()
    .optional()
    .describe(
      "If true, decode as input data (function args). If false/omitted, decode as output data (return values).",
    ),
});

export type CastAbiDecodeInput = z.infer<typeof castAbiDecodeSchema>;

export async function castAbiDecode(input: CastAbiDecodeInput): Promise<ToolResult> {
  const args: string[] = ["abi-decode"];

  if (input.input) {
    args.push("--input");
  }

  args.push(input.signature, input.data);

  try {
    const { stdout, stderr } = await execFileAsync("cast", args, {
      env: buildEnv(),
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
