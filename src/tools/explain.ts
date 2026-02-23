import { z } from "zod";
import type { ToolResult } from "./compile.js";
import {
  foundryZkSyncContext,
  zkSyncAddresses,
  matchKnowledge,
  formatKnowledgeMatches,
} from "../knowledge.js";

export const explainSchema = z.object({
  rawText: z
    .string()
    .describe(
      "Raw text to explain — can be an error message, forge log output, " +
      "transaction hash, ABI-encoded data, or a general question about foundry-zksync",
    ),
  context: z
    .enum(["error", "log", "transaction", "general"])
    .optional()
    .describe(
      "Hint for what kind of text this is. " +
      "'general' prepends foundry-zksync background context. Defaults to general.",
    ),
});

export type ExplainInput = z.infer<typeof explainSchema>;

export async function explain(input: ExplainInput): Promise<ToolResult> {
  const label = input.context ?? "general";
  const parts: string[] = [];

  if (label === "general") {
    parts.push(foundryZkSyncContext);
    parts.push(zkSyncAddresses);
    parts.push("---");
  }

  const hasAddress = /0x[0-9a-fA-F]{38,40}/.test(input.rawText) ||
    /system.*contract|ContractDeployer|NonceHolder/i.test(input.rawText);
  if (hasAddress && label !== "general") {
    parts.push(zkSyncAddresses);
    parts.push("---");
  }

  const matches = matchKnowledge(input.rawText);
  if (matches.length > 0) {
    parts.push(formatKnowledgeMatches(matches));
    parts.push("---");
  }

  parts.push(`[${label}]\n${input.rawText}`);

  return { success: true, output: parts.join("\n\n") };
}
