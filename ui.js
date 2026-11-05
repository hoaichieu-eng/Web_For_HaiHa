"use strict";

// Chế độ xem mặc định giữ các công cụ ảnh gọn lại.
(() => {
  const toggle = document.getElementById("edit-toggle");
  toggle.addEventListener("click", () => {
    const editing = document.body.classList.toggle("is-editing");
    toggle.setAttribute("aria-pressed", String(editing));
    toggle.textContent = editing ? "Xong chỉnh sửa" : "Chỉnh sửa";
  });

  const more = document.getElementById("mobile-more");
  document.addEventListener("click", (event) => {
    if (!more.contains(event.target) || event.target.closest("a")) more.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && more.open) {
      more.open = false;
      more.querySelector("summary").focus();
    }
  });
  window.matchMedia("(max-width: 760px)").addEventListener("change", () => { more.open = false; });

  // Dùng cùng nguồn ảnh của album, kể cả ảnh đồng bộ từ thiết bị khác.
  const container = document.querySelector(".album-photos");
  const boxes = [...document.querySelectorAll(".album-box")];
  let revision = 0;
  boxes.forEach((box) => {
    const preview = document.createElement("span");
    preview.className = "album-cover-stack";
    preview.setAttribute("aria-hidden", "true");
    box.prepend(preview);
    const hint = document.createElement("span");
    hint.className = "album-box-open";
    hint.textContent = "Mở album ↗";
    hint.setAttribute("aria-hidden", "true");
    box.append(hint);
  });

  async function refreshCovers() {
    const current = ++revision;
    await Promise.all(boxes.map(async (box) => {
      const photos = [...container.querySelectorAll(".album-photo")]
        .filter((photo) => photo.dataset.album === box.dataset.album);
      // Ưu tiên kỷ niệm thật, dùng ảnh mẫu khi chưa có ảnh tải lên.
      photos.sort((a, b) => Number(Boolean(b.dataset.cloudPath)) - Number(Boolean(a.dataset.cloudPath)));
      const urls = await Promise.all(photos.slice(0, 3).map(async (photo) => {
        try {
          return photo.dataset.cloudPath
            ? await window.appCloud.imageUrl(photo.dataset.cloudPath)
            : photo.querySelector("img").getAttribute("src");
        } catch {
          return null;
        }
      }));
      if (current !== revision) return;
      const preview = box.querySelector(".album-cover-stack");
      const sources = urls.filter(Boolean);
      // Giữ nguyên ảnh đã tải nếu dữ liệu đồng bộ không đổi.
      if (JSON.stringify(sources) !== preview.dataset.sources) {
        preview.dataset.sources = JSON.stringify(sources);
        preview.replaceChildren(...sources.map((url) => {
          const image = document.createElement("img");
          image.alt = "";
          image.loading = "lazy";
          image.decoding = "async";
          image.addEventListener("error", () => {
            image.remove();
            box.classList.toggle("has-cover", Boolean(preview.childElementCount));
          });
          image.src = url;
          return image;
        }));
      }
      box.classList.toggle("has-cover", Boolean(preview.childElementCount));
    }));
  }
  new MutationObserver(refreshCovers).observe(container, {
    childList: true, subtree: true, attributes: true, attributeFilter: ["src", "data-cloud-path"],
  });
  refreshCovers();
  window.addEventListener("focus", refreshCovers);
})();
