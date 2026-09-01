import { EventEmitter } from "node:events";

// Nomes de evento do feed (I-07). O nome é o contrato usado pelo cliente
// para assinar via EventSource (ex.: `addEventListener("post:new", ...)`).
export const EVENTS = {
  POST_NEW: "post:new",
  POST_UPDATED: "post:updated",
  POST_EXPIRED: "post:expired",
};

// Sinal interno de broadcast para o transporte SSE. O endpoint /api/events
// escuta só este sinal e o repassa com o nome do evento original, o que torna
// o canal genérico: qualquer evento emitido via `emitSafe` (incluindo os que a
// I-14 adicionar, ex.: `interaction:changed`) flui pelo mesmo endpoint.
export const EMIT_STREAM = "__stream__";

// Singleton — vários clientes SSE escutam o mesmo emitter.
export const emitter = new EventEmitter();
emitter.setMaxListeners(0); // N cliente conectados; não avisa sobre listener.

// Emissão "fire-and-forget": nunca quebra a mutação que a originou.
// Emite no emitter (para listeners em processo) e no sinal de stream (para o
// transporte SSE), ignorando qualquer erro de um cliente desconectado.
export function emitSafe(event, payload) {
  try {
    emitter.emit(event, payload);
    emitter.emit(EMIT_STREAM, event, payload);
  } catch (err) {
    console.error(`Erro ao emitir evento ${event}:`, err.message);
  }
}
