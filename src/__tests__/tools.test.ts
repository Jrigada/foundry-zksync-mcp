import { describe, it, expect } from "vitest";
import { deploy } from "../tools/deploy.js";
import { castSend } from "../tools/cast_send.js";

// These tests verify the application-level validation that runs
// BEFORE any CLI command is spawned. No forge/cast needed.

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
