import { describe, expect, test } from "bun:test";
import {
  decodeBatchexecuteResponse,
  encodeBatchexecuteRequest,
  extractCsrfToken,
} from "@/lib/notebooklm/batchexecute";
import { rpcArgs } from "@/lib/notebooklm/rpc-catalog";
import { generateSapisidHash } from "@/lib/notebooklm/client";

describe("batchexecute codec", () => {
  test("encodes the double-JSON envelope", () => {
    const form = encodeBatchexecuteRequest("wXbhsf", [], "tok");
    expect(form.at).toBe("tok");
    expect(form["f.req"]).toBe('[[["wXbhsf","[]",null,"generic"]]]');
  });

  test("decodes an anti-XSSI chunked response", () => {
    const payload = JSON.stringify([["nb_123", "Quantum Computing", []]]);
    const chunk = JSON.stringify([["wrb.fr", "wXbhsf", payload, null, null, null, "generic"]]);
    const results = decodeBatchexecuteResponse(`)]}'\n128\n${chunk}\n`);
    expect(results).toHaveLength(1);
    expect(results[0].rpcId).toBe("wXbhsf");
    expect((results[0].data as string[][])[0][0]).toBe("nb_123");
  });

  test("ignores garbage and extracts the CSRF token", () => {
    expect(decodeBatchexecuteResponse(")]}'\nnot json\n42\n")).toEqual([]);
    expect(extractCsrfToken('x"SNlM0e":"abc:123"y')).toBe("abc:123");
  });
});

describe("rpc catalog", () => {
  test("maps documented RPC ids and payloads", () => {
    expect(rpcArgs.addUrlSource("n", "https://a.b", "T")).toEqual([
      "n",
      null,
      [["https://a.b", "T", 1]],
    ]);
    expect(rpcArgs.createArtifact("n", 5, { prompt: "p" })).toEqual(["n", 5, [null, "p", null, []]]);
  });

  test("SAPISIDHASH is deterministic for a fixed clock", () => {
    const h = generateSapisidHash("sid", "https://notebooklm.google.com", 1000);
    expect(h).toMatch(/^SAPISIDHASH 1000_[0-9a-f]{40}$/);
  });
});
