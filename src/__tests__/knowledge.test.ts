import { describe, it, expect } from "vitest";
import {
  knowledgeBase,
  matchKnowledge,
  formatKnowledgeMatches,
  foundryZkSyncContext,
  zkSyncAddresses,
} from "../knowledge.js";

describe("knowledgeBase integrity", () => {
  it("has entries", () => {
    expect(knowledgeBase.length).toBeGreaterThan(0);
  });

  it("every entry has required fields", () => {
    for (const entry of knowledgeBase) {
      expect(entry.patterns.length).toBeGreaterThan(0);
      expect(entry.title).toBeTruthy();
      expect(entry.explanation).toBeTruthy();
      expect(entry.fix).toBeTruthy();
      expect(entry.tags.length).toBeGreaterThan(0);
    }
  });

  it("every pattern is a valid RegExp", () => {
    for (const entry of knowledgeBase) {
      for (const pattern of entry.patterns) {
        expect(pattern).toBeInstanceOf(RegExp);
      }
    }
  });

  it("no duplicate titles", () => {
    const titles = knowledgeBase.map((e) => e.title);
    const unique = new Set(titles);
    expect(unique.size).toBe(titles.length);
  });
});

describe("matchKnowledge", () => {
  it("matches BytecodeLengthInWordsIsEven error", () => {
    const matches = matchKnowledge(
      "panic: invalid bytecode: BytecodeLengthInWordsIsEven",
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].title).toContain("bytecode alignment");
  });

  it("matches expectRevert depth error", () => {
    const matches = matchKnowledge(
      "call didn't revert at a lower depth than cheatcode call depth",
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].title).toContain("expectRevert");
  });

  it("matches --slow requirement", () => {
    const matches = matchKnowledge(
      "transactions failed, try using --slow flag",
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.tags.includes("broadcast"))).toBe(true);
  });

  it("matches Not enough balance for fee error", () => {
    const matches = matchKnowledge(
      "Account validation error: Not enough balance for fee + value",
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.tags.includes("fee"))).toBe(true);
  });

  it("matches foundryup overwrite warning", () => {
    const matches = matchKnowledge("I ran foundryup and now forge --zksync doesn't work");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].title).toContain("foundryup");
  });

  it("matches CREATE2 collision", () => {
    const matches = matchKnowledge("CREATE2 collision at address, code already deployed");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.tags.includes("create2"))).toBe(true);
  });

  it("matches ContractDeployer system contract", () => {
    const matches = matchKnowledge("call to ContractDeployer failed");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.tags.includes("system"))).toBe(true);
  });

  it("matches system contract address pattern", () => {
    const matches = matchKnowledge(
      "call to 0x0000000000000000000000000000000000008005 reverted",
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it("matches factory_deps", () => {
    const matches = matchKnowledge("missing factory_deps for library contract");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("matches dynamic linking error", () => {
    const matches = matchKnowledge(
      "Dynamic linking not supported in `create` command",
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.tags.includes("linking"))).toBe(true);
  });

  it("matches coverage limitation", () => {
    const matches = matchKnowledge("forge coverage --zksync shows wrong results");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("matches debug limitation", () => {
    const matches = matchKnowledge("how to use forge debug with zksync");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("matches Invalid opcode", () => {
    const matches = matchKnowledge("Invalid opcode encountered during execution");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.tags.includes("eravm"))).toBe(true);
  });

  it("matches MemoryLimitOOG", () => {
    const matches = matchKnowledge("MemoryLimitOOG");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("matches codegen yul/evmla", () => {
    const matches = matchKnowledge("should I use evmla or yul codegen");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("matches Vyper unsupported", () => {
    const matches = matchKnowledge("can I use Vyper with foundry-zksync");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("matches cheatcode address", () => {
    const matches = matchKnowledge(
      "0x7109709ECfa91a80626fF3989D68f67F5b1DD12D",
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].title).toContain("cheatcode address");
  });

  it("returns empty array for unrelated text", () => {
    const matches = matchKnowledge("hello world this is a normal message");
    expect(matches).toHaveLength(0);
  });
});

describe("formatKnowledgeMatches", () => {
  it("returns empty string for no matches", () => {
    expect(formatKnowledgeMatches([])).toBe("");
  });

  it("formats single match with title, explanation, and fix", () => {
    const matches = matchKnowledge("BytecodeLengthInWordsIsEven");
    const formatted = formatKnowledgeMatches(matches);
    expect(formatted).toContain("Matched Issue 1:");
    expect(formatted).toContain("WHAT'S HAPPENING:");
    expect(formatted).toContain("HOW TO FIX:");
  });

  it("formats multiple matches with numbered headers", () => {
    // This should match both fee and --slow entries
    const matches = matchKnowledge(
      "Not enough balance for fee, try using --slow for transaction batch",
    );
    expect(matches.length).toBeGreaterThanOrEqual(2);
    const formatted = formatKnowledgeMatches(matches);
    expect(formatted).toContain("Matched Issue 1:");
    expect(formatted).toContain("Matched Issue 2:");
  });
});

describe("static context strings", () => {
  it("foundryZkSyncContext mentions key concepts", () => {
    const ctx = foundryZkSyncContext.toLowerCase();
    expect(ctx).toContain("foundry-zksync");
    expect(ctx).toContain("upstream");
    expect(ctx).toContain("strategy pattern");
    expect(ctx).toContain("dual compilation");
    expect(ctx).toContain("eravm");
    expect(ctx).toContain("foundryup-zksync");
    expect(ctx).toContain("0.8.30");
  });

  it("zkSyncAddresses includes key system contracts", () => {
    expect(zkSyncAddresses).toContain("ContractDeployer");
    expect(zkSyncAddresses).toContain("NonceHolder");
    expect(zkSyncAddresses).toContain("AccountCodeStorage");
    expect(zkSyncAddresses).toContain("L2BaseToken");
    expect(zkSyncAddresses).toContain("ImmutableSimulator");
    expect(zkSyncAddresses).toContain("8005");
    expect(zkSyncAddresses).toContain("8002");
  });

  it("zkSyncAddresses includes Foundry test addresses", () => {
    expect(zkSyncAddresses).toContain("7109709ECfa91a80626fF3989D68f67F5b1DD12D");
    expect(zkSyncAddresses).toContain("7FA9385bE102ac3EAc297483Dd6233D62b3e1496");
  });
});
