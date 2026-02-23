import { z } from "zod";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ToolResult } from "./compile.js";

export const readFoundryTomlSchema = z.object({
  projectPath: z
    .string()
    .describe("Absolute path to the foundry project directory"),
});

export type ReadFoundryTomlInput = z.infer<typeof readFoundryTomlSchema>;

export async function readFoundryToml(input: ReadFoundryTomlInput): Promise<ToolResult> {
  const tomlPath = join(input.projectPath, "foundry.toml");

  try {
    const content = await readFile(tomlPath, "utf-8");
    return { success: true, output: content };
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    if (e.code === "ENOENT") {
      return {
        success: false,
        output:
          `No foundry.toml found at ${tomlPath}.\n\n` +
          "This directory may not be a Foundry project. " +
          "Run forge init to create one, or check that projectPath is correct.",
      };
    }
    return { success: false, output: e.message };
  }
}
