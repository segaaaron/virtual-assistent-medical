import { describe, it, expect } from "vitest";
import { createFamiliarAgent } from "../../src/roles/familiar/index.js";
import { env } from "../../src/config/env.js";
import { makeFakes, noopLog } from "../helpers/fakes.js";

describe("flujo FAMILIAR", () => {
  it("relaya el mensaje a la Dra y confirma al familiar", async () => {
    const f = makeFakes();
    await createFamiliarAgent(f.deps).handle(
      { waId: "w", from: "59160000000", text: "dile a la doctora que la llamo", timestamp: 0 } as never,
      noopLog,
    );
    expect(f.sent.some((s) => s.to === env.DOCTORA_PHONE && s.text.includes("dile a la doctora"))).toBe(true);
    expect(f.sent.some((s) => s.to === "59160000000")).toBe(true);
  });
});
