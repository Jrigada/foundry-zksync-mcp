# foundry-zksync-mcp

An MCP (Model Context Protocol) server that exposes [foundry-zksync](https://github.com/matter-labs/foundry-zksync) CLI tools to AI assistants like Claude.

## Tools

| Tool | Description |
|------|-------------|
| `init` | `forge init` with automatic zkSync config |
| `compile` | `forge build --zksync` |
| `test` | `forge test --zksync` with filter/verbosity options |
| `run_script` | `forge script --zksync` with broadcast, sender, slow mode |
| `deploy` | `forge create --zksync` with structured output parsing |
| `verify` | `forge verify-contract --zksync` (Etherscan & zkSync Explorer) |
| `install` | `forge install` for dependency management |
| `clean` | `forge clean` to remove build artifacts |
| `gas_report` | `forge test --gas-report` for gas usage analysis |
| `snapshot` | `forge snapshot` for gas benchmarking |
| `read_foundry_toml` | Read and inspect project configuration |
| `explain` | Match errors/logs against a knowledge base of zkSync gotchas |
| `cast_abi_encode` | `cast abi-encode` |
| `cast_abi_decode` | `cast abi-decode` |
| `cast_calldata_decode` | `cast calldata-decode` |
| `cast_call` | `cast call` for read-only contract interaction |
| `cast_send` | `cast send` for state-changing transactions |
| `cast_balance` | `cast balance` for ETH balance queries |
| `cast_nonce` | `cast nonce` for transaction nonce queries |
| `get_zksync_docs` | Look up foundry-zksync documentation by topic |
| `anvil_zksync` | Start or check a local anvil-zksync dev node |

## Prerequisites

- Node.js >= 18
- [foundry-zksync](https://github.com/matter-labs/foundry-zksync) installed (`foundryup-zksync`)

## Quick Start (npx)

No install needed — run directly with npx:

```bash
claude mcp add foundry-zksync -- npx -y foundry-zksync-mcp
```

Or add to `claude_desktop_config.json` / `~/.claude.json`:

```json
{
  "mcpServers": {
    "foundry-zksync": {
      "command": "npx",
      "args": ["-y", "foundry-zksync-mcp"]
    }
  }
}
```

## Install from Source

```bash
git clone https://github.com/Jrigada/foundry-zksync-mcp.git
cd foundry-zksync-mcp
npm install
npm run build
```

Then register with Claude Code:

```bash
claude mcp add foundry-zksync node /absolute/path/to/foundry-zksync-mcp/dist/index.js
```

## Key Management

All signing tools (`deploy`, `cast_send`, `run_script`) support multiple wallet methods. Choose based on your security needs:

### Local Development (anvil-zksync)

For local dev with well-known test keys, use `privateKey` directly:

```
privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
```

These are the default anvil-zksync test accounts — they hold no real value.

> **Warning:** Never use `privateKey` with keys that hold real funds. MCP tool parameters are visible to the AI assistant and may be logged.

### Recommended for Production: Named Keystores

Keys are encrypted on disk — only the account name travels through MCP.

```bash
# Import a private key into a named keystore (interactive, key never shown)
cast wallet import deployer --interactive

# List your keystores
ls ~/.foundry/keystores/
```

Then use `account: "deployer"` in any signing tool. Forge will prompt for the password at runtime, or you can point to a password file with `passwordFile`.

### Keystore Files

If you have an existing encrypted keystore JSON file (e.g. from Geth, MetaMask export):

```
keystore: "/path/to/keystore.json"
passwordFile: "/path/to/password.txt"
```

### Hardware Wallets

```
ledger: true    # Ledger
trezor: true    # Trezor
```

### Cloud KMS

```
aws: true       # AWS KMS (set AWS_KMS_KEY_ID env var)
gcp: true       # Google Cloud KMS (set GCP_PROJECT_ID, GCP_LOCATION, etc.)
```

### Signing Method Summary

| Method | Key Exposure | Best For |
|--------|-------------|----------|
| Hardware wallet | None (key never leaves device) | High-value production |
| Cloud KMS | None (key in HSM) | Automated production |
| Named keystore (`account`) | None through MCP (encrypted on disk) | General production use |
| Keystore file | None through MCP (encrypted on disk) | Existing workflows |
| `privateKey` | Visible to AI assistant | Local dev with test keys only |

## Project Structure

```
src/
  index.ts              MCP server entry point, registers all 21 tools
  knowledge.ts          Knowledge base (45+ entries) and system addresses
  tools/
    shared.ts           Profile field and env builder shared across forge tools
    init.ts             forge init with zkSync config
    compile.ts          forge build --zksync
    test.ts             forge test --zksync
    run_script.ts       forge script --zksync
    deploy.ts           forge create --zksync (structured output)
    verify.ts           forge verify-contract --zksync
    install.ts          forge install
    clean.ts            forge clean
    gas_report.ts       forge test --gas-report
    snapshot.ts         forge snapshot
    read_foundry_toml.ts  Read project config
    explain.ts          Error/log explanation with knowledge base
    get_zksync_docs.ts  Documentation lookup with embedded content
    cast_abi_encode.ts  cast abi-encode
    cast_abi_decode.ts  cast abi-decode
    cast_calldata_decode.ts  cast calldata-decode
    cast_call.ts        cast call
    cast_send.ts        cast send
    cast_balance.ts     cast balance
    cast_nonce.ts       cast nonce
    anvil_zksync.ts     anvil-zksync node management
  __tests__/            133 tests (vitest)
```
