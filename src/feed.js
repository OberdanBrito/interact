import { state } from "./state.js";
import { $ } from "./utils.js";
import { getCategories, getPosts } from "./data.js";
import { getUserData } from "./session.js";
import { postCardHTML } from "./templates.js";

export function resetFilter() {
  state.filter = "todas";
}

function visiblePosts() {
  const posts = getPosts();
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

export function renderFeed() {
  const list = $("#post-list");
  const empty = $("#empty-state");
  const userData = getUserData();
  const posts = visiblePosts();

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
