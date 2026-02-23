import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolResult } from "./compile.js";
import { profileField, buildEnv } from "./shared.js";

const execFileAsync = promisify(execFile);

export const runScriptSchema = z.object({
  projectPath: z
    .string()
    .describe("Absolute path to the foundry project directory"),
  profile: profileField,
  scriptPath: z
    .string()
    .describe("Path to the Solidity script file, e.g. script/Deploy.s.sol"),
  rpcUrl: z
    .string()
    .optional()
    .describe("RPC URL to fork from or broadcast to"),
  sender: z
    .string()
    .optional()
    .describe(
      "Address to use as msg.sender for the script simulation (--sender). " +
      "Useful for dry-run without a private key.",
    ),
  broadcast: z
    .boolean()
    .optional()
    .describe("If true, passes --broadcast to actually send transactions on-chain"),
  slow: z
    .boolean()
    .optional()
    .describe(
      "If true, sends transactions sequentially (--slow). " +
      "Required on ZK chains which do not support transaction batching.",
    ),
  privateKey: z
    .string()
    .optional()
    .describe("Private key for signing transactions (required if broadcast is true)"),
  extraArgs: z
    .array(z.string())
    .optional()
    .describe("Additional CLI flags, each as a separate array element, e.g. ['--verify', '--etherscan-api-key', 'abc']"),
});

export type RunScriptInput = z.infer<typeof runScriptSchema>;

export async function runScript(input: RunScriptInput): Promise<ToolResult> {
  const args: string[] = ["script", "--zksync", input.scriptPath];

  if (input.rpcUrl) {
    args.push("--rpc-url", input.rpcUrl);
  }
  if (input.sender) {
    args.push("--sender", input.sender);
  }
  if (input.broadcast) {
    args.push("--broadcast");
  }
  if (input.slow) {
    args.push("--slow");
  }
  if (input.privateKey) {
    args.push("--private-key", input.privateKey);
  }

  if (input.extraArgs) {
    args.push(...input.extraArgs);
  }

  try {
    const { stdout, stderr } = await execFileAsync("forge", args, {
      cwd: input.projectPath,
      env: buildEnv(input.profile),
      maxBuffer: 10 * 1024 * 1024,
      timeout: 300_000,
    });

    const output = [stdout, stderr].filter(Boolean).join("\n");
    return { success: true, output: output || "Script completed with no output." };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    const output = [e.stdout, e.stderr].filter(Boolean).join("\n") || e.message;
    return { success: false, output };
  }
}
