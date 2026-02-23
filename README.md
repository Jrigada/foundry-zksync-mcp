# foundry-zksync-mcp

An MCP (Model Context Protocol) server that exposes [foundry-zksync](https://github.com/matter-labs/foundry-zksync) CLI tools to AI assistants like Claude.

## Tools

| Tool | Description |
|------|-------------|
| `compile` | `forge build --zksync` |
| `test` | `forge test --zksync` with filter/verbosity options |
| `run_script` | `forge script --zksync` with broadcast, sender, slow mode |
| `deploy` | `forge create --zksync` with signing, constructor args, verification |
| `install` | `forge install` for dependency management |
| `clean` | `forge clean` to remove build artifacts |
| `explain` | Match errors/logs against a knowledge base of zkSync gotchas |
| `cast_abi_encode` | `cast abi-encode` for ABI encoding |
| `cast_abi_decode` | `cast abi-decode` for ABI decoding |
| `cast_calldata_decode` | `cast calldata-decode` for transaction calldata |
| `cast_call` | `cast call` for read-only contract interaction |
| `cast_send` | `cast send` for state-changing transactions |
| `get_zksync_docs` | Look up foundry-zksync documentation by topic |

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
  index.ts              MCP server entry point, registers all tools
  knowledge.ts          Knowledge base of zkSync gotchas and system addresses
  tools/
    shared.ts           Profile field and env builder shared across forge tools
    compile.ts          forge build --zksync
    test.ts             forge test --zksync
    run_script.ts       forge script --zksync
    deploy.ts           forge create --zksync
    install.ts          forge install
    clean.ts            forge clean
    explain.ts          Error/log explanation with knowledge base matching
    get_zksync_docs.ts  Documentation lookup with embedded content
    cast_abi_encode.ts  cast abi-encode
    cast_abi_decode.ts  cast abi-decode
    cast_calldata_decode.ts  cast calldata-decode
    cast_call.ts        cast call
    cast_send.ts        cast send
  __tests__/            Vitest test suite
```
