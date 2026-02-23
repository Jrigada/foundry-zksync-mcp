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
- [foundry-zksync](https://github.com/matter-labs/foundry-zksync) installed and available on `PATH`

## Install & Build

```bash
npm install
npm run build
```

## Run

```bash
npm start
```

The server communicates over stdio using the MCP protocol.

## Use with Claude Code

```bash
claude mcp add foundry-zksync node /absolute/path/to/foundry-zksync-mcp/dist/index.js
```

Or add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "foundry-zksync": {
      "command": "node",
      "args": ["/absolute/path/to/foundry-zksync-mcp/dist/index.js"]
    }
  }
}
```

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
  __tests__/            102 tests (vitest)
```
