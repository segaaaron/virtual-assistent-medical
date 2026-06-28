import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { verifySignature, safeEqual } from "../../src/webhook/signature.js";

describe("signature", () => {
  const secret = "s3cr3t";
  const body = Buffer.from(JSON.stringify({ a: 1 }));
  const good = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");

  it("acepta firma valida", () => {
    expect(verifySignature(body, good, secret)).toBe(true);
  });
  it("rechaza firma invalida", () => {
    expect(verifySignature(body, "sha256=deadbeef", secret)).toBe(false);
  });
  it("rechaza firma ausente", () => {
    expect(verifySignature(body, undefined, secret)).toBe(false);
  });
  it("safeEqual compara en tiempo constante", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "ab")).toBe(false);
  });
});
