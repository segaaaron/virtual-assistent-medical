// Jerarquia de errores. Define como reacciona cada capa (retry vs respuesta vs fatal).
export class AppError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

// Esperado, se mapea a una respuesta amable al usuario.
export class DomainError extends AppError {}

// Falla de integracion externa (WA/OpenAI/Chatwoot) -> el worker reintenta/backoff.
export class IntegrationError extends AppError {}

// Config rota al boot -> fatal.
export class ConfigError extends AppError {}
