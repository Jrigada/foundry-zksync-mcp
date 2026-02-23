import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { profileField, buildEnv } from "./shared.js";

const execFileAsync = promisify(execFile);

export const compileSchema = z.object({
  projectPath: z
    .string()
    .describe("Absolute path to the foundry project directory"),
  profile: profileField,
});

export type CompileInput = z.infer<typeof compileSchema>;

export interface ToolResult {
  success: boolean;
  output: string;
}

export async function compile(input: CompileInput): Promise<ToolResult> {
  try {
    const { stdout, stderr } = await execFileAsync("forge", ["build", "--zksync"], {
      cwd: input.projectPath,
      env: buildEnv(input.profile),
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    });

    const output = [stdout, stderr].filter(Boolean).join("\n");
    return { success: true, output: output || "Build completed with no output." };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    const output = [e.stdout, e.stderr].filter(Boolean).join("\n") || e.message;
    return { success: false, output };
  }
}
