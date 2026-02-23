import { z } from "zod";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ToolResult } from "./compile.js";

export const readFoundryTomlSchema = z.object({
  projectPath: z
    .string()
    .describe("Absolute path to the foundry project directory"),
  summary: z
    .boolean()
    .optional()
    .describe(
      "If true, return a summary highlighting zkSync-relevant config " +
      "(profiles, zksolc version, compile mode, libraries) instead of raw TOML.",
    ),
});

export type ReadFoundryTomlInput = z.infer<typeof readFoundryTomlSchema>;

function extractSummary(content: string): string {
  const lines = content.split("\n");
  const parts: string[] = [];

  const profiles = new Set<string>();
  const zkSyncSections: string[] = [];
  let currentSection = "";
  let inZkSyncBlock = false;
  let zkSyncBlockLines: string[] = [];

  for (const line of lines) {
    const sectionMatch = line.match(/^\[profile\.(\w+)/);
    if (sectionMatch) {
      if (inZkSyncBlock && zkSyncBlockLines.length > 0) {
        zkSyncSections.push(zkSyncBlockLines.join("\n"));
      }
      profiles.add(sectionMatch[1]);
      currentSection = line.trim();
      inZkSyncBlock = currentSection.includes(".zksync]");
      zkSyncBlockLines = inZkSyncBlock ? [currentSection] : [];
      continue;
    }

    if (inZkSyncBlock && line.trim() && !line.startsWith("[")) {
      zkSyncBlockLines.push(line);
    }
    if (line.startsWith("[") && !line.startsWith("[profile")) {
      if (inZkSyncBlock && zkSyncBlockLines.length > 0) {
        zkSyncSections.push(zkSyncBlockLines.join("\n"));
      }
      inZkSyncBlock = false;
    }
  }

  if (inZkSyncBlock && zkSyncBlockLines.length > 0) {
    zkSyncSections.push(zkSyncBlockLines.join("\n"));
  }

  parts.push(`Profiles: ${[...profiles].join(", ") || "(default only)"}`);

  if (zkSyncSections.length > 0) {
    parts.push("\nzkSync Configuration:");
    for (const section of zkSyncSections) {
      parts.push(section);
    }
  } else {
    parts.push(
      "\nNo [profile.*.zksync] section found. " +
      "Add one to enable zkSync compilation:\n" +
      "  [profile.default.zksync]\n" +
      "  compile = true\n" +
      "  startup = true",
    );
  }

  const solcMatch = content.match(/solc_version\s*=\s*"([^"]+)"/);
  if (solcMatch) {
    parts.push(`\nSolidity version: ${solcMatch[1]}`);
  }

  const libSection = content.match(/\[profile\.\w+\.libraries\]([\s\S]*?)(?=\n\[|$)/);
  if (libSection) {
    parts.push("\nLinked libraries:" + libSection[1]);
  }

  const srcMatch = content.match(/^src\s*=\s*"([^"]+)"/m);
  const testMatch = content.match(/^test\s*=\s*"([^"]+)"/m);
  const scriptMatch = content.match(/^script\s*=\s*"([^"]+)"/m);
  if (srcMatch || testMatch || scriptMatch) {
    const dirs = [];
    if (srcMatch) dirs.push(`src=${srcMatch[1]}`);
    if (testMatch) dirs.push(`test=${testMatch[1]}`);
    if (scriptMatch) dirs.push(`script=${scriptMatch[1]}`);
    parts.push(`\nDirectories: ${dirs.join(", ")}`);
  }

  return parts.join("\n");
}

export async function readFoundryToml(input: ReadFoundryTomlInput): Promise<ToolResult> {
  const tomlPath = join(input.projectPath, "foundry.toml");

  try {
    const content = await readFile(tomlPath, "utf-8");

    if (input.summary) {
      return { success: true, output: extractSummary(content) };
    }

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
