import { z } from "zod";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import type { ToolResult } from "./compile.js";

const execFileAsync = promisify(execFile);

export const anvilZkSyncSchema = z.object({
  port: z
    .number()
    .optional()
    .describe("Port to listen on (default: 8011)"),
  forkUrl: z
    .string()
    .optional()
    .describe("RPC URL to fork from, e.g. https://mainnet.era.zksync.io"),
  forkBlockNumber: z
    .number()
    .optional()
    .describe("Block number to fork from (requires forkUrl)"),
  accounts: z
    .number()
    .optional()
    .describe("Number of funded accounts to generate (default: 10)"),
  balance: z
    .number()
    .optional()
    .describe("ETH balance for each generated account in ether (default: 10000)"),
  action: z
    .enum(["start", "check"])
    .describe(
      "'start' launches anvil-zksync in the background and returns when ready. " +
      "'check' tests if anvil-zksync is reachable at the given port.",
    ),
});

export type AnvilZkSyncInput = z.infer<typeof anvilZkSyncSchema>;

export async function anvilZkSync(input: AnvilZkSyncInput): Promise<ToolResult> {
  const port = input.port ?? 8011;

  if (input.action === "check") {
    try {
      const { stdout } = await execFileAsync(
        "cast",
        ["chain-id", "--rpc-url", `http://127.0.0.1:${port}`],
        { timeout: 5_000 },
      );
      return { success: true, output: `anvil-zksync is running on port ${port}. Chain ID: ${stdout.trim()}` };
    } catch {
      return { success: false, output: `No response from http://127.0.0.1:${port}. anvil-zksync may not be running.` };
    }
  }

  const args: string[] = [];
  args.push("--port", String(port));

  if (input.forkUrl) {
    args.push("--fork-url", input.forkUrl);
  }
  if (input.forkBlockNumber !== undefined) {
    args.push("--fork-block-number", String(input.forkBlockNumber));
  }
  if (input.accounts !== undefined) {
    args.push("--accounts", String(input.accounts));
  }
  if (input.balance !== undefined) {
    args.push("--balance", String(input.balance));
  }

  return new Promise((resolve) => {
    const child = spawn("anvil-zksync", args, {
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        output: `Failed to start anvil-zksync: ${err.message}\n\nMake sure anvil-zksync is installed (foundryup-zksync).`,
      });
    });

    const readyTimeout = setTimeout(() => {
      child.unref();
      resolve({
        success: true,
        output:
          `anvil-zksync started on port ${port} (PID: ${child.pid}).\n\n` +
          `RPC URL: http://127.0.0.1:${port}\n` +
          (stdout ? `\n${stdout}` : ""),
      });
    }, 3_000);

    child.on("exit", (code) => {
      clearTimeout(readyTimeout);
      resolve({
        success: false,
        output: `anvil-zksync exited with code ${code}.\n${[stdout, stderr].filter(Boolean).join("\n")}`,
      });
    });
  });
}
