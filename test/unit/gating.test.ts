import { describe, it, expect } from "vitest";
import { isGated } from "../../src/core/routing/gating.js";
import type { Phone } from "../../src/core/types/role.js";

const ph = (s: string) => s as Phone;
const cfg = { enabled: true, doctoraPhone: "59100000000", testPhones: ["59176944986"] };

describe("isGated (#QA-1 gating)", () => {
  it("gating ON: numero desconocido -> bloqueado", () => {
    expect(isGated(ph("59170000000"), cfg)).toBe(true);
  });

  it("gating ON: doctora -> permitido", () => {
    expect(isGated(ph("59100000000"), cfg)).toBe(false);
  });

  it("gating ON: numero de prueba -> permitido", () => {
    expect(isGated(ph("59176944986"), cfg)).toBe(false);
  });

  it("gating ON: normaliza no-digitos al comparar", () => {
    expect(isGated(ph("+591 76944986"), { ...cfg, testPhones: ["59176944986"] })).toBe(false);
    expect(isGated(ph("59176944986"), { ...cfg, doctoraPhone: "+591-00000000", testPhones: [] })).toBe(true);
  });

  it("gating OFF: cualquier numero -> permitido", () => {
    expect(isGated(ph("59170000000"), { ...cfg, enabled: false })).toBe(false);
  });

  it("gating ON sin testPhones: solo doctora pasa", () => {
    expect(isGated(ph("59176944986"), { ...cfg, testPhones: [] })).toBe(true);
    expect(isGated(ph("59100000000"), { ...cfg, testPhones: [] })).toBe(false);
  });
});
