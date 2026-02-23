import { z } from "zod";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import type { ToolResult } from "./compile.js";
import { buildEnv } from "./shared.js";

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

interface ParsedAccount {
  address: string;
  privateKey: string;
}

function parseAnvilOutput(raw: string): { accounts: ParsedAccount[]; chainId?: string } {
  const accounts: ParsedAccount[] = [];
  const lines = raw.split("\n");

  let inAccounts = false;
  let inKeys = false;
  const addresses: string[] = [];
  const keys: string[] = [];

  for (const line of lines) {
    if (line.includes("Available Accounts")) {
      inAccounts = true;
      inKeys = false;
      continue;
    }
    if (line.includes("Private Keys")) {
      inAccounts = false;
      inKeys = true;
      continue;
    }
    if (line.includes("Wallet") || line.includes("Base Fee") || line.includes("Listening")) {
      inAccounts = false;
      inKeys = false;
    }

    if (inAccounts) {
      const match = line.match(/(0x[0-9a-fA-F]{40})/);
      if (match) addresses.push(match[1]);
    }
    if (inKeys) {
      const match = line.match(/(0x[0-9a-fA-F]{64})/);
      if (match) keys.push(match[1]);
    }
  }

  for (let i = 0; i < Math.min(addresses.length, keys.length); i++) {
    accounts.push({ address: addresses[i], privateKey: keys[i] });
  }

  const chainMatch = raw.match(/Chain ID:\s*(\d+)/);

  return { accounts, chainId: chainMatch?.[1] };
}

export async function anvilZkSync(input: AnvilZkSyncInput): Promise<ToolResult> {
  const port = input.port ?? 8011;

  if (input.action === "check") {
    try {
      const { stdout } = await execFileAsync(
        "cast",
        ["chain-id", "--rpc-url", `http://127.0.0.1:${port}`],
        { env: buildEnv(), timeout: 5_000 },
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
      env: buildEnv(),
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
        output:
          `Failed to start anvil-zksync: ${err.message}\n\n` +
          "Make sure anvil-zksync is installed (foundryup-zksync).",
      });
    });

    const readyTimeout = setTimeout(() => {
      child.unref();

      const raw = stdout + stderr;
      const parsed = parseAnvilOutput(raw);

      const structured = [
        `anvil-zksync started (PID: ${child.pid})`,
        `RPC URL: http://127.0.0.1:${port}`,
      ];

      if (parsed.chainId) {
        structured.push(`Chain ID: ${parsed.chainId}`);
      }

      if (parsed.accounts.length > 0) {
        structured.push("");
        structured.push("Accounts:");
        for (const acct of parsed.accounts) {
          structured.push(`  ${acct.address} (key: ${acct.privateKey})`);
        }
      }

      structured.push("");
      structured.push("--- Raw Output ---");
      structured.push(raw);

      resolve({
        success: true,
        output: structured.join("\n"),
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
