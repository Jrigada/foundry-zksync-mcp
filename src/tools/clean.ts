import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolResult } from "./compile.js";
import { profileField, buildEnv } from "./shared.js";

const execFileAsync = promisify(execFile);

export const cleanSchema = z.object({
  projectPath: z
    .string()
    .describe("Absolute path to the foundry project directory"),
  profile: profileField,
});

export type CleanInput = z.infer<typeof cleanSchema>;

export async function clean(input: CleanInput): Promise<ToolResult> {
  try {
    const { stdout, stderr } = await execFileAsync("forge", ["clean"], {
      cwd: input.projectPath,
      env: buildEnv(input.profile),
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
    });

    const output = [stdout, stderr].filter(Boolean).join("\n");
    return { success: true, output: output || "Build artifacts cleaned (out/ and zkout/)." };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    const output = [e.stdout, e.stderr].filter(Boolean).join("\n") || e.message;
    return { success: false, output };
  }
}
