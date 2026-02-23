import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolResult } from "./compile.js";
import { profileField, buildEnv } from "./shared.js";

const execFileAsync = promisify(execFile);

export const snapshotSchema = z.object({
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
  diff: z
    .boolean()
    .optional()
    .describe("If true, compare against the existing .gas-snapshot file and show differences"),
  check: z
    .boolean()
    .optional()
    .describe("If true, compare against existing snapshot and fail if any gas values changed"),
});

export type SnapshotInput = z.infer<typeof snapshotSchema>;

export async function snapshot(input: SnapshotInput): Promise<ToolResult> {
  const args: string[] = ["snapshot", "--zksync"];

  if (input.filter) {
    args.push("--match-test", input.filter);
  }
  if (input.contractFilter) {
    args.push("--match-contract", input.contractFilter);
  }
  if (input.diff) {
    args.push("--diff");
  }
  if (input.check) {
    args.push("--check");
  }

  try {
    const { stdout, stderr } = await execFileAsync("forge", args, {
      cwd: input.projectPath,
      env: buildEnv(input.profile),
      maxBuffer: 10 * 1024 * 1024,
      timeout: 300_000,
    });

    const output = [stdout, stderr].filter(Boolean).join("\n");
    return { success: true, output: output || "Snapshot completed." };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    const output = [e.stdout, e.stderr].filter(Boolean).join("\n") || e.message;
    return { success: false, output };
  }
}
