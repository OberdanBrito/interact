/* Cache offline de posts no IndexedDB via Dexie, isolado por tenant (MT-26):
   o nome do banco inclui o slug do tenant e é aberto de forma lazy. */

import Dexie from "dexie";
import { getTenantSlug } from "../core/tenant.js";

let db = null;

function getDb() {
  const slug = getTenantSlug();
  const name = `interact-cache-${slug}`;
  if (db && db.name === name) return db;
  if (db) db.close();
  db = new Dexie(name);
  db.version(1).stores({
    posts: "id",
  });
  return db;
}

// Grava/atualiza um lote de posts no cache (substitui por id).
export async function cachePosts(posts) {
  if (!Array.isArray(posts) || posts.length === 0) return;
  try {
    await getDb().posts.bulkPut(posts);
  } catch (err) {
    console.error("Erro ao gravar cache de posts:", err.message);
  }
}

// Lê todos os posts cacheados.
export async function getCachedPosts() {
  try {
    return await getDb().posts.toArray();
  } catch (err) {
    console.error("Erro ao ler cache de posts:", err.message);
    return [];
  }
}

// Lê um post específico do cache por id (para o bottom sheet offline).
export async function getCachedPost(id) {
  try {
    return (await getDb().posts.get(id)) ?? null;
  } catch (err) {
    console.error("Erro ao ler post do cache:", err.message);
    return null;
  }
}

export async function removeCachedPost(id) {
  try {
    await getDb().posts.delete(id);
  } catch (err) {
    console.error("Erro ao remover post do cache:", err.message);
  }
}

// Limpa todo o cache (usado no logout para não vazar dados entre usuários).
export async function clearCache() {
  try {
    await getDb().posts.clear();
  } catch (err) {
    console.error("Erro ao limpar cache de posts:", err.message);
  }
}
