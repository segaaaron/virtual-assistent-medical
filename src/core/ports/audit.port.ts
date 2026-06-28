// Bitacora de auditoria (contexto medico: rastreabilidad de acciones criticas).
export interface AuditPort {
  log(event: string, data: Record<string, unknown>): Promise<void>;
}
