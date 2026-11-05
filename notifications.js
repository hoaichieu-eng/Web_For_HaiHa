"use strict";

(() => {
  const toggle = document.getElementById("notification-toggle");
  const dialog = document.getElementById("notification-dialog");
  const badge = document.getElementById("notification-badge");
  const list = document.getElementById("notification-list");
  const message = document.getElementById("notification-message");
  const markRead = document.getElementById("notification-read");
  const loadMore = document.getElementById("notification-load");
  let items = [];
  let revision = 0;
  let readPending = false;
  let session = 0;
  let latestActivityId = null;

  function describe(key) {
    const sections = {
      "entertainment:movies": ["danh sách phim", "entertainment"],
      "entertainment:songs": ["những bài hát yêu thích", "entertainment"],
      "entertainment:foods": ["những món ăn yêu thích", "entertainment"],
      "entertainment:sports": ["các hoạt động yêu thích", "entertainment"],
      "love-shared-dreams": ["ước mơ của chúng mình", "dreams"],
      "love-dream-balloons": ["những quả bóng ước mơ", "dreams"],
      "album:outing": ["album ảnh đi chơi", "album"],
      "album:cute": ["album ảnh cute", "album"],
      "album:funny": ["album ảnh dìm", "album"],
      "album:removed-samples": ["ảnh mẫu trong album", "album"],
      "image:hero": ["ảnh bìa", "home"],
      "image:profile:me": ["ảnh hồ sơ", "profiles"],
      "image:profile:her": ["ảnh hồ sơ", "profiles"],
    };
    if (key.startsWith("image:story:")) return ["ảnh trong câu chuyện", "story"];
    if (key.startsWith("rating:")) return ["điểm đánh giá trải nghiệm", "entertainment"];
    return sections[key] || ["nội dung của trang", "home"];
  }

  function render(unread) {
    badge.hidden = unread === 0;
    badge.textContent = unread > 99 ? "99+" : String(unread);
    toggle.setAttribute("aria-label", unread ? `Thông báo, ${unread} chưa đọc` : "Thông báo");
    markRead.disabled = unread === 0 || readPending;
    list.replaceChildren(...items.map((item) => {
      const row = document.createElement("li");
      row.className = item.read ? "notification-item" : "notification-item is-unread";
      const link = document.createElement("a");
      const [subject, section] = describe(item.key);
      const action = { added: "thêm nội dung vào", deleted: "xóa nội dung trong", updated: "cập nhật" }[item.action] || "cập nhật";
      link.href = `#${section}`;
      const title = document.createElement("span");
      title.textContent = `Người thương đã ${action} ${subject}.`;
      const time = document.createElement("time");
      time.dateTime = item.created_at;
      time.textContent = new Date(item.created_at).toLocaleString("vi-VN", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
      link.append(title, time);
      link.addEventListener("click", () => dialog.close());
      row.append(link);
      return row;
    }));
  }

  async function refresh(append = false) {
    if (!window.appCloud.isReady) return;
    const current = ++revision;
    loadMore.disabled = true;
    message.textContent = "Đang tải thông báo…";
    try {
      const result = await window.appCloud.notifications(append ? items.at(-1)?.id : undefined);
      if (current !== revision) return;
      const newest = result.items[0]?.id;
      if (!append && newest !== undefined) {
        if (latestActivityId !== null && BigInt(newest) > BigInt(latestActivityId)
          && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && typeof toggle.animate === "function") {
          toggle.animate([
            { rotate: "0deg" }, { rotate: "-14deg" }, { rotate: "12deg" },
            { rotate: "-8deg" }, { rotate: "5deg" }, { rotate: "0deg" },
          ], { duration: 650, easing: "ease-in-out" });
        }
        latestActivityId = newest;
      }
      items = append ? [...items, ...result.items.filter((entry) => !items.some((item) => item.id === entry.id))] : result.items;
      loadMore.hidden = result.items.length < 30;
      render(result.unread);
      message.textContent = items.length
        ? (result.unread ? `${result.unread} thay đổi chưa đọc.` : "Cậu đã xem hết các thay đổi rồi ♡")
        : "Chưa có thay đổi từ người thương. Những cập nhật mới sẽ xuất hiện ở đây ♡";
    } catch {
      if (current !== revision) return;
      message.textContent = "Chưa tải được thông báo. Cậu thử tải lại sau nhé.";
    } finally {
      if (current === revision) loadMore.disabled = false;
    }
  }

  toggle.addEventListener("click", () => { dialog.showModal(); refresh(); });
  document.getElementById("notification-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => toggle.focus());
  document.getElementById("notification-refresh").addEventListener("click", () => refresh());
  loadMore.addEventListener("click", () => refresh(true));
  markRead.addEventListener("click", async () => {
    if (markRead.disabled || readPending) return;
    readPending = true;
    const currentSession = session;
    markRead.disabled = true;
    try {
      await window.appCloud.markNotificationsRead();
      if (currentSession !== session) return;
      await refresh();
    } catch {
      if (currentSession === session) message.textContent = "Chưa lưu được trạng thái đã xem. Cậu thử lại nhé.";
    } finally {
      if (currentSession === session) {
        readPending = false;
        markRead.disabled = badge.hidden;
      }
    }
  });
  window.addEventListener("app-cloud-ready", () => refresh());
  window.addEventListener("app-activity-changed", () => refresh());
  window.addEventListener("focus", () => refresh());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  window.addEventListener("app-cloud-locked", () => {
    ++session;
    readPending = false;
    ++revision;
    items = [];
    latestActivityId = null;
    render(0);
    loadMore.hidden = true;
    message.textContent = "Đăng nhập để xem thông báo.";
    if (dialog.open) dialog.close();
  });
})();
