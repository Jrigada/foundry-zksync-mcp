import { describe, it, expect } from "vitest";
import { deploy } from "../tools/deploy.js";
import { castSend } from "../tools/cast_send.js";
import { readFoundryToml } from "../tools/read_foundry_toml.js";
import { anvilZkSync } from "../tools/anvil_zksync.js";
import { buildWalletArgs, hasSigningMethod } from "../tools/shared.js";

describe("deploy validation", () => {
  it("rejects when no signing method is provided", async () => {
    const result = await deploy({
      projectPath: "/tmp/nonexistent",
      contractPath: "src/Token.sol:Token",
      rpcUrl: "https://localhost:8545",
    });
    expect(result.success).toBe(false);
    expect(result.output).toContain("No signing method");
    expect(result.output).toContain("account");
    expect(result.output).toContain("keystore");
    expect(result.output).toContain("ledger");
  });
});

describe("castSend validation", () => {
  it("rejects when no signing method is provided", async () => {
    const result = await castSend({
      to: "0x1234",
      signature: "transfer(address,uint256)",
      rpcUrl: "https://localhost:8545",
    });
    expect(result.success).toBe(false);
    expect(result.output).toContain("No signing method");
  });
});

describe("readFoundryToml", () => {
  it("returns error for missing foundry.toml", async () => {
    const result = await readFoundryToml({
      projectPath: "/tmp/definitely-not-a-foundry-project-" + Date.now(),
    });
    expect(result.success).toBe(false);
    expect(result.output).toContain("No foundry.toml found");
  });
});

describe("anvilZkSync check", () => {
  it("reports not running when no node is active", async () => {
    const result = await anvilZkSync({
      action: "check",
      port: 59999,
    });
    expect(result.success).toBe(false);
    expect(result.output).toContain("No response");
  });
});

describe("buildWalletArgs", () => {
  it("builds --account flag", () => {
    const args = buildWalletArgs({ account: "deployer" });
    expect(args).toEqual(["--account", "deployer"]);
  });

  it("builds --keystore with --password-file", () => {
    const args = buildWalletArgs({
      keystore: "/path/to/key.json",
      passwordFile: "/path/to/pass",
    });
    expect(args).toEqual(["--keystore", "/path/to/key.json", "--password-file", "/path/to/pass"]);
  });

  it("prefers --password-file over --password", () => {
    const args = buildWalletArgs({
      keystore: "/path/to/key.json",
      passwordFile: "/path/to/pass",
      keystorePassword: "should-be-ignored",
    });
    expect(args).not.toContain("--password");
    expect(args).toContain("--password-file");
  });

  it("builds --unlocked with --from", () => {
    const args = buildWalletArgs({ unlocked: true, from: "0xabc" });
    expect(args).toEqual(["--unlocked", "--from", "0xabc"]);
  });

  it("builds --ledger flag", () => {
    const args = buildWalletArgs({ ledger: true });
    expect(args).toEqual(["--ledger"]);
  });

  it("builds --aws flag", () => {
    const args = buildWalletArgs({ aws: true });
    expect(args).toEqual(["--aws"]);
  });

  it("returns empty for no wallet input", () => {
    const args = buildWalletArgs({});
    expect(args).toEqual([]);
  });
});

describe("hasSigningMethod", () => {
  it("returns false for empty input", () => {
    expect(hasSigningMethod({})).toBe(false);
  });

  it("returns true for account", () => {
    expect(hasSigningMethod({ account: "deployer" })).toBe(true);
  });

  it("returns true for keystore", () => {
    expect(hasSigningMethod({ keystore: "/path" })).toBe(true);
  });

  it("returns true for unlocked", () => {
    expect(hasSigningMethod({ unlocked: true })).toBe(true);
  });

  it("returns true for ledger", () => {
    expect(hasSigningMethod({ ledger: true })).toBe(true);
  });

  it("returns true for aws", () => {
    expect(hasSigningMethod({ aws: true })).toBe(true);
  });
});
