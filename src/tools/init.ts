import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ToolResult } from "./compile.js";

const execFileAsync = promisify(execFile);

const ZKSYNC_CONFIG_BLOCK = `
[profile.default.zksync]
compile = true
startup = true
zksolc = "1.5.10"
`;

export const initSchema = z.object({
  projectPath: z
    .string()
    .describe("Absolute path where the new project should be created"),
  name: z
    .string()
    .optional()
    .describe("Project name (used as directory name if projectPath is the parent)"),
  noGit: z
    .boolean()
    .optional()
    .describe("If true, skip git initialization (--no-git)"),
  noCommit: z
    .boolean()
    .optional()
    .describe("If true, skip the initial git commit (--no-commit)"),
  template: z
    .string()
    .optional()
    .describe("GitHub template to use, e.g. 'PaulRBerg/foundry-template'"),
});

export type InitInput = z.infer<typeof initSchema>;

export async function init(input: InitInput): Promise<ToolResult> {
  const args: string[] = ["init"];

  if (input.name) {
    args.push(input.name);
  }

  if (input.noGit) {
    args.push("--no-git");
  }
  if (input.noCommit) {
    args.push("--no-commit");
  }
  if (input.template) {
    args.push("--template", input.template);
  }

  try {
    const { stdout, stderr } = await execFileAsync("forge", args, {
      cwd: input.projectPath,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    });

    const initOutput = [stdout, stderr].filter(Boolean).join("\n");

    const projectDir = input.name ? join(input.projectPath, input.name) : input.projectPath;
    let configNote = "";
    try {
      const tomlPath = join(projectDir, "foundry.toml");
      const existing = await readFile(tomlPath, "utf-8");
      if (!existing.includes("[profile.default.zksync]")) {
        await writeFile(tomlPath, existing.trimEnd() + "\n" + ZKSYNC_CONFIG_BLOCK, "utf-8");
        configNote = "\n\nAdded [profile.default.zksync] section to foundry.toml.";
      }
    } catch {
      configNote = "\n\nNote: could not patch foundry.toml — add [profile.default.zksync] manually.";
    }

    return {
      success: true,
      output: (initOutput || "Project initialized.") + configNote,
    };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    const output = [e.stdout, e.stderr].filter(Boolean).join("\n") || e.message;
    return { success: false, output };
  }
}
