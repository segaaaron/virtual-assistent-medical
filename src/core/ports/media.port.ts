// Procesa media entrante: audio -> transcripcion, imagen -> descripcion (sin diagnosticar).
export interface MediaPort {
  transcribeAudio(mediaId: string): Promise<string>;
  describeImage(mediaId: string): Promise<string>;
}
