// Control de pausa del bot (handoff a humano / silencio por contacto o global).
export interface ControlPort {
  isPaused(phone: string): Promise<boolean>; // true si el contacto o GLOBAL estan pausados
  pause(scope: string): Promise<void>; // scope = numero o 'GLOBAL'
  resume(scope: string): Promise<void>;
}
