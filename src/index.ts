#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { compileSchema, compile, type ToolResult } from "./tools/compile.js";
import { testSchema, test } from "./tools/test.js";
import { runScriptSchema, runScript } from "./tools/run_script.js";
import { deploySchema, deploy } from "./tools/deploy.js";
import { explainSchema, explain } from "./tools/explain.js";
import { castAbiEncodeSchema, castAbiEncode } from "./tools/cast_abi_encode.js";
import { castAbiDecodeSchema, castAbiDecode } from "./tools/cast_abi_decode.js";
import { castCalldataDecodeSchema, castCalldataDecode } from "./tools/cast_calldata_decode.js";
import { castCallSchema, castCall } from "./tools/cast_call.js";
import { castSendSchema, castSend } from "./tools/cast_send.js";
import { getZkSyncDocsSchema, getZkSyncDocs } from "./tools/get_zksync_docs.js";
import { installSchema, install } from "./tools/install.js";
import { cleanSchema, clean } from "./tools/clean.js";

const server = new McpServer({
  name: "foundry-zksync-mcp",
  version: "0.1.0",
});

function formatResult(result: ToolResult) {
  return {
    content: [{ type: "text" as const, text: result.output }],
    isError: !result.success,
  };
}

server.tool(
  "install",
  "Install dependencies for a foundry project (forge install)",
  installSchema.shape,
  async (input) => formatResult(await install(input)),
);

server.tool(
  "clean",
  "Remove build artifacts (out/ and zkout/) from a foundry project (forge clean)",
  cleanSchema.shape,
  async (input) => formatResult(await clean(input)),
);

server.tool(
  "compile",
  "Compile a foundry-zksync project (forge build --zksync). " +
    "Check foundry.toml for [profile.X.zksync] sections — if zkSync sources live under a " +
    "specific profile (e.g. 'zksync'), pass that as the profile argument.",
  compileSchema.shape,
  async (input) => formatResult(await compile(input)),
);

server.tool(
  "test",
  "Run tests in a foundry-zksync project (forge test --zksync). " +
    "Check foundry.toml for [profile.X] sections — if the test directory differs per profile " +
    "(e.g. profile 'zksync' has test = 'zksync/tests'), pass the correct profile argument.",
  testSchema.shape,
  async (input) => formatResult(await test(input)),
);

server.tool(
  "run_script",
  "Run a forge script targeting zkSync (forge script --zksync)",
  runScriptSchema.shape,
  async (input) => formatResult(await runScript(input)),
);

server.tool(
  "deploy",
  "Deploy a contract to a zkSync network (forge create --zksync)",
  deploySchema.shape,
  async (input) => formatResult(await deploy(input)),
);

server.tool(
  "explain",
  "Explain raw output from foundry-zksync: error messages, logs, or transactions. " +
    "Matches against a knowledge base of known zkSync gotchas and returns actionable advice. " +
    "Use context='general' for background on what foundry-zksync is and how it works.",
  explainSchema.shape,
  async (input) => formatResult(await explain(input)),
);

server.tool(
  "cast_abi_encode",
  "ABI-encode values for a given Solidity function/constructor signature (cast abi-encode)",
  castAbiEncodeSchema.shape,
  async (input) => formatResult(await castAbiEncode(input)),
);

server.tool(
  "cast_abi_decode",
  "Decode ABI-encoded hex data back into human-readable values (cast abi-decode)",
  castAbiDecodeSchema.shape,
  async (input) => formatResult(await castAbiDecode(input)),
);

server.tool(
  "cast_calldata_decode",
  "Decode raw transaction calldata (with 4-byte selector) into function arguments (cast calldata-decode)",
  castCalldataDecodeSchema.shape,
  async (input) => formatResult(await castCalldataDecode(input)),
);

server.tool(
  "cast_call",
  "Read-only call to a deployed contract — no gas spent, no state change (cast call)",
  castCallSchema.shape,
  async (input) => formatResult(await castCall(input)),
);

server.tool(
  "cast_send",
  "Send a state-changing transaction to a deployed contract (cast send)",
  castSendSchema.shape,
  async (input) => formatResult(await castSend(input)),
);

server.tool(
  "get_zksync_docs",
  "Look up foundry-zksync documentation by topic. Returns URLs to the foundry-zksync book " +
    "for installation, config, testing, deployment, cheatcodes, nonces, factory deps, " +
    "paymasters, verification, and more. Use topic='list' to see all available topics.",
  getZkSyncDocsSchema.shape,
  async (input) => formatResult(await getZkSyncDocs(input)),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error starting MCP server:", err);
  process.exit(1);
});
