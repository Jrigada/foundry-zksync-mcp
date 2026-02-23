import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolResult } from "./compile.js";
import { profileField, buildEnv } from "./shared.js";

const execFileAsync = promisify(execFile);

export const verifySchema = z.object({
  projectPath: z
    .string()
    .describe("Absolute path to the foundry project directory"),
  profile: profileField,
  contractAddress: z
    .string()
    .describe("Deployed contract address to verify"),
  contractPath: z
    .string()
    .describe("Contract identifier, e.g. src/MyContract.sol:MyContract"),
  verifier: z
    .enum(["etherscan", "zksync"])
    .describe(
      "Verification backend. 'etherscan' requires an API key, " +
      "'zksync' uses the zkSync Explorer (no API key needed).",
    ),
  verifierUrl: z
    .string()
    .describe(
      "Verifier API URL. Etherscan mainnet: https://api-era.zksync.network/api, " +
      "Etherscan testnet: https://api-sepolia-era.zksync.network/api, " +
      "Explorer mainnet: https://explorer.zksync.io/contract_verification, " +
      "Explorer testnet: https://sepolia.explorer.zksync.io/contract_verification",
    ),
  etherscanApiKey: z
    .string()
    .optional()
    .describe("Etherscan API key (required when verifier is 'etherscan')"),
  constructorArgs: z
    .string()
    .optional()
    .describe("ABI-encoded constructor arguments (hex string, no 0x prefix)"),
  compilerVersion: z
    .string()
    .optional()
    .describe("Compiler version used for deployment, e.g. v0.8.26+commit.8a97fa7a"),
  numOptimizations: z
    .number()
    .optional()
    .describe("Number of optimization runs used during compilation"),
  extraArgs: z
    .array(z.string())
    .optional()
    .describe("Additional CLI flags"),
});

export type VerifyInput = z.infer<typeof verifySchema>;

export async function verify(input: VerifyInput): Promise<ToolResult> {
  const args: string[] = [
    "verify-contract",
    "--zksync",
    input.contractAddress,
    input.contractPath,
    "--verifier", input.verifier,
    "--verifier-url", input.verifierUrl,
  ];

  if (input.etherscanApiKey) {
    args.push("--etherscan-api-key", input.etherscanApiKey);
  }
  if (input.constructorArgs) {
    args.push("--constructor-args", input.constructorArgs);
  }
  if (input.compilerVersion) {
    args.push("--compiler-version", input.compilerVersion);
  }
  if (input.numOptimizations !== undefined) {
    args.push("--num-of-optimizations", String(input.numOptimizations));
  }
  if (input.extraArgs) {
    args.push(...input.extraArgs);
  }

  try {
    const { stdout, stderr } = await execFileAsync("forge", args, {
      cwd: input.projectPath,
      env: buildEnv(input.profile),
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    });

    const output = [stdout, stderr].filter(Boolean).join("\n");
    return { success: true, output: output || "Verification submitted." };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    const output = [e.stdout, e.stderr].filter(Boolean).join("\n") || e.message;
    return { success: false, output };
  }
}
