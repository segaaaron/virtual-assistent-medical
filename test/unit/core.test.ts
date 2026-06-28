import { describe, it, expect } from "vitest";
import { resolveRole } from "../../src/core/routing/resolveRole.js";
import { runAgentLoop } from "../../src/core/agent/runAgentLoop.js";
import { classifyUnknown } from "../../src/core/classify/classify.js";
import { maskPhone } from "../../src/shared/pii.js";

const store = (o: { allow?: string; saved?: string; pat?: boolean }) =>
  ({
    inAllowlist: async () => o.allow ?? null,
    getRole: async () => o.saved ?? null,
    isPatient: async () => o.pat ?? false,
    setRole: async () => {},
  }) as never;

describe("resolveRole (determinístico)", () => {
  it("allow-list gana", async () => expect(await resolveRole("x" as never, store({ allow: "doctora" }))).toBe("doctora"));
  it("rol guardado (sticky)", async () => expect(await resolveRole("x" as never, store({ saved: "visitador" }))).toBe("visitador"));
  it("paciente por DB", async () => expect(await resolveRole("x" as never, store({ pat: true }))).toBe("paciente"));
  it("unknown por defecto", async () => expect(await resolveRole("x" as never, store({}))).toBe("unknown"));
});

describe("runAgentLoop", () => {
  it("ejecuta tool y luego devuelve texto final", async () => {
    let calls = 0;
    let executed = false;
    const llm = {
      chat: async () => {
        calls++;
        return calls === 1 ? { toolCalls: [{ id: "1", name: "foo", arguments: { a: 1 } }] } : { text: "final" };
      },
    } as never;
    const r = await runAgentLoop({
      llm,
      system: "s",
      history: [],
      userText: "u",
      tools: [],
      execute: async () => {
        executed = true;
        return { ok: true };
      },
    });
    expect(r).toBe("final");
    expect(executed).toBe(true);
  });
});

describe("classifyUnknown", () => {
  const llm = (t: string) => ({ chat: async () => ({ text: t }) }) as never;
  it("json directo", async () => expect((await classifyUnknown(llm('{"role":"paciente","confidence":0.9}'), "x")).role).toBe("paciente"));
  it("json con fences", async () =>
    expect((await classifyUnknown(llm('```json\n{"role":"visitador","confidence":0.7}\n```'), "x")).role).toBe("visitador"));
  it("basura -> otro (default-deny)", async () => expect((await classifyUnknown(llm("basura"), "x")).role).toBe("otro"));
});

describe("maskPhone", () => {
  it("enmascara", () => expect(maskPhone("59100000000")).toBe("591***00"));
});
