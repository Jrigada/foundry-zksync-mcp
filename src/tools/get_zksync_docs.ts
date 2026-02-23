import { z } from "zod";
import type { ToolResult } from "./compile.js";

const BOOK_BASE_URL = "https://foundry-book.zksync.io";

// Embedded content for the most commonly needed topics.
// This avoids the need for a web fetch and gives Claude immediate, actionable info.
const EMBEDDED_CONTENT: Record<string, string> = {
  "zksync-config": `
## zkSync Configuration in foundry.toml

Add a [profile.default.zksync] section (or [profile.<name>.zksync] for named profiles):

\`\`\`toml
[profile.default.zksync]
compile = true              # Enable zksolc compilation
startup = true              # Start in zkSync mode (for tests/scripts)
zksolc = "1.5.10"           # Pin zksolc version (recommended)
solc_path = "path/to/solc"  # Optional: custom solc binary
optimizer = true            # Enable optimizer
optimizer_mode = "3"        # Optimization level (0-3, or 's'/'z' for size)
force_evmla = false         # Use EVMLA codegen instead of Yul
size_fallback = true        # Auto-retry with -Oz if bytecode too large
evm_interpreter = false     # Run in EVM interpreter mode (slower, more compatible)

# Suppress known benign warnings from dependencies
suppressed_warnings = ["assemblycreate"]
suppressed_errors = []
\`\`\`

### Common profile patterns

\`\`\`toml
# Separate EVM and zkSync profiles
[profile.default]
src = "src"
test = "test"
script = "script"

[profile.zksync]
src = "zksync/src"
test = "zksync/test"
script = "zksync/script"

[profile.zksync.zksync]
compile = true
startup = true
\`\`\`

Use profiles via: \`FOUNDRY_PROFILE=zksync forge test\`

### Key constraints
- zksolc supports Solidity up to 0.8.30
- zksolc v1.5.9 is blocklisted
- Artifacts go to zkout/ (not out/)
- Test/script contracts are compiled with zksolc even though they never deploy on EraVM
`.trim(),

  "nonces": `
## zkSync Nonce Management

zkSync uses TWO separate nonces per account (unlike EVM's single nonce):

1. **Transaction nonce** — incremented for every transaction sent
2. **Deployment nonce** — incremented only when deploying contracts via CREATE

### Implications
- \`vm.getNonce()\` returns only the TX nonce
- CREATE address derivation uses the deployment nonce, NOT the TX nonce
- Address prediction differs from EVM — don't assume EVM nonce-based address formulas work
- When switching between EVM and zkVM contexts in tests, the deployment nonce may be discarded

### forge script behavior
Foundry adjusts nonces during script execution to ensure on-chain state matches simulation.
Corrections happen during setUp() and run() calls. The --slow flag is required on ZK chains
because transaction batching is not supported.
`.trim(),

  "factory-deps": `
## Factory Dependencies

On zkSync, contract bytecode is NOT included in CREATE/CREATE2 transaction calldata like on EVM.
Instead, all bytecodes must be pre-declared as "factory dependencies" in the transaction.

### How it works
- forge script: factory deps are collected automatically from compiled artifacts
- forge create: you must deploy libraries separately first, then link at compile time
  - Error "Dynamic linking not supported in create command" means you need to deploy
    libraries individually and add their addresses to foundry.toml:
    \`\`\`toml
    [profile.default.libraries]
    src/MyLib.sol:MyLib = "0xDeployedLibAddress"
    \`\`\`
- forge test: factory deps are handled automatically by the test runner

### Factory deps batching
- forge script supports batching factory deps across transactions
- forge create does NOT support batching (each deploy is independent)
- Injecting factory deps not directly referenced by the contract is partially supported
  in scripts/tests but missing for forge create
`.trim(),

  "verification": `
## Contract Verification on zkSync

Two verification pipelines are available:

### 1. Etherscan-compatible (requires API key)
\`\`\`bash
forge verify-contract <address> src/Contract.sol:Contract \\
  --verifier etherscan \\
  --verifier-url https://api-era.zksync.network/api \\
  --etherscan-api-key <KEY> \\
  --zksync
\`\`\`

### 2. zkSync Explorer (no API key)
\`\`\`bash
forge verify-contract <address> src/Contract.sol:Contract \\
  --verifier zksync \\
  --verifier-url https://explorer.zksync.io/contract_verification \\
  --zksync
\`\`\`

### Testnet URLs
- Etherscan: https://api-sepolia-era.zksync.network/api
- Explorer: https://sepolia.explorer.zksync.io/contract_verification

### Common issues
- Both pipelines support eraVM and EVM contracts
- Verification may fail if optimizer settings don't match deployment
- Known regression: forge script sometimes calls Etherscan even without --verify,
  causing 504 timeouts that block deployments
`.trim(),

  "evm-interpreter": `
## EVM Interpreter Mode

EraVM is NOT byte-compatible with EVM — some EVM opcodes have no EraVM equivalent.
When your contracts use unsupported opcodes, you can use EVM interpreter mode as a fallback.

### Enable via CLI
\`\`\`bash
forge test --zksync --zk-evm-interpreter
\`\`\`

### Enable via foundry.toml
\`\`\`toml
[profile.default.zksync]
evm_interpreter = true
\`\`\`

### Trade-offs
- Slower execution (EVM opcodes are interpreted, not native)
- More compatible with existing EVM code
- Useful for contracts that can't be rewritten for EraVM

### When to use
- Third-party contracts with EVM-specific assembly
- Contracts using opcodes not supported in EraVM
- Temporary workaround while migrating to EraVM-compatible code
`.trim(),

  "installation": `
## Installing foundry-zksync

### Quick install
\`\`\`bash
curl -L https://raw.githubusercontent.com/matter-labs/foundry-zksync/main/install-foundry-zksync | bash
\`\`\`

### CRITICAL WARNING
Do NOT run vanilla \`foundryup\` after installing foundry-zksync — it will silently replace
the zkSync fork with upstream Foundry. Always use \`foundryup-zksync\` instead.

The two cannot coexist on the same machine currently. If you accidentally ran foundryup,
reinstall with the command above.

### Verify installation
\`\`\`bash
forge --version  # Should show "foundry-zksync" in the output
\`\`\`
`.trim(),

  "paymaster": `
## Using Paymasters with foundry-zksync

Paymasters allow a third party to pay gas fees on behalf of users.

### In forge script
Pass paymaster parameters via the transaction:
\`\`\`solidity
// In your deployment script
vm.zkUsePaymaster(paymasterAddress, paymasterInput);
\`\`\`

### In cast send
\`\`\`bash
cast send <to> "function()" \\
  --rpc-url <url> \\
  --private-key <key> \\
  --zksync \\
  --zk-paymaster-address <paymaster> \\
  --zk-paymaster-input <encoded_input>
\`\`\`

### Key points
- Paymaster input must be ABI-encoded according to the paymaster contract's interface
- Test with a local paymaster contract before mainnet
- gas_per_pubdata_limit affects paymaster economics
`.trim(),
};

// URL-only entries for topics without embedded content
const DOCS_MAP: Record<string, { url: string; description: string }> = {
  "getting-started": {
    url: `${BOOK_BASE_URL}/getting-started/installation`,
    description: "Installation and first project setup",
  },
  installation: {
    url: `${BOOK_BASE_URL}/getting-started/installation`,
    description: "How to install foundry-zksync",
  },
  "forge-build": {
    url: `${BOOK_BASE_URL}/reference/forge/forge-build`,
    description: "forge build command reference",
  },
  "forge-test": {
    url: `${BOOK_BASE_URL}/reference/forge/forge-test`,
    description: "forge test command reference",
  },
  "forge-script": {
    url: `${BOOK_BASE_URL}/reference/forge/forge-script`,
    description: "forge script command reference",
  },
  "forge-create": {
    url: `${BOOK_BASE_URL}/reference/forge/forge-create`,
    description: "forge create command reference",
  },
  "forge-verify": {
    url: `${BOOK_BASE_URL}/reference/forge/forge-verify-contract`,
    description: "Contract verification reference",
  },
  cheatcodes: {
    url: `${BOOK_BASE_URL}/cheatcodes/`,
    description: "Cheatcodes reference and zkSync-specific behavior",
  },
  deployment: {
    url: `${BOOK_BASE_URL}/tutorials/solidity-scripting`,
    description: "Deployment tutorial using forge script",
  },
  testing: {
    url: `${BOOK_BASE_URL}/forge/tests`,
    description: "Writing and running tests",
  },
  config: {
    url: `${BOOK_BASE_URL}/reference/config/overview`,
    description: "foundry.toml configuration reference",
  },
  "zksync-config": {
    url: `${BOOK_BASE_URL}/config/zksync`,
    description: "zkSync-specific configuration in foundry.toml",
  },
  cast: {
    url: `${BOOK_BASE_URL}/reference/cast/`,
    description: "cast command reference",
  },
  "cast-send": {
    url: `${BOOK_BASE_URL}/reference/cast/cast-send`,
    description: "cast send command reference",
  },
  "cast-call": {
    url: `${BOOK_BASE_URL}/reference/cast/cast-call`,
    description: "cast call command reference",
  },
  nonces: {
    url: `${BOOK_BASE_URL}/zksync-specifics/nonces`,
    description: "zkSync nonce management (tx nonce + deploy nonce)",
  },
  "factory-deps": {
    url: `${BOOK_BASE_URL}/zksync-specifics/factory-deps`,
    description: "Factory dependencies in zkSync deployments",
  },
  paymaster: {
    url: `${BOOK_BASE_URL}/zksync-specifics/paymaster`,
    description: "Using paymasters with foundry-zksync",
  },
  verification: {
    url: `${BOOK_BASE_URL}/zksync-specifics/verification`,
    description: "Contract verification on zkSync (Etherscan & zkSync Explorer)",
  },
  "evm-interpreter": {
    url: `${BOOK_BASE_URL}/zksync-specifics/evm-interpreter`,
    description: "EVM interpreter mode for EVM-incompatible code",
  },
};

export const getZkSyncDocsSchema = z.object({
  topic: z
    .string()
    .describe(
      "Topic to look up in the foundry-zksync book. Examples: " +
      "'installation', 'forge-test', 'cheatcodes', 'deployment', 'config', " +
      "'zksync-config', 'nonces', 'factory-deps', 'paymaster', 'verification', " +
      "'cast-send', 'cast-call', 'evm-interpreter'. " +
      "Or use 'list' to see all available topics.",
    ),
});

export type GetZkSyncDocsInput = z.infer<typeof getZkSyncDocsSchema>;

export async function getZkSyncDocs(input: GetZkSyncDocsInput): Promise<ToolResult> {
  const topic = input.topic.toLowerCase().trim();

  // List all topics
  if (topic === "list" || topic === "help") {
    const lines = Object.entries(DOCS_MAP)
      .map(([key, val]) => {
        const hasContent = key in EMBEDDED_CONTENT;
        const marker = hasContent ? " [inline docs]" : "";
        return `  ${key.padEnd(20)} ${val.description}${marker}`;
      })
      .join("\n");
    return {
      success: true,
      output: `Available documentation topics:\n\n${lines}\n\nTopics marked [inline docs] return full content. Others return book URLs.\nBook URL: ${BOOK_BASE_URL}`,
    };
  }

  // Check for embedded content first
  const embedded = EMBEDDED_CONTENT[topic];
  const entry = DOCS_MAP[topic];

  if (embedded && entry) {
    return {
      success: true,
      output: `${embedded}\n\n---\nFull docs: ${entry.url}`,
    };
  }

  if (entry) {
    return {
      success: true,
      output:
        `${entry.description}\n\n` +
        `URL: ${entry.url}\n\n` +
        `Open this URL for the full documentation.`,
    };
  }

  // Fuzzy match
  const fuzzyMatches = Object.entries(DOCS_MAP).filter(
    ([key, val]) =>
      key.includes(topic) ||
      val.description.toLowerCase().includes(topic),
  );

  if (fuzzyMatches.length > 0) {
    const lines = fuzzyMatches
      .map(([key, val]) => `  ${key.padEnd(20)} ${val.url}`)
      .join("\n");
    return {
      success: true,
      output: `No exact match for "${input.topic}". Related topics:\n\n${lines}`,
    };
  }

  return {
    success: false,
    output:
      `No documentation found for "${input.topic}".\n\n` +
      `Try searching the book directly: ${BOOK_BASE_URL}\n` +
      `Or use topic "list" to see all available topics.`,
  };
}
