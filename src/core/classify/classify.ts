import type { LlmPort } from "@core/ports/llm.port.js";

export type TriageRole = "paciente" | "visitador" | "otro";

// Clasificador NARROW: solo para contactos unknown. Una sola responsabilidad.
// Nunca promueve a roles privilegiados (doctora/familiar son allow-list aparte).
export async function classifyUnknown(llm: LlmPort, text: string): Promise<{ role: TriageRole; confidence: number }> {
  const system =
    "Clasifica el mensaje de un contacto nuevo de un consultorio de medicina estetica en UNA categoria: " +
    "'paciente' (consulta tratamientos, precios, citas), 'visitador' (representante de laboratorio que quiere visitar a la doctora), " +
    "'otro' (no encaja). Responde SOLO JSON: {\"role\":\"paciente|visitador|otro\",\"confidence\":0..1}.";
  const res = await llm.chat(
    [
      { role: "system", content: system },
      { role: "user", content: text },
    ],
    [],
  );
  try {
    const raw = (res.text ?? "{}").replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(raw) as { role?: string; confidence?: number };
    const role: TriageRole = parsed.role === "paciente" || parsed.role === "visitador" ? parsed.role : "otro";
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;
    return { role, confidence };
  } catch {
    return { role: "otro", confidence: 0 };
  }
}
