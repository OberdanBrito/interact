import { state } from "../../core/state.js";
import { $ } from "../../core/utils.js";
import { getCategories, getPosts } from "../../data/posts.js";
import { getUserData } from "../auth/session.js";
import { postCardHTML } from "./templates.js";

export function resetFilter() {
  state.filter = "todas";
}

async function visiblePosts() {
  const posts = await getPosts();
  if (state.filter === "todas") return posts;
  return posts.filter((post) => post.categoryId === state.filter);
}

export function renderChips() {
  const container = $("#chips");
  container.innerHTML = "";
  for (const cat of getCategories()) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = cat.label;
    chip.dataset.catId = cat.id;
    chip.setAttribute("aria-pressed", String(state.filter === cat.id));
    chip.addEventListener("click", () => {
      state.filter = cat.id;
      renderChips();
      renderFeed();
    });
    container.appendChild(chip);
  }
}

export async function renderFeed() {
  const list = $("#post-list");
  const empty = $("#empty-state");
  const userData = getUserData();
  const posts = await visiblePosts();

  empty.hidden = posts.length > 0;
  list.innerHTML = posts
    .map((post) =>
      postCardHTML(post, {
        liked: userData.likes.includes(post.id),
        read: userData.read.includes(post.id),
      })
    )
    .join("");
}
