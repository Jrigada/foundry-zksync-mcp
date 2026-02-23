import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolResult } from "./compile.js";
import { profileField, buildEnv } from "./shared.js";

const execFileAsync = promisify(execFile);

export const deploySchema = z.object({
  projectPath: z
    .string()
    .describe("Absolute path to the foundry project directory"),
  profile: profileField,
  contractPath: z
    .string()
    .describe("Contract identifier in the form src/MyContract.sol:MyContract"),
  rpcUrl: z
    .string()
    .describe("RPC URL of the target zkSync network"),

  privateKey: z
    .string()
    .optional()
    .describe(
      "Private key for signing. WARNING: this will be visible in the process argument list. Prefer keystore for production.",
    ),
  keystore: z
    .string()
    .optional()
    .describe("Path to an encrypted keystore file (safer alternative to raw private key)"),
  keystorePassword: z
    .string()
    .optional()
    .describe("Password to decrypt the keystore file"),

  constructorArgs: z
    .array(z.string())
    .optional()
    .describe(
      "Constructor arguments, each as a separate string. Solidity types are ABI-encoded by forge, e.g. ['0xaddr', '100', 'hello']",
    ),

  verify: z
    .boolean()
    .optional()
    .describe("If true, verify the contract on a block explorer after deployment"),
  verifierUrl: z
    .string()
    .optional()
    .describe("Block explorer verification API URL (e.g. https://api-era.zksync.network/api)"),

  extraArgs: z
    .array(z.string())
    .optional()
    .describe("Additional CLI flags, each as a separate array element"),
});

export type DeployInput = z.infer<typeof deploySchema>;

interface DeployResult {
  contractAddress: string;
  transactionHash: string;
  deployer: string;
}

function parseDeployOutput(raw: string): DeployResult | null {
  const address = raw.match(/Deployed to:\s*(0x[0-9a-fA-F]{40})/)?.[1];
  const txHash = raw.match(/Transaction hash:\s*(0x[0-9a-fA-F]{64})/)?.[1];
  const deployer = raw.match(/Deployer:\s*(0x[0-9a-fA-F]{40})/)?.[1];
  if (address && txHash && deployer) {
    return { contractAddress: address, transactionHash: txHash, deployer };
  }
  return null;
}

export async function deploy(input: DeployInput): Promise<ToolResult> {
  if (!input.privateKey && !input.keystore) {
    return {
      success: false,
      output: "Either privateKey or keystore must be provided for signing the deployment transaction.",
    };
  }

  const args: string[] = ["create", "--zksync", input.contractPath, "--rpc-url", input.rpcUrl];

  if (input.privateKey) {
    args.push("--private-key", input.privateKey);
  }
  if (input.keystore) {
    args.push("--keystore", input.keystore);
    if (input.keystorePassword) {
      args.push("--password", input.keystorePassword);
    }
  }

  if (input.constructorArgs && input.constructorArgs.length > 0) {
    args.push("--constructor-args", ...input.constructorArgs);
  }

  if (input.verify) {
    args.push("--verify");
  }
  if (input.verifierUrl) {
    args.push("--verifier-url", input.verifierUrl);
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
    const structured = parseDeployOutput(output);
    const summary = structured
      ? `Deployed to: ${structured.contractAddress}\nTx hash: ${structured.transactionHash}\nDeployer: ${structured.deployer}\n\n${output}`
      : output || "Deployment completed.";
    return { success: true, output: summary };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    const output = [e.stdout, e.stderr].filter(Boolean).join("\n") || e.message;
    return { success: false, output };
  }
}
