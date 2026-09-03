import { getToken } from "./posts.js";
import { getApiBase } from "../core/tenant.js";

const POLL_INTERVAL_MS = 60000;
const MAX_SSE_FAILURES = 3;

let source = null;
let failureCount = 0;
let pollTimer = null;
let pollFallback = null;

const handlers = new Map();
const attached = new Set();

function dispatch(name, payload) {
  const set = handlers.get(name);
  if (set) for (const cb of [...set]) cb(payload);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    if (typeof pollFallback === "function") pollFallback();
  }, POLL_INTERVAL_MS);
}

function attach(name) {
  if (!source || attached.has(name) || name.startsWith("__")) return;
  attached.add(name);
  source.addEventListener(name, (e) => {
    let payload = e.data;
    try {
      payload = JSON.parse(e.data);
    } catch {
      /* payload não-JSON — repassa a string */
    }
    dispatch(name, payload);
  });
}

// Abre a conexão SSE autenticada (?token= — EventSource não envia header).
// A reconexão após queda é nativa do EventSource; `onOpen` para o fallback.
export function connect(onPoll) {
  pollFallback = onPoll || null;
  const token = getToken();
  if (!token) return;
  try {
    source?.close();
  } catch {
    /* já fechado */
  }
  attached.clear();
  source = new EventSource(`${getApiBase()}/api/events?token=${token}`);
  source.onopen = () => {
    failureCount = 0;
    stopPolling();
    dispatch("__open");
  };
  source.onerror = () => {
    failureCount += 1;
    if (failureCount >= MAX_SSE_FAILURES) startPolling();
    dispatch("__error");
  };
  for (const name of handlers.keys()) attach(name);
}

// Assina um evento nomeado (ex.: "post:new"). Reutilizável pela I-14 (admin).
export function on(eventName, cb) {
  if (!handlers.has(eventName)) handlers.set(eventName, new Set());
  handlers.get(eventName).add(cb);
  attach(eventName);
}

export function disconnect() {
  stopPolling();
  try {
    source?.close();
  } catch {
    /* já fechado */
  }
  source = null;
  attached.clear();
  failureCount = 0;
}
