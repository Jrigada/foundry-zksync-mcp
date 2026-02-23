import { describe, it, expect } from "vitest";
import { getZkSyncDocs, getZkSyncDocsSchema } from "../tools/get_zksync_docs.js";

describe("getZkSyncDocsSchema", () => {
  it("accepts a topic string", () => {
    const result = getZkSyncDocsSchema.safeParse({ topic: "testing" });
    expect(result.success).toBe(true);
  });

  it("rejects missing topic", () => {
    const result = getZkSyncDocsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("getZkSyncDocs tool", () => {
  it("returns URL for exact topic match", async () => {
    const result = await getZkSyncDocs({ topic: "cheatcodes" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("foundry-book.zksync.io");
    expect(result.output).toContain("cheatcodes");
  });

  it("lists all topics with topic=list", async () => {
    const result = await getZkSyncDocs({ topic: "list" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("getting-started");
    expect(result.output).toContain("cheatcodes");
    expect(result.output).toContain("deployment");
    expect(result.output).toContain("nonces");
    expect(result.output).toContain("factory-deps");
  });

  it("handles case-insensitive topics", async () => {
    const result = await getZkSyncDocs({ topic: "CHEATCODES" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("foundry-book.zksync.io");
  });

  it("returns fuzzy matches for partial topics", async () => {
    const result = await getZkSyncDocs({ topic: "forge" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("Related topics");
    expect(result.output).toContain("forge-build");
    expect(result.output).toContain("forge-test");
  });

  it("returns error for completely unknown topic", async () => {
    const result = await getZkSyncDocs({ topic: "xyznonexistent" });
    expect(result.success).toBe(false);
    expect(result.output).toContain("No documentation found");
  });

  it("returns URL for zksync-config", async () => {
    const result = await getZkSyncDocs({ topic: "zksync-config" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("config");
  });

  it("returns URL for verification", async () => {
    const result = await getZkSyncDocs({ topic: "verification" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("verification");
  });
});
