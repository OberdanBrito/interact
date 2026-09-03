import { syncInteraction } from "./posts.js";
import { syncQueueKey, storageGet, storageSet } from "../core/utils.js";

const QUEUE_KEY = syncQueueKey();
let flushing = false;

function readQueue() {
  return storageGet(QUEUE_KEY, []);
}

function writeQueue(queue) {
  storageSet(QUEUE_KEY, queue);
}

export function enqueue(postId, event) {
  const queue = readQueue();
  const index = queue.findIndex((e) => e.postId === postId);
  if (index === -1) queue.push({ postId, ...event, ts: Date.now() });
  else queue[index] = { postId, ...event, ts: Date.now() };
  writeQueue(queue);
}

export async function flush() {
  if (flushing) return;
  flushing = true;
  try {
    const queue = readQueue();
    while (queue.length > 0) {
      const head = queue[0];
      const ok = await syncInteraction(head.postId, {
        liked: head.liked,
        read: head.read,
      });
      if (!ok) break;
      queue.splice(0, 1);
      writeQueue(queue);
    }
  } finally {
    flushing = false;
  }
}

export function pendingCount() {
  return readQueue().length;
}

export function syncNow() {
  if (pendingCount() > 0) flush();
}

