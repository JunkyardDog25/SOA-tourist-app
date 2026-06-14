import { api } from "../api.js";
import { escapeHtml, formatDateTime, getUserFromToken, showError } from "../utils.js";

let initialized = false;
let selectedBlogId = null;

export function initBlogPage() {
  if (!initialized) {
    initialized = true;
    document.getElementById("btn-reload-blogs").addEventListener("click", loadBlogs);
    document.getElementById("blog-create-form").addEventListener("submit", createBlog);
    document.getElementById("btn-back-blogs").addEventListener("click", () => {
      selectedBlogId = null;
      document.getElementById("blog-detail").classList.add("hidden");
      document.getElementById("blog-list-wrap").classList.remove("hidden");
    });
    document.getElementById("comment-form").addEventListener("submit", addComment);
    document.getElementById("btn-like-blog").addEventListener("click", () => toggleLike(true));
    document.getElementById("btn-unlike-blog").addEventListener("click", () => toggleLike(false));
  }
  loadBlogs();
}

async function loadBlogs() {
  const errEl = document.getElementById("blog-error");
  const listEl = document.getElementById("blogs-list");
  showError(errEl, "");
  listEl.innerHTML = "<li class='loading'>Učitavanje...</li>";

  try {
    const blogs = await api.getBlogs();
    if (!blogs.length) {
      listEl.innerHTML = "<li class='empty'>Nema blogova.</li>";
      return;
    }

    listEl.innerHTML = blogs
      .map(
        (b) => `
      <li class="list-row clickable" data-id="${b.id}">
        <div>
          <strong>${escapeHtml(b.title)}</strong>
          <p class="meta">${escapeHtml(b.authorEmail || b.authorId)} · ${formatDateTime(b.creationDate)} · ${b.likeCount} lajkova</p>
        </div>
      </li>`,
      )
      .join("");

    listEl.querySelectorAll(".clickable").forEach((row) => {
      row.addEventListener("click", () => openBlog(row.dataset.id));
    });
  } catch (err) {
    showError(errEl, err.message);
    listEl.innerHTML = "";
  }
}

async function createBlog(e) {
  e.preventDefault();
  const errEl = document.getElementById("blog-create-error");
  showError(errEl, "");
  const urls = document
    .getElementById("blog-images")
    .value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    await api.createBlog({
      title: document.getElementById("blog-title").value.trim(),
      description: document.getElementById("blog-desc").value.trim(),
      imageUrls: urls,
    });
    document.getElementById("blog-create-form").reset();
    await loadBlogs();
  } catch (err) {
    showError(errEl, err.message);
  }
}

async function openBlog(blogId) {
  selectedBlogId = blogId;
  const errEl = document.getElementById("blog-error");
  showError(errEl, "");

  try {
    const blog = await api.getBlog(blogId);
    document.getElementById("blog-list-wrap").classList.add("hidden");
    document.getElementById("blog-detail").classList.remove("hidden");
    document.getElementById("blog-detail-title").textContent = blog.title;
    document.getElementById("blog-detail-body").innerHTML = `
      <p>${escapeHtml(blog.description)}</p>
      <p class="meta">Autor: ${escapeHtml(blog.authorEmail || blog.authorId)} · ${formatDateTime(blog.creationDate)} · ${blog.likeCount} lajkova</p>
      ${blog.imageUrls?.length ? `<p class="meta">Slike: ${blog.imageUrls.map(escapeHtml).join(", ")}</p>` : ""}
    `;

    const commentsEl = document.getElementById("blog-comments");
    commentsEl.innerHTML = (blog.comments || [])
      .map(
        (c) => `
      <li class="comment-item" data-id="${c.id}">
        <p>${escapeHtml(c.text)}</p>
        <p class="meta">${escapeHtml(c.authorEmail || c.authorId)} · ${formatDateTime(c.createdAt)}</p>
        ${
          (getUserFromToken()?.userId === c.authorId)
            ? `<button type="button" class="btn ghost btn-sm btn-edit-comment" data-id="${c.id}">Izmeni</button>`
            : ""
        }
      </li>`,
      )
      .join("");

    commentsEl.querySelectorAll(".btn-edit-comment").forEach((btn) => {
      btn.addEventListener("click", () => editComment(btn.dataset.id));
    });
  } catch (err) {
    showError(errEl, err.message);
  }
}

async function addComment(e) {
  e.preventDefault();
  if (!selectedBlogId) return;
  const errEl = document.getElementById("comment-error");
  showError(errEl, "");
  try {
    await api.addComment(selectedBlogId, {
      text: document.getElementById("comment-text").value.trim(),
    });
    document.getElementById("comment-text").value = "";
    await openBlog(selectedBlogId);
  } catch (err) {
    showError(errEl, err.message);
  }
}

async function editComment(commentId) {
  const text = prompt("Novi tekst komentara:");
  if (!text?.trim()) return;
  try {
    await api.updateComment(selectedBlogId, commentId, { text: text.trim() });
    await openBlog(selectedBlogId);
  } catch (err) {
    alert(err.message);
  }
}

async function toggleLike(like) {
  if (!selectedBlogId) return;
  try {
    if (like) await api.likeBlog(selectedBlogId);
    else await api.unlikeBlog(selectedBlogId);
    await openBlog(selectedBlogId);
  } catch (err) {
    alert(err.message);
  }
}
