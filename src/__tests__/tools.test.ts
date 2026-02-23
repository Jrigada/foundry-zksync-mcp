import { describe, it, expect } from "vitest";
import { deploy } from "../tools/deploy.js";
import { castSend } from "../tools/cast_send.js";
import { readFoundryToml } from "../tools/read_foundry_toml.js";
import { anvilZkSync } from "../tools/anvil_zksync.js";

describe("deploy validation", () => {
  it("rejects when neither privateKey nor keystore is provided", async () => {
    const result = await deploy({
      projectPath: "/tmp/nonexistent",
      contractPath: "src/Token.sol:Token",
      rpcUrl: "https://localhost:8545",
    });
    expect(result.success).toBe(false);
    expect(result.output).toContain("privateKey or keystore");
  });
});

describe("castSend validation", () => {
  it("rejects when neither privateKey nor keystore is provided", async () => {
    const result = await castSend({
      to: "0x1234",
      signature: "transfer(address,uint256)",
      rpcUrl: "https://localhost:8545",
    });
    expect(result.success).toBe(false);
    expect(result.output).toContain("privateKey or keystore");
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
