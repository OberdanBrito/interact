import { state } from "./state.js";
import { $ } from "./utils.js";
import { getPostById } from "./data.js";
import { markReadPersist } from "./session.js";
import { syncPostUI } from "./interactions.js";

const AUTO_READ_DWELL_MS = 3000;

export function cancelAutoRead() {
  clearTimeout(state.sheetDwellTimer);
  state.sheetDwellTimer = null;
}

export function tryAutoMarkRead() {
  const postId = state.sheetPostId;
  if (!postId || $("#sheet").hidden) return;
  const post = getPostById(postId);
  if (!post || post.readMode === "ack") return;
  if (markReadPersist(postId)) syncPostUI(postId);
  cancelAutoRead();
}

/* Chamado pelo sheet após popular o corpo do post. Texto que cabe
   inteiro na tela marca na abertura; texto longo depende do dwell
   ou do scroll até o fim. */
export function scheduleAutoRead() {
  cancelAutoRead();
  const body = $(".sheet-body");
  const fitsWithoutScroll = body.scrollHeight <= body.clientHeight;
  state.sheetDwellTimer = setTimeout(
    tryAutoMarkRead,
    fitsWithoutScroll ? 0 : AUTO_READ_DWELL_MS
  );
}

export function handleSheetScroll() {
  const body = $(".sheet-body");
  const scrollable = body.scrollHeight > body.clientHeight;
  const atEnd =
    body.scrollTop + body.clientHeight >= body.scrollHeight - 12;
  if (scrollable && atEnd) tryAutoMarkRead();
}
