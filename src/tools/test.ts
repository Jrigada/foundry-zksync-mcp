import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolResult } from "./compile.js";
import { profileField, buildEnv } from "./shared.js";

const execFileAsync = promisify(execFile);

export const testSchema = z.object({
  projectPath: z
    .string()
    .describe("Absolute path to the foundry project directory"),
  profile: profileField,
  filter: z
    .string()
    .optional()
    .describe("Regex passed to --match-test to filter which test functions run"),
  contractFilter: z
    .string()
    .optional()
    .describe("Regex passed to --match-contract to filter which test contracts run"),
  pathFilter: z
    .string()
    .optional()
    .describe("Glob passed to --match-path to filter which test files run, e.g. 'test/unit/*'"),
  verbosity: z
    .number()
    .int()
    .min(0)
    .max(5)
    .optional()
    .describe("Verbosity level (0-5), maps to -v through -vvvvv. Higher = more trace output"),
});

export type TestInput = z.infer<typeof testSchema>;

export async function test(input: TestInput): Promise<ToolResult> {
  const args: string[] = ["test", "--zksync"];

  if (input.filter) {
    args.push("--match-test", input.filter);
  }
  if (input.contractFilter) {
    args.push("--match-contract", input.contractFilter);
  }
  if (input.pathFilter) {
    args.push("--match-path", input.pathFilter);
  }
  if (input.verbosity !== undefined && input.verbosity > 0) {
    args.push(`-${"v".repeat(input.verbosity)}`);
  }

  try {
    const { stdout, stderr } = await execFileAsync("forge", args, {
      cwd: input.projectPath,
      env: buildEnv(input.profile),
      maxBuffer: 10 * 1024 * 1024,
      timeout: 300_000,
    });

    const output = [stdout, stderr].filter(Boolean).join("\n");
    return { success: true, output: output || "All tests passed with no output." };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    const output = [e.stdout, e.stderr].filter(Boolean).join("\n") || e.message;
    return { success: false, output };
  }
}
