/* Cache offline de posts no IndexedDB via Dexie.
   Permite ler o feed sem conexão: quando o fetch falha, o app
   cai para os posts salvos na última sincronização bem-sucedida. */

import Dexie from "dexie";

const DB_NAME = "interact-cache";
const DB_VERSION = 1;

const db = new Dexie(DB_NAME);

db.version(DB_VERSION).stores({
  // Tabela única de posts visíveis, chave primária = id do comunicado.
  posts: "id",
});

// Grava/atualiza um lote de posts no cache (substitui por id).
export async function cachePosts(posts) {
  if (!Array.isArray(posts) || posts.length === 0) return;
  try {
    await db.posts.bulkPut(posts);
  } catch (err) {
    console.error("Erro ao gravar cache de posts:", err.message);
  }
}

// Lê todos os posts cacheados.
export async function getCachedPosts() {
  try {
    return await db.posts.toArray();
  } catch (err) {
    console.error("Erro ao ler cache de posts:", err.message);
    return [];
  }
}

// Lê um post específico do cache por id (para o bottom sheet offline).
export async function getCachedPost(id) {
  try {
    return (await db.posts.get(id)) ?? null;
  } catch (err) {
    console.error("Erro ao ler post do cache:", err.message);
    return null;
  }
}

export async function removeCachedPost(id) {
  try {
    await db.posts.delete(id);
  } catch (err) {
    console.error("Erro ao remover post do cache:", err.message);
  }
}

// Limpa todo o cache (usado no logout para não vazar dados entre usuários).
export async function clearCache() {
  try {
    await db.posts.clear();
  } catch (err) {
    console.error("Erro ao limpar cache de posts:", err.message);
  }
}
