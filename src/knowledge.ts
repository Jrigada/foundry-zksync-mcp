export const foundryZkSyncContext = `
## What is foundry-zksync?

foundry-zksync is Matter Labs' fork of Foundry (the Ethereum development toolkit) that adds
first-class support for zkSync Era (an Ethereum ZK-rollup). It provides forge, cast, anvil,
and chisel with zkSync-specific capabilities.

**Key architectural facts:**

1. **Upstream sync**: The team merges upstream foundry-rs/foundry weekly. This means you get
   the latest Foundry features with a ~1 week delay. Releases are cut every 2-3 weeks
   (latest: v0.1.8, Feb 2026).

2. **Strategy pattern**: Rather than forking every Foundry file, foundry-zksync uses a strategy
   pattern. Stateless runners and stateful contexts keep zkSync code disjoint from upstream code.
   This makes merges tractable.

3. **Dual compilation**: Contracts are compiled with BOTH solc (for EVM) and zksolc (for EraVM).
   Artifacts go to out/ (EVM) and zkout/ (EraVM) respectively. Test/script contracts are compiled
   with zksolc too, even though they're never deployed on EraVM — this is a known inefficiency.

4. **Cheatcodes on EraVM**: Cheatcodes (vm.prank, vm.expectRevert, etc.) work by intercepting
   calls through the Cheatcodes inspector. For zkSync, the inspector wraps EraVM execution —
   storage is migrated between EVM and zkEVM contexts. Some cheatcodes have limitations
   (deep pranking, mockCall on caller, etc.) due to EraVM's different execution model.

5. **EraVM vs EVM**: EraVM is NOT byte-compatible with EVM. It uses different opcodes, 32-byte
   word-aligned bytecode with odd word count, split nonces (tx + deploy), reserved system
   addresses below 2^16, and a different gas model (computation + pubdata).

6. **forge script flow**: Scripts execute in three stages: initial execution → simulation →
   broadcast. EIP-712 type 0x71 transactions encode factory_deps in the transaction data.
   ZK chains don't support tx batching, so --slow is required for dependent transactions.

7. **Two verification pipelines**: Etherscan-compatible (requires API key) and zkSync Explorer
   (no API key). Both support eraVM and EVM contract verification.

8. **Current limitations**: forge coverage and forge debug are not supported on zkEVM.
   Coverage silently falls back to EVM. Several cheatcodes are missing (deep pranking,
   gas cheatcodes, vm.mockFunction, etc.).

9. **Installation**: Use foundryup-zksync, NOT foundryup. Running vanilla foundryup overwrites
   foundry-zksync with upstream foundry. The two cannot coexist on the same machine currently.

10. **Compiler constraints**: zksolc supports Solidity up to 0.8.30. zksolc v1.5.9 is
    blocklisted. The default codegen is migrating from Yul to EVMLA — set it explicitly
    in foundry.toml to avoid surprises.
`.trim();

export const zkSyncAddresses = `
## zkSync System Contract Addresses

All system contracts live at addresses < 0x10000 (reserved range).

| Address | Contract | Purpose |
|---------|----------|---------|
| 0x0000...0000 | — | Zero address (same as EVM) |
| 0x0000...0001 | Ecrecover | Precompile: signature recovery |
| 0x0000...0002 | SHA256 | Precompile: SHA-256 hash |
| 0x0000...8001 | AccountCodeStorage | Maps addresses to their deployed code hashes |
| 0x0000...8002 | NonceHolder | Manages TX nonces and deploy nonces per account |
| 0x0000...8003 | KnownCodesStorage | Registry of all known bytecode hashes (factory deps) |
| 0x0000...8004 | ImmutableSimulator | Stores immutable variable values for deployed contracts |
| 0x0000...8005 | ContractDeployer | Handles CREATE and CREATE2 (all deploys go through here) |
| 0x0000...8006 | SystemContext | Block/tx context (block.number, block.timestamp, etc.) |
| 0x0000...8008 | EventWriter | System contract for emitting events |
| 0x0000...8009 | Compressor | Compresses published pubdata (calldata, bytecodes) |
| 0x0000...800a | ComplexUpgrader | Handles system contract upgrades |
| 0x0000...800b | L2BaseToken (L2EthToken) | Native ETH balance management on L2 |
| 0x0000...800c | SystemContractHelper | Utility functions for system contracts |
| 0x0000...800d | MsgValueSimulator | Simulates msg.value transfers (ETH sent with calls) |
| 0x0000...8010 | L1Messenger | Sends messages from L2 → L1 |
| 0x0000...8011 | Create2Factory | Default CREATE2 deployer |
| 0x0000...8012 | PubdataChunkPublisher | Publishes pubdata chunks to L1 |

## Foundry / Testing Addresses

| Address | What |
|---------|------|
| 0x7109709ECfa91a80626fF3989D68f67F5b1DD12D | Cheatcodes (vm) — the Foundry cheatcode address |
| 0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496 | Default test contract address (msg.sender in tests) |
| 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38 | Default script sender (when no --sender or --private-key) |
| 0x4e59b44847b379578588920cA78FbF26c0B4956C | Deterministic CREATE2 deployer (upstream, also on zkSync) |
`.trim();

export interface KnowledgeEntry {
  patterns: RegExp[];
  title: string;
  explanation: string;
  fix: string;
  tags: string[];
}

export const knowledgeBase: KnowledgeEntry[] = [
  {
    patterns: [
      /BytecodeLengthInWordsIsEven/i,
      /bytecode length must be divisible by 32/i,
    ],
    title: "zkSync bytecode alignment requirement",
    explanation:
      "zkSync bytecode is stored in 32-byte words and must have an odd word count. " +
      "This error typically appears when using vm.etch() with bytecode that doesn't meet these constraints, " +
      "or when zksolc produces malformed output for certain code patterns.",
    fix:
      "If using vm.etch(), pad your bytecode to a multiple of 32 bytes. " +
      "If this comes from compilation, check for vm.etch/vm.create usage in tests " +
      "and ensure the bytecode source is compiled with zksolc.",
    tags: ["compiler", "bytecode", "vm.etch"],
  },

  {
    patterns: [
      /bytecode too large/i,
      /contract code size/i,
      /exceeds.*size.*limit/i,
    ],
    title: "Contract exceeds zksolc bytecode size limit",
    explanation:
      "zksolc has stricter bytecode size limits than solc. Test and script contracts often " +
      "exceed these limits because they are large aggregate contracts. Since test/script contracts " +
      "are never deployed on EraVM, compiling them with zksolc is unnecessary but currently unavoidable.",
    fix:
      'Add to foundry.toml under [profile.default.zksync]:\n' +
      '  size_fallback = true    # auto-retries with -Oz optimization\n' +
      '  force_evmla = true      # uses EVMLA codegen (smaller output)\n' +
      "Or split large test contracts into smaller files.",
    tags: ["compiler", "bytecode", "config"],
  },

  {
    patterns: [
      /not supported.*version/i,
      /unsupported.*zksolc/i,
      /may lead to unexpected errors/i,
    ],
    title: "Unsupported zksolc version",
    explanation:
      "The configured zksolc version is outside the supported range. " +
      "Note: zksolc v1.5.9 is explicitly blocklisted. " +
      "Using an unsupported version may produce incorrect bytecode or fail silently.",
    fix:
      "Set a supported version in foundry.toml:\n" +
      "  [profile.default.zksync]\n" +
      '  zksolc = "1.5.10"\n' +
      "Check the foundry-zksync CHANGELOG for the latest supported versions.",
    tags: ["compiler", "config", "version"],
  },

  {
    patterns: [
      /solc.*0\.8\.3[1-9]/,
      /solidity.*0\.8\.3[1-9]/i,
      /era-compiler-solidity/i,
    ],
    title: "Solidity version too new for zkSync",
    explanation:
      "ERA-Solidity (the Solidity fork used by zksolc) only supports up to Solidity 0.8.30. " +
      "Newer versions use features not yet supported by the zkSync compiler pipeline.",
    fix:
      "Downgrade to Solidity 0.8.30 or lower:\n" +
      '  solc_version = "0.8.30"  # in foundry.toml',
    tags: ["compiler", "version", "solidity"],
  },

  {
    patterns: [
      /expect.*revert.*depth/i,
      /lower depth than cheatcode call depth/i,
      /allow_internal_expect_revert/i,
    ],
    title: "expectRevert depth mismatch in zkSync",
    explanation:
      "vm.expectRevert() fails because the EVM-to-zkEVM context switch during external calls " +
      "is treated as an internal call. Foundry's restriction on internal expect reverts " +
      "blocks this. This is a known incompatibility between EVM call depth semantics and zkEVM.",
    fix:
      "Add to foundry.toml:\n" +
      "  allow_internal_expect_revert = true\n\n" +
      "Or use an inline config annotation in the test:\n" +
      '  /// forge-config: default.allow_internal_expect_revert = true',
    tags: ["testing", "cheatcode", "expectRevert"],
  },

  {
    patterns: [
      /mockCall.*caller/i,
      /mock.*msg\.sender/i,
      /call may fail.*empty code/i,
    ],
    title: "mockCall limitations in zkSync",
    explanation:
      "vm.mockCall() does not work on the caller address itself in zkVM. " +
      "Also, the target account must have bytecode set before mocking — " +
      "mocking an address with no code will cause the call to revert.",
    fix:
      "1. Don't mock msg.sender — use a separate intermediary contract.\n" +
      "2. Call vm.etch(target, someBytes) before vm.mockCall(target, ...) " +
      "to ensure bytecode exists at the target address.",
    tags: ["testing", "cheatcode", "mockCall"],
  },

  {
    patterns: [
      /deep.*prank/i,
      /startPrank.*bool/i,
      /delegatecall.*prank/i,
    ],
    title: "Deep pranking not supported in zkSync",
    explanation:
      "The boolean flag on startPrank for deep pranking (pranking through nested calls) " +
      "does not work in zkSync context. The feature was disabled during the upstream sync " +
      "because it produced incorrect results in zkEVM.",
    fix:
      "Use regular vm.prank() or vm.startPrank() without the deep flag. " +
      "Restructure tests to avoid relying on prank propagation through nested calls.",
    tags: ["testing", "cheatcode", "prank"],
  },

  {
    patterns: [
      /immutables.*not set/i,
      /immutable.*EraVM/i,
      /ImmutableSimulator/i,
    ],
    title: "Immutable variables not migrated to EraVM",
    explanation:
      "When test contracts use immutable variables, the values are not properly migrated " +
      "to the EraVM context. The ImmutableSimulator slot assignment in zksolc is based on " +
      "assignment order (not declaration order), making migration non-trivial.",
    fix:
      "Avoid using immutable variables in test contracts that need to run in zkVM context. " +
      "Use regular storage variables or constructor parameters as alternatives in tests.",
    tags: ["testing", "immutable", "migration"],
  },

  {
    patterns: [
      /empty.*bytecode.*delegatecall/i,
      /non-inlineable.*library/i,
      /library.*revert.*test/i,
    ],
    title: "Non-inlineable libraries broken in zkSync tests",
    explanation:
      "Using a library directly in a test script causes execution to revert because the " +
      "bytecode at the delegatecall target address is empty in the zkSync context. " +
      "Libraries are linked differently in zkEVM.",
    fix:
      "Avoid direct library usage in test files. Call library functions through " +
      "a wrapper contract instead.",
    tags: ["testing", "library", "delegatecall"],
  },

  {
    patterns: [
      /not enough balance.*fee/i,
      /Account validation error/i,
      /NotEnoughBalance/i,
    ],
    title: "zkSync fee estimation mismatch",
    explanation:
      "forge script --zksync may incorrectly estimate fees, reporting 'Not enough balance " +
      "for fee + value' even with sufficient balance. The zkSync VM halts during simulation. " +
      "This has been fixed in recent versions but can still appear with complex scripts.",
    fix:
      "1. Update foundry-zksync to the latest version.\n" +
      "2. Try forge create --zksync instead of forge script as a workaround.\n" +
      "3. Ensure you're using --slow flag for sequential transaction execution.",
    tags: ["deployment", "script", "gas", "fee"],
  },

  {
    patterns: [
      /--slow/i,
      /transaction.*batch/i,
      /dependent.*transaction/i,
      /nonce.*mismatch/i,
    ],
    title: "ZK chains require --slow flag for scripts",
    explanation:
      "ZK chains do not support transaction batching. When scripts have dependent " +
      "transactions (where one tx depends on state from another), broadcasting fails " +
      "unless transactions are sent sequentially.",
    fix:
      "Always pass --slow when running scripts on zkSync:\n" +
      "  forge script script/Deploy.s.sol --zksync --broadcast --slow\n\n" +
      "This forces sequential transaction execution instead of batching.",
    tags: ["script", "deployment", "broadcast"],
  },

  {
    patterns: [
      /factory.dep/i,
      /factory_deps/i,
    ],
    title: "Factory dependencies must be declared",
    explanation:
      "zkSync requires all contract bytecodes (including libraries) to be pre-declared " +
      "as factory_deps during deployment. Unlike EVM where CREATE deploys inline bytecode, " +
      "zkSync's ContractDeployer system contract needs all bytecodes available upfront.",
    fix:
      "For forge script: factory deps are collected automatically.\n" +
      "For forge create: deploy library contracts first, then link at compile time.\n" +
      "The error 'Dynamic linking not supported in create command' means you need " +
      "to deploy libraries separately first.",
    tags: ["deployment", "factory_deps", "library"],
  },

  {
    patterns: [
      /Dynamic linking not supported/i,
      /deploy.*library.*first/i,
    ],
    title: "forge create doesn't support dynamic linking",
    explanation:
      "forge create --zksync cannot dynamically link libraries at deploy time. " +
      "You must deploy library contracts separately first, then provide their " +
      "addresses for compile-time linking.",
    fix:
      "1. Deploy each library contract individually with forge create.\n" +
      "2. Add library addresses to foundry.toml:\n" +
      "   [profile.default.libraries]\n" +
      '   src/MyLib.sol:MyLib = "0xDeployedAddress"\n' +
      "3. Recompile and deploy the main contract.\n" +
      "Or use forge script which handles factory deps automatically.",
    tags: ["deployment", "linking", "library"],
  },

  {
    patterns: [
      /Custom create scheme is not supported/i,
      /CREATE3/i,
    ],
    title: "Only CREATE and CREATE2 are supported",
    explanation:
      "zkSync only supports standard CREATE and CREATE2 via the ContractDeployer system contract. " +
      "Custom create schemes (like CREATE3) are not supported in foundry-zksync.",
    fix:
      "Use CREATE (new Contract()) or CREATE2 (with salt). " +
      "If you need CREATE3-like deterministic addresses, implement it using CREATE2 with a factory pattern.",
    tags: ["deployment", "create"],
  },

  {
    patterns: [
      /etherscan.*verif/i,
      /verifier.*url/i,
      /verify.*contract/i,
      /504.*Gateway/i,
    ],
    title: "zkSync contract verification setup",
    explanation:
      "zkSync has two verification pipelines with different requirements:\n" +
      "- Etherscan pipeline: requires API key, uses api-era.zksync.network\n" +
      "- ZkSync Explorer: no API key needed, uses explorer.zksync.io\n\n" +
      "A known issue causes forge script to attempt Etherscan calls even without " +
      "--verify flag, resulting in 504 timeouts that block deployments.",
    fix:
      "For Etherscan:\n" +
      "  --verifier etherscan --verifier-url https://api-era.zksync.network/api --etherscan-api-key KEY\n\n" +
      "For zkSync Explorer (no API key):\n" +
      "  --verifier zksync --verifier-url https://explorer.zksync.io/contract_verification\n\n" +
      "If deployments hang on Etherscan 504s, this is a known regression — " +
      "update foundry-zksync or use forge create instead of forge script.",
    tags: ["verification", "etherscan", "deployment"],
  },

  {
    patterns: [
      /MemoryLimitOOG/i,
      /memory.*limit.*out.*gas/i,
    ],
    title: "EraVM memory limit out of gas",
    explanation:
      "The EraVM ran out of gas due to memory allocation limits. The --memory-limits flag " +
      "may not be respected in all cases. This was fixed in recent versions.",
    fix: "Update foundry-zksync to the latest version. If persisting, try reducing " +
      "memory-intensive operations in the contract or test.",
    tags: ["gas", "memory", "eravm"],
  },

  {
    patterns: [
      /Invalid opcode/i,
      /unsupported.*opcode/i,
    ],
    title: "EVM opcode not supported in EraVM",
    explanation:
      "The compiled bytecode contains EVM opcodes that don't have EraVM equivalents. " +
      "EraVM is not byte-compatible with EVM — it uses a different instruction set.",
    fix:
      "Option 1: Use EVM interpreter mode (slower but compatible):\n" +
      "  forge test --zksync --zk-evm-interpreter\n" +
      "  or in foundry.toml: evm_interpreter = true\n\n" +
      "Option 2: Rewrite the code to avoid unsupported opcodes.",
    tags: ["eravm", "opcode", "compatibility"],
  },

  {
    patterns: [
      /gas_per_pubdata/i,
      /pubdata/i,
    ],
    title: "zkSync pubdata gas costs",
    explanation:
      "zkSync charges separately for computation gas and pubdata (data published to L1). " +
      "gas_per_pubdata_limit controls pubdata pricing. This is unique to zkSync — " +
      "EVM has no equivalent concept.",
    fix:
      "Use the estimateFee RPC to get the recommended gas_per_pubdata_limit. " +
      "Foundry does this automatically when the value is not specified. " +
      "If you see pubdata errors, the transaction's state diffs are too large for the gas budget.",
    tags: ["gas", "pubdata", "l1"],
  },

  {
    patterns: [
      /tx execution halted/i,
      /execution.*halted/i,
    ],
    title: "Transaction execution halted in zkSync VM",
    explanation:
      "The zkSync VM halted execution. This is a catch-all for various VM-level failures " +
      "including out of gas, unauthorized access, or invalid bytecode. " +
      "Check the specific reason in the error details.",
    fix:
      "Look at the halt reason in the error message. Common causes:\n" +
      "- Not enough gas: increase gas_limit\n" +
      "- Unauthorized: code tried to call system contracts directly\n" +
      "- Invalid bytecode: check compilation output\n" +
      "Run with higher verbosity (-vvvv) to get the full trace.",
    tags: ["eravm", "execution", "halt"],
  },

  {
    patterns: [
      /foundryup/i,
      /overwrit.*foundry/i,
      /vanilla.*foundry/i,
    ],
    title: "foundryup overwrites foundry-zksync",
    explanation:
      "Running the standard foundryup command replaces foundry-zksync with vanilla foundry. " +
      "Both use the same binary names (forge, cast, anvil) and install location. " +
      "This is the #1 developer experience issue with foundry-zksync.",
    fix:
      "Always use foundryup-zksync instead of foundryup:\n" +
      "  curl -L https://raw.githubusercontent.com/matter-labs/foundry-zksync/main/install-foundry-zksync | bash\n\n" +
      "If you accidentally ran foundryup, reinstall with foundryup-zksync.",
    tags: ["setup", "installation", "toolchain"],
  },

  {
    patterns: [
      /zksync.*config.*not found/i,
      /\[profile.*zksync\]/i,
      /startup.*true/i,
    ],
    title: "Missing zkSync section in foundry.toml",
    explanation:
      "forge init does not create the [profile.default.zksync] section automatically. " +
      "Without it, --zksync flag may not work correctly or use unexpected defaults.",
    fix:
      "Add to foundry.toml:\n\n" +
      "  [profile.default.zksync]\n" +
      "  compile = true\n" +
      "  startup = true\n\n" +
      "Optional settings:\n" +
      '  zksolc = "1.5.10"        # pin compiler version\n' +
      "  force_evmla = false       # use EVMLA codegen\n" +
      "  size_fallback = true      # retry with -Oz on size errors",
    tags: ["config", "setup", "foundry.toml"],
  },

  {
    patterns: [
      /zkout/i,
      /artifacts.*directory/i,
      /zksync.*artifacts/i,
    ],
    title: "zkSync uses zkout/ for artifacts (not out/)",
    explanation:
      "zkSync compiled artifacts go to zkout/ by default, not out/. " +
      "This is by design for coexistence with regular EVM builds.",
    fix:
      "Reference build artifacts from zkout/ when working with zkSync compilation. " +
      "Both out/ (EVM) and zkout/ (zkSync) can coexist.",
    tags: ["config", "artifacts", "build"],
  },

  {
    patterns: [
      /codegen/i,
      /evmla/i,
      /yul.*default/i,
    ],
    title: "Codegen migration: Yul → EVMLA",
    explanation:
      "The default codegen is migrating from Yul to EVMLA (EVM Legacy Assembly). " +
      "Yul produces more optimized but larger bytecode. EVMLA is closer to EVM/L1 behavior. " +
      "If you don't set codegen explicitly, your contract behavior may silently change between versions.",
    fix:
      "Explicitly set codegen in foundry.toml:\n" +
      "  [profile.default.zksync]\n" +
      "  force_evmla = true    # for EVM-compatible behavior\n" +
      "  # or omit for Yul (better optimization, larger bytecode)",
    tags: ["compiler", "codegen", "config"],
  },

  {
    patterns: [
      /blockhash.*0/i,
      /historical.*block.*hash/i,
    ],
    title: "Limited block hash history in zkSync",
    explanation:
      "EraVM doesn't have full historical block hash data like Ethereum. " +
      "blockhash(blockNumber) returns 0 for blocks outside the current batch.",
    fix:
      "Set the environment variable to cache historical hashes from the fork RPC:\n" +
      "  ZK_DEBUG_HISTORICAL_BLOCK_HASHES=5   # cache 5 past blocks\n\n" +
      "Or avoid relying on historical block hashes in contracts.",
    tags: ["fork", "rpc", "blockhash"],
  },

  {
    patterns: [
      /EvmError.*Revert.*fork/i,
      /view.*call.*fork.*fail/i,
      /evm.*zkvm.*view.*call/i,
    ],
    title: "EVM → zkVM view calls fail on forks",
    explanation:
      "During fork testing, view calls from an EVM-compiled contract to a zkVM-deployed " +
      "contract fail with EvmError: Revert. This is a known cross-context interop issue.",
    fix:
      "This was fixed in recent versions. Update foundry-zksync. " +
      "If still occurring, use cast call as a workaround for the specific view call.",
    tags: ["fork", "testing", "interop"],
  },

  {
    patterns: [
      /system.*contract/i,
      /reserved.*address/i,
      /address.*0x0000/i,
      /Unauthorized.*privileged/i,
    ],
    title: "Reserved system addresses in zkSync",
    explanation:
      "Addresses below 2^16 (0x10000) are reserved for zkSync system contracts. " +
      "Deploying to or interacting with these addresses from non-kernel code " +
      "causes 'Unauthorized privileged access' errors.",
    fix:
      "Never deploy to or assume control over addresses < 0x10000. " +
      "Use the provided system contract libraries for interacting with system functionality.",
    tags: ["address", "system", "security"],
  },

  {
    patterns: [
      /deployment.*nonce/i,
      /nonce.*split/i,
      /tx.*nonce.*deploy.*nonce/i,
    ],
    title: "zkSync has split nonces (TX + Deploy)",
    explanation:
      "zkSync uses two separate nonces per account: a transaction nonce and a deployment nonce. " +
      "Standard EVM uses a single nonce for both. vm.getNonce() returns only the TX nonce.",
    fix:
      "Be aware that CREATE address derivation uses the deployment nonce, not the TX nonce. " +
      "This can cause address prediction mismatches if you're computing expected deployment addresses.",
    tags: ["nonce", "deployment", "address"],
  },

  {
    patterns: [
      /forge coverage.*zksync/i,
      /coverage.*zkevm/i,
    ],
    title: "forge coverage uses EVM instead of zkEVM",
    explanation:
      "forge coverage --zksync silently falls back to the regular EVM instead of zkEVM. " +
      "Coverage data is collected against the wrong execution environment, producing incorrect results. " +
      "Full zkEVM coverage support is blocked on zksolc providing source maps.",
    fix:
      "There is no workaround. Coverage results with --zksync are unreliable. " +
      "Run coverage without --zksync to get EVM-based coverage (which may differ from zkEVM behavior).",
    tags: ["coverage", "testing", "unsupported"],
  },

  {
    patterns: [
      /forge debug.*zksync/i,
      /debugger.*zksync/i,
      /step.*through.*zk/i,
    ],
    title: "forge debug not supported for zkSync",
    explanation:
      "forge debug is completely unsupported for the zkSync VM. " +
      "You cannot step through contract execution or inspect variables in EraVM.",
    fix:
      "Use high verbosity flags (-vvvv or -vvvvv) with forge test to get detailed traces. " +
      "For transaction debugging, use cast run with the transaction hash on a forked network.",
    tags: ["debug", "unsupported"],
  },

  {
    patterns: [
      /gas.*information/i,
      /gas.*breakdown/i,
      /gas.*component/i,
    ],
    title: "Gas reporting is aggregate-only",
    explanation:
      "forge only shows a single aggregate gas value for zkSync transactions. " +
      "zkSync gas actually has four components: intrinsic costs, validation costs, " +
      "execution costs, and pubdata costs. These are not broken down in the output.",
    fix:
      "For detailed gas analysis, use the zkSync block explorer or RPC debug methods. " +
      "The aggregate gas value from forge is sufficient for basic comparison but not for optimization.",
    tags: ["gas", "reporting"],
  },

  {
    patterns: [
      /Vyper/i,
      /\.vy\b/i,
    ],
    title: "Vyper not supported in foundry-zksync",
    explanation: "Vyper compilation and verification are not supported in foundry-zksync.",
    fix: "Use Solidity for zkSync contracts compiled through foundry-zksync.",
    tags: ["compiler", "vyper", "unsupported"],
  },

  {
    patterns: [
      /discarding.*deployment nonce.*EVM/i,
      /context.*switch.*nonce/i,
    ],
    title: "Nonce discarded during VM context switch",
    explanation:
      "When switching from zkSync VM to EVM context in tests, the deployment nonce is discarded. " +
      "This can cause inconsistencies if tests rely on deploy addresses across context switches.",
    fix:
      "Avoid mixing EVM and zkVM deployment sequences in the same test. " +
      "If you need both, keep address tracking explicit rather than relying on nonce prediction.",
    tags: ["testing", "nonce", "context-switch"],
  },

  {
    patterns: [
      /deploy-time linking not supported/i,
      /minimum.*DEPLOY_TIME_LINKING/i,
    ],
    title: "zksolc version too old for deploy-time linking",
    explanation:
      "Deploy-time linking requires a minimum zksolc version. Older versions cannot link " +
      "library addresses at deploy time and require libraries to be deployed separately first.",
    fix:
      "Update zksolc to the minimum version shown in the error. " +
      "Set in foundry.toml:\n" +
      "  [profile.default.zksync]\n" +
      '  zksolc = "1.5.10"    # or whatever the minimum version is',
    tags: ["compiler", "linking", "version"],
  },

  {
    patterns: [
      /ETHERSCAN_API_KEY.*slow/i,
      /tests.*slow.*etherscan/i,
    ],
    title: "ETHERSCAN_API_KEY slows down tests",
    explanation:
      "Having ETHERSCAN_API_KEY set in your environment or .env file causes forge test to " +
      "take significantly longer (up to 10x). Forge attempts to resolve contract metadata " +
      "through Etherscan during test execution.",
    fix:
      "Unset ETHERSCAN_API_KEY when running tests:\n" +
      "  unset ETHERSCAN_API_KEY && forge test --zksync\n" +
      "Or use a .env.test file that omits the key.",
    tags: ["testing", "performance", "etherscan"],
  },

  {
    patterns: [
      /Write.*static.*context/i,
      /STATICCALL.*state.*modif/i,
    ],
    title: "State modification in static context",
    explanation:
      "A state-modifying call was made during a STATICCALL. This is also an EVM error " +
      "but manifests differently in EraVM. In zkSync, the context enforcement is stricter.",
    fix:
      "Ensure view/pure functions don't make state-modifying calls. " +
      "Check that you're not calling write operations from read-only contexts. " +
      "In tests, verify that cheatcodes aren't accidentally modifying state in view functions.",
    tags: ["eravm", "static", "revert"],
  },

  {
    patterns: [
      /Call stack full/i,
      /call.*depth.*limit/i,
    ],
    title: "EraVM call stack depth exceeded",
    explanation:
      "EraVM has a call depth limit related to BATCH_COMPUTATIONAL_GAS_LIMIT. " +
      "Deeply nested contract calls can hit this limit before running out of gas.",
    fix:
      "Refactor code to reduce call nesting depth. " +
      "Combine multiple small calls into fewer larger ones where possible.",
    tags: ["eravm", "callstack", "gas"],
  },

  {
    patterns: [
      /CREATE2.*collision/i,
      /address.*already.*occupied/i,
      /code.*already.*deployed/i,
      /create2.*revert/i,
      /deploy.*same.*address/i,
    ],
    title: "CREATE2 address collision",
    explanation:
      "A CREATE2 deployment reverted because there is already code at the computed address. " +
      "On zkSync, CREATE2 goes through the ContractDeployer system contract (0x...8006). " +
      "If bytecode already exists at the target address, the deploy fails. " +
      "This also happens if the same salt + bytecodeHash + sender combination is reused.",
    fix:
      "1. Use a different salt value for CREATE2.\n" +
      "2. If redeploying the same contract, destroy it first (if it has selfdestruct).\n" +
      "3. Check if the address is occupied before deploying:\n" +
      '   cast code <address> --rpc-url <rpc>\n' +
      "4. Remember: zkSync's CREATE2 address derivation differs from EVM — it uses " +
      "the zkSync-specific formula with bytecodeHash, not initcodeHash.",
    tags: ["deployment", "create2", "collision"],
  },

  {
    patterns: [
      /0x0{36}800[1-9a-f]/i,
      /0x0{36}801[0-9a-f]/i,
      /system.*contract.*address/i,
      /ContractDeployer/i,
      /NonceHolder/i,
      /AccountCodeStorage/i,
      /KnownCodesStorage/i,
      /ImmutableSimulator/i,
      /L2BaseToken/i,
      /L2EthToken/i,
      /MsgValueSimulator/i,
      /L1Messenger/i,
      /SystemContext/i,
    ],
    title: "zkSync system contract reference",
    explanation:
      "This involves a zkSync system contract. Key system contracts:\n" +
      "  0x...8001  AccountCodeStorage — maps addresses to code hashes\n" +
      "  0x...8002  NonceHolder — manages tx + deploy nonces\n" +
      "  0x...8003  KnownCodesStorage — registry of known bytecodes\n" +
      "  0x...8004  ImmutableSimulator — immutable variable storage\n" +
      "  0x...8005  ContractDeployer — handles all CREATE/CREATE2\n" +
      "  0x...8006  SystemContext — block/tx context\n" +
      "  0x...800b  L2BaseToken — native ETH balances\n" +
      "  0x...800d  MsgValueSimulator — msg.value transfers\n" +
      "  0x...8010  L1Messenger — L2→L1 messages",
    fix:
      "System contracts are called implicitly by the protocol. " +
      "Do NOT call them directly from user code unless you know exactly what you're doing. " +
      "Use the Solidity libraries provided by zkSync (e.g. SystemContractsCaller) for safe interaction.",
    tags: ["address", "system", "reference"],
  },

  {
    patterns: [
      /0x7109709ECfa91a80626fF3989D68f67F5b1DD12D/i,
      /cheatcode.*address/i,
      /vm.*address/i,
    ],
    title: "Foundry cheatcode address",
    explanation:
      "0x7109709ECfa91a80626fF3989D68f67F5b1DD12D is the Foundry VM cheatcode address. " +
      "All vm.* calls (prank, expectRevert, deal, etc.) are dispatched to this address. " +
      "The Cheatcodes inspector intercepts calls here before they reach the EVM/EraVM.",
    fix: "This is not an error — it's the standard cheatcode dispatch address used by Foundry.",
    tags: ["address", "cheatcode", "testing"],
  },

  {
    patterns: [
      /0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496/i,
      /default.*test.*address/i,
      /default.*sender.*test/i,
    ],
    title: "Default test contract address",
    explanation:
      "0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496 is the default msg.sender in Foundry tests. " +
      "This is the address of the test runner contract.",
    fix: "If you need a different sender, use vm.prank() or vm.startPrank() to override.",
    tags: ["address", "testing"],
  },

  {
    patterns: [
      /LLVM.*error/i,
      /llvm.*compilation/i,
      /zksolc.*LLVM/i,
      /compilation.*failed.*llvm/i,
    ],
    title: "LLVM backend error in zksolc",
    explanation:
      "zksolc uses an LLVM backend to compile Solidity to EraVM bytecode. " +
      "LLVM errors typically indicate code patterns the compiler cannot handle, " +
      "such as deeply nested inline assembly, unusual control flow, or features " +
      "not yet implemented in the zkSync LLVM backend.",
    fix:
      "1. Simplify inline assembly blocks — zksolc has limited Yul/assembly support.\n" +
      "2. Try force_evmla = true in foundry.toml to use EVMLA codegen instead of Yul.\n" +
      "3. Update zksolc — newer versions fix many LLVM backend issues.\n" +
      "4. If the error is in a dependency, check if a zkSync-compatible version exists.",
    tags: ["compiler", "llvm", "zksolc"],
  },

  {
    patterns: [
      /EIP-?712/i,
      /type.*hash.*mismatch/i,
      /0x71.*transaction/i,
    ],
    title: "EIP-712 transaction type on zkSync",
    explanation:
      "zkSync uses EIP-712 type 0x71 transactions for deploying contracts with factory_deps. " +
      "These transactions have a different structure from standard EVM transactions. " +
      "Type hash mismatches typically occur when constructing transactions manually " +
      "or when middleware doesn't support zkSync transaction types.",
    fix:
      "Use forge script --zksync or forge create --zksync to construct transactions properly. " +
      "If building transactions manually, use the zkSync SDK or ensure you're constructing " +
      "EIP-712 type 0x71 transactions with the correct factory_deps field.",
    tags: ["transaction", "eip712", "deployment"],
  },

  {
    patterns: [
      /anvil.*zksync/i,
      /era.*test.*node/i,
      /local.*zk.*node/i,
      /in-memory.*node/i,
    ],
    title: "anvil-zksync local development node",
    explanation:
      "anvil-zksync is the local zkSync development node (replacement for era-test-node). " +
      "It runs an in-memory zkSync node for testing. Default port is 8011 (not 8545 like anvil). " +
      "It supports forking from mainnet/testnet.",
    fix:
      "Start with: anvil-zksync\n" +
      "Fork mainnet: anvil-zksync --fork-url https://mainnet.era.zksync.io\n" +
      "Default RPC: http://127.0.0.1:8011\n\n" +
      "Make sure you installed via foundryup-zksync, not foundryup.",
    tags: ["anvil", "local", "testing"],
  },

  {
    patterns: [
      /assemblycreate/i,
      /suppressed.*warning/i,
      /assembly.*CREATE.*not.*supported/i,
    ],
    title: "Assembly CREATE not supported warning",
    explanation:
      "zksolc warns about inline assembly CREATE/CREATE2 usage because these opcodes " +
      "don't work the same way on EraVM. All deployments must go through the " +
      "ContractDeployer system contract. Libraries like OpenZeppelin that use " +
      "assembly for CREATE trigger this warning.",
    fix:
      "Suppress benign warnings in foundry.toml:\n" +
      '  [profile.default.zksync]\n' +
      '  suppressed_warnings = ["assemblycreate"]\n\n' +
      "If the warning is for your own code, use new Contract() syntax instead of assembly CREATE.",
    tags: ["compiler", "assembly", "warning"],
  },

  {
    patterns: [
      /missing.*library/i,
      /unresolved.*library/i,
      /library.*not.*found/i,
      /linking.*error/i,
    ],
    title: "Unresolved library linking",
    explanation:
      "The contract references a library that hasn't been linked. In zkSync, libraries " +
      "that can't be inlined must be deployed as separate contracts and linked at compile time " +
      "by providing their deployed addresses in foundry.toml.",
    fix:
      "1. Deploy the library: forge create --zksync src/MyLib.sol:MyLib ...\n" +
      "2. Add to foundry.toml:\n" +
      "   [profile.default.libraries]\n" +
      '   src/MyLib.sol:MyLib = "0xDeployedLibAddress"\n' +
      "3. Recompile the main contract.",
    tags: ["compiler", "library", "linking"],
  },

  {
    patterns: [
      /selfdestruct/i,
      /SELFDESTRUCT.*deprecated/i,
    ],
    title: "SELFDESTRUCT not supported on zkSync",
    explanation:
      "EraVM does not support the SELFDESTRUCT opcode. It was deprecated in EVM " +
      "(EIP-6780) and never implemented in zkSync Era. Contracts using selfdestruct " +
      "will fail compilation with zksolc or revert at runtime.",
    fix:
      "Remove selfdestruct from contract logic. Use a disable/pause pattern instead " +
      "if you need to deactivate a contract.",
    tags: ["eravm", "opcode", "selfdestruct"],
  },

  {
    patterns: [
      /EXTCODECOPY/i,
      /extcodecopy.*not.*supported/i,
    ],
    title: "EXTCODECOPY not supported on zkSync",
    explanation:
      "EraVM does not support EXTCODECOPY. On zkSync, contract code is stored as hashes " +
      "in AccountCodeStorage, not as raw bytecode accessible via EXTCODECOPY.",
    fix:
      "Use EXTCODEHASH instead if you need to verify contract identity. " +
      "For code retrieval, query the RPC with eth_getCode.",
    tags: ["eravm", "opcode", "extcodecopy"],
  },

  {
    patterns: [
      /vm\.deal.*zksync/i,
      /deal.*not.*work/i,
      /balance.*cheatcode/i,
    ],
    title: "vm.deal works differently on zkSync",
    explanation:
      "vm.deal() on zkSync modifies the L2BaseToken (0x...800b) balance mapping, " +
      "not the account's ETH balance directly. In some contexts, this can cause " +
      "inconsistencies between the reported balance and the actual spendable amount.",
    fix:
      "Use vm.deal() as normal — it should work in most test scenarios. " +
      "If you see balance inconsistencies, try using the L2BaseToken interface directly " +
      "or send actual ETH from a funded account instead.",
    tags: ["testing", "cheatcode", "deal"],
  },

  {
    patterns: [
      /fee.*too.*low/i,
      /max.*fee.*per.*gas/i,
      /gas.*price.*too.*low/i,
      /underpriced/i,
    ],
    title: "Transaction fee too low",
    explanation:
      "The gas price or max fee per gas is below the network minimum. " +
      "zkSync has a dynamic fee model where minimum gas price depends on L1 gas prices " +
      "and network congestion.",
    fix:
      "Let forge estimate the gas price automatically (don't set --gas-price manually). " +
      "If you must set it, query the current gas price first:\n" +
      "  cast gas-price --rpc-url <rpc_url>",
    tags: ["gas", "fee", "transaction"],
  },
];

export function matchKnowledge(rawText: string): KnowledgeEntry[] {
  return knowledgeBase.filter((entry) =>
    entry.patterns.some((pattern) => pattern.test(rawText)),
  );
}

export function formatKnowledgeMatches(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return "";

  return entries
    .map(
      (e, i) =>
        `--- Matched Issue ${i + 1}: ${e.title} ---\n\n` +
        `WHAT'S HAPPENING:\n${e.explanation}\n\n` +
        `HOW TO FIX:\n${e.fix}`,
    )
    .join("\n\n");
}
