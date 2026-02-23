import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolResult } from "./compile.js";
import { buildEnv } from "./shared.js";

const execFileAsync = promisify(execFile);

export const installSchema = z.object({
  projectPath: z
    .string()
    .describe("Absolute path to the foundry project directory"),
  dependencies: z
    .array(z.string())
    .optional()
    .describe(
      "Dependencies to install, e.g. ['OpenZeppelin/openzeppelin-contracts', 'transmissions11/solmate']. " +
      "If omitted, installs all existing dependencies from foundry.toml.",
    ),
  noCommit: z
    .boolean()
    .optional()
    .describe("If true, passes --no-commit to skip creating a git commit for the install"),
});

export type InstallInput = z.infer<typeof installSchema>;

export async function install(input: InstallInput): Promise<ToolResult> {
  const args: string[] = ["install"];

  if (input.dependencies && input.dependencies.length > 0) {
    args.push(...input.dependencies);
  }
  if (input.noCommit) {
    args.push("--no-commit");
  }

  try {
    const { stdout, stderr } = await execFileAsync("forge", args, {
      cwd: input.projectPath,
      env: buildEnv(),
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    });

    const output = [stdout, stderr].filter(Boolean).join("\n");
    return { success: true, output: output || "Dependencies installed successfully." };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    const output = [e.stdout, e.stderr].filter(Boolean).join("\n") || e.message;

    // Detect broken git submodule state and provide actionable advice
    if (
      output.includes("not a git repository") &&
      output.includes(".git/modules")
    ) {
      return {
        success: false,
        output:
          output +
          "\n\n--- Diagnosis ---\n" +
          "Git submodule metadata is broken. This usually happens when the repo was cloned " +
          "without --recursive, or submodule directories were copied without their .git references.\n\n" +
          "Fix: run these commands in the project root:\n" +
          "  git submodule deinit --all -f\n" +
          "  git submodule update --init --recursive\n" +
          "Then retry forge install.",
      };
    }

    // Detect non-git directory
    if (output.includes("not a git repository")) {
      return {
        success: false,
        output:
          output +
          "\n\n--- Diagnosis ---\n" +
          "forge install requires a git repository. Initialize one first:\n" +
          "  git init && git add -A && git commit -m 'init'\n" +
          "Then retry forge install.",
      };
    }

    return { success: false, output };
  }
}
