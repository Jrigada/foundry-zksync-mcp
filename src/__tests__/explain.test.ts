import { describe, it, expect } from "vitest";
import { explain, explainSchema } from "../tools/explain.js";

describe("explainSchema", () => {
  it("accepts rawText only", () => {
    const result = explainSchema.safeParse({ rawText: "some error" });
    expect(result.success).toBe(true);
  });

  it("accepts rawText with context", () => {
    const result = explainSchema.safeParse({
      rawText: "some error",
      context: "error",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid context value", () => {
    const result = explainSchema.safeParse({
      rawText: "some error",
      context: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing rawText", () => {
    const result = explainSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("explain tool", () => {
  it("returns general context for context=general", async () => {
    const result = await explain({ rawText: "what is foundry-zksync?" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("foundry-zksync");
    expect(result.output).toContain("upstream");
    expect(result.output).toContain("System Contract Addresses");
  });

  it("matches known error patterns", async () => {
    const result = await explain({
      rawText: "BytecodeLengthInWordsIsEven",
      context: "error",
    });
    expect(result.success).toBe(true);
    expect(result.output).toContain("WHAT'S HAPPENING:");
    expect(result.output).toContain("HOW TO FIX:");
    expect(result.output).toContain("32 bytes");
  });

  it("includes address reference when input contains addresses", async () => {
    const result = await explain({
      rawText: "call to 0x0000000000000000000000000000000000008005 failed",
      context: "error",
    });
    expect(result.success).toBe(true);
    expect(result.output).toContain("ContractDeployer");
    expect(result.output).toContain("System Contract Addresses");
  });

  it("does not include address reference for non-address text", async () => {
    const result = await explain({
      rawText: "compilation failed with some error",
      context: "error",
    });
    expect(result.success).toBe(true);
    expect(result.output).not.toContain("System Contract Addresses");
  });

  it("includes original text in output", async () => {
    const input = "forge test --zksync failed with weird error XYZ123";
    const result = await explain({ rawText: input, context: "log" });
    expect(result.success).toBe(true);
    expect(result.output).toContain(input);
    expect(result.output).toContain("[log]");
  });

  it("defaults context to general", async () => {
    const result = await explain({ rawText: "tell me about foundry-zksync" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("[general]");
    expect(result.output.toLowerCase()).toContain("strategy pattern");
  });

  it("matches multiple patterns at once", async () => {
    const result = await explain({
      rawText:
        "Not enough balance for fee + value, tried --slow but still failing with factory_deps error",
      context: "error",
    });
    expect(result.success).toBe(true);
    // Should match fee, --slow, and factory_deps entries
    expect(result.output).toContain("Matched Issue 1:");
    expect(result.output).toContain("Matched Issue 2:");
  });
});
