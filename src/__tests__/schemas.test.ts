import { describe, it, expect } from "vitest";
import { compileSchema } from "../tools/compile.js";
import { testSchema } from "../tools/test.js";
import { runScriptSchema } from "../tools/run_script.js";
import { deploySchema } from "../tools/deploy.js";
import { castAbiEncodeSchema } from "../tools/cast_abi_encode.js";
import { castAbiDecodeSchema } from "../tools/cast_abi_decode.js";
import { castCalldataDecodeSchema } from "../tools/cast_calldata_decode.js";
import { castCallSchema } from "../tools/cast_call.js";
import { castSendSchema } from "../tools/cast_send.js";
import { castBalanceSchema } from "../tools/cast_balance.js";
import { castNonceSchema } from "../tools/cast_nonce.js";
import { initSchema } from "../tools/init.js";
import { verifySchema } from "../tools/verify.js";
import { readFoundryTomlSchema } from "../tools/read_foundry_toml.js";
import { gasReportSchema } from "../tools/gas_report.js";
import { snapshotSchema } from "../tools/snapshot.js";
import { anvilZkSyncSchema } from "../tools/anvil_zksync.js";

describe("compileSchema", () => {
  it("accepts valid input", () => {
    const result = compileSchema.safeParse({ projectPath: "/home/user/project" });
    expect(result.success).toBe(true);
  });

  it("rejects missing projectPath", () => {
    const result = compileSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("testSchema", () => {
  it("accepts projectPath only", () => {
    const result = testSchema.safeParse({ projectPath: "/project" });
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = testSchema.safeParse({
      projectPath: "/project",
      filter: "testDeposit",
      contractFilter: "DepositTest",
      verbosity: 3,
    });
    expect(result.success).toBe(true);
  });

  it("rejects verbosity > 5", () => {
    const result = testSchema.safeParse({
      projectPath: "/project",
      verbosity: 6,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative verbosity", () => {
    const result = testSchema.safeParse({
      projectPath: "/project",
      verbosity: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer verbosity", () => {
    const result = testSchema.safeParse({
      projectPath: "/project",
      verbosity: 2.5,
    });
    expect(result.success).toBe(false);
  });
});

describe("runScriptSchema", () => {
  it("accepts required fields", () => {
    const result = runScriptSchema.safeParse({
      projectPath: "/project",
      scriptPath: "script/Deploy.s.sol",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = runScriptSchema.safeParse({
      projectPath: "/project",
      scriptPath: "script/Deploy.s.sol",
      rpcUrl: "https://mainnet.era.zksync.io",
      broadcast: true,
      privateKey: "0xabc",
      extraArgs: ["--verify", "--etherscan-api-key", "key123"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects extraArgs as string (must be array)", () => {
    const result = runScriptSchema.safeParse({
      projectPath: "/project",
      scriptPath: "script/Deploy.s.sol",
      extraArgs: "--verify",
    });
    expect(result.success).toBe(false);
  });
});

describe("deploySchema", () => {
  it("accepts required fields with privateKey", () => {
    const result = deploySchema.safeParse({
      projectPath: "/project",
      contractPath: "src/Token.sol:Token",
      rpcUrl: "https://mainnet.era.zksync.io",
      privateKey: "0xabc",
    });
    expect(result.success).toBe(true);
  });

  it("accepts keystore instead of privateKey", () => {
    const result = deploySchema.safeParse({
      projectPath: "/project",
      contractPath: "src/Token.sol:Token",
      rpcUrl: "https://mainnet.era.zksync.io",
      keystore: "/path/to/keystore.json",
      keystorePassword: "pass",
    });
    expect(result.success).toBe(true);
  });

  it("accepts constructorArgs as string array", () => {
    const result = deploySchema.safeParse({
      projectPath: "/project",
      contractPath: "src/Token.sol:Token",
      rpcUrl: "https://mainnet.era.zksync.io",
      privateKey: "0xabc",
      constructorArgs: ["0x1234", "1000000", "MyToken"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts verification flags", () => {
    const result = deploySchema.safeParse({
      projectPath: "/project",
      contractPath: "src/Token.sol:Token",
      rpcUrl: "https://mainnet.era.zksync.io",
      privateKey: "0xabc",
      verify: true,
      verifierUrl: "https://api-era.zksync.network/api",
    });
    expect(result.success).toBe(true);
  });
});

describe("castAbiEncodeSchema", () => {
  it("accepts signature and args", () => {
    const result = castAbiEncodeSchema.safeParse({
      signature: "constructor(address,uint256)",
      args: ["0x1234567890abcdef1234567890abcdef12345678", "1000"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing args", () => {
    const result = castAbiEncodeSchema.safeParse({
      signature: "transfer(address,uint256)",
    });
    expect(result.success).toBe(false);
  });
});

describe("castAbiDecodeSchema", () => {
  it("accepts signature and data", () => {
    const result = castAbiDecodeSchema.safeParse({
      signature: "balanceOf(address)(uint256)",
      data: "0x000000000000000000000000000000000000000000000000000000000000002a",
    });
    expect(result.success).toBe(true);
  });

  it("accepts input flag", () => {
    const result = castAbiDecodeSchema.safeParse({
      signature: "transfer(address,uint256)",
      data: "0xabcd",
      input: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("castCalldataDecodeSchema", () => {
  it("accepts signature and calldata", () => {
    const result = castCalldataDecodeSchema.safeParse({
      signature: "transfer(address,uint256)",
      calldata: "0xa9059cbb0000000000000000000000000000000000000000",
    });
    expect(result.success).toBe(true);
  });
});

describe("castCallSchema", () => {
  it("accepts required fields", () => {
    const result = castCallSchema.safeParse({
      to: "0x1234567890abcdef1234567890abcdef12345678",
      signature: "balanceOf(address)(uint256)",
      rpcUrl: "https://mainnet.era.zksync.io",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional args and blockTag", () => {
    const result = castCallSchema.safeParse({
      to: "0x1234",
      signature: "balanceOf(address)(uint256)",
      rpcUrl: "https://mainnet.era.zksync.io",
      args: ["0xabcd"],
      blockTag: "latest",
    });
    expect(result.success).toBe(true);
  });
});

describe("castSendSchema", () => {
  it("accepts required fields with privateKey", () => {
    const result = castSendSchema.safeParse({
      to: "0x1234",
      signature: "transfer(address,uint256)",
      rpcUrl: "https://mainnet.era.zksync.io",
      privateKey: "0xabc",
    });
    expect(result.success).toBe(true);
  });

  it("accepts value and gasLimit", () => {
    const result = castSendSchema.safeParse({
      to: "0x1234",
      signature: "deposit()",
      rpcUrl: "https://mainnet.era.zksync.io",
      privateKey: "0xabc",
      value: "0.1ether",
      gasLimit: "100000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts keystore signing", () => {
    const result = castSendSchema.safeParse({
      to: "0x1234",
      signature: "transfer(address,uint256)",
      rpcUrl: "https://mainnet.era.zksync.io",
      keystore: "/path/to/keystore.json",
    });
    expect(result.success).toBe(true);
  });
});

describe("castBalanceSchema", () => {
  it("accepts required fields", () => {
    const result = castBalanceSchema.safeParse({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      rpcUrl: "https://mainnet.era.zksync.io",
    });
    expect(result.success).toBe(true);
  });

  it("accepts ether flag and blockTag", () => {
    const result = castBalanceSchema.safeParse({
      address: "0x1234",
      rpcUrl: "https://mainnet.era.zksync.io",
      ether: true,
      blockTag: "latest",
    });
    expect(result.success).toBe(true);
  });
});

describe("castNonceSchema", () => {
  it("accepts required fields", () => {
    const result = castNonceSchema.safeParse({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      rpcUrl: "https://mainnet.era.zksync.io",
    });
    expect(result.success).toBe(true);
  });

  it("accepts blockTag", () => {
    const result = castNonceSchema.safeParse({
      address: "0x1234",
      rpcUrl: "https://mainnet.era.zksync.io",
      blockTag: "pending",
    });
    expect(result.success).toBe(true);
  });
});

describe("initSchema", () => {
  it("accepts projectPath only", () => {
    const result = initSchema.safeParse({ projectPath: "/tmp/new-project" });
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = initSchema.safeParse({
      projectPath: "/tmp",
      name: "my-project",
      noGit: true,
      template: "PaulRBerg/foundry-template",
    });
    expect(result.success).toBe(true);
  });
});

describe("verifySchema", () => {
  it("accepts etherscan verifier", () => {
    const result = verifySchema.safeParse({
      projectPath: "/project",
      contractAddress: "0x1234567890abcdef1234567890abcdef12345678",
      contractPath: "src/Token.sol:Token",
      verifier: "etherscan",
      verifierUrl: "https://api-era.zksync.network/api",
      etherscanApiKey: "KEY123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts zksync verifier", () => {
    const result = verifySchema.safeParse({
      projectPath: "/project",
      contractAddress: "0x1234",
      contractPath: "src/Token.sol:Token",
      verifier: "zksync",
      verifierUrl: "https://explorer.zksync.io/contract_verification",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid verifier", () => {
    const result = verifySchema.safeParse({
      projectPath: "/project",
      contractAddress: "0x1234",
      contractPath: "src/Token.sol:Token",
      verifier: "blockscout",
      verifierUrl: "https://example.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("readFoundryTomlSchema", () => {
  it("accepts projectPath", () => {
    const result = readFoundryTomlSchema.safeParse({ projectPath: "/project" });
    expect(result.success).toBe(true);
  });
});

describe("gasReportSchema", () => {
  it("accepts projectPath only", () => {
    const result = gasReportSchema.safeParse({ projectPath: "/project" });
    expect(result.success).toBe(true);
  });

  it("accepts filters", () => {
    const result = gasReportSchema.safeParse({
      projectPath: "/project",
      filter: "testTransfer",
      contractFilter: "Token",
    });
    expect(result.success).toBe(true);
  });
});

describe("snapshotSchema", () => {
  it("accepts projectPath only", () => {
    const result = snapshotSchema.safeParse({ projectPath: "/project" });
    expect(result.success).toBe(true);
  });

  it("accepts diff and check flags", () => {
    const result = snapshotSchema.safeParse({
      projectPath: "/project",
      diff: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("anvilZkSyncSchema", () => {
  it("accepts check action", () => {
    const result = anvilZkSyncSchema.safeParse({ action: "check" });
    expect(result.success).toBe(true);
  });

  it("accepts start with fork options", () => {
    const result = anvilZkSyncSchema.safeParse({
      action: "start",
      port: 8012,
      forkUrl: "https://mainnet.era.zksync.io",
      forkBlockNumber: 1000000,
      accounts: 5,
      balance: 100,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid action", () => {
    const result = anvilZkSyncSchema.safeParse({ action: "stop" });
    expect(result.success).toBe(false);
  });
});
