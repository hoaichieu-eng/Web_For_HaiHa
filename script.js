"use strict";

// Mỗi lần mở hoặc tải lại trang đều bắt đầu từ Trang chủ.
if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

function resetHomePosition() {
  const homeUrl = `${window.location.pathname}${window.location.search}#home`;
  window.history.replaceState(window.history.state, "", homeUrl);
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

resetHomePosition();
window.addEventListener("pageshow", resetHomePosition);

// MÀN HÌNH CHÀO: nút Yes mở trang; nút No đổi chỗ khi có người định chọn.
const welcomeGate = document.getElementById("welcome-gate");
const welcomeYes = document.getElementById("welcome-yes");
const welcomeNo = document.getElementById("welcome-no");
const welcomeActions = document.getElementById("welcome-actions");
const typewriterText = new WeakMap();
document.body.classList.add("gate-open");
window.addEventListener("app-cloud-ready", () => {
  if (!welcomeGate.hidden) welcomeYes.focus();
});

function prepareTypewriter(element) {
  const text = element.textContent;
  const accessibleText = document.createElement("span");
  accessibleText.className = "sr-only";
  accessibleText.textContent = text;

  const visualText = document.createElement("span");
  visualText.className = "typewriter-text";
  visualText.setAttribute("aria-hidden", "true");
  visualText.textContent = text;
  element.replaceChildren(accessibleText, visualText);
  typewriterText.set(element, visualText);
}

function startTypewriter(element) {
  const visualText = typewriterText.get(element);
  if (!visualText || element.dataset.typewriterStarted) return;
  element.dataset.typewriterStarted = "true";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const characters = Array.from(visualText.textContent);
  visualText.textContent = "";
  visualText.classList.add("is-typing");
  let index = 0;
  let nextCharacterAt = performance.now();

  function typeNextCharacter(now) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      visualText.textContent = characters.join("");
      visualText.classList.remove("is-typing");
      return;
    }

    while (index < characters.length && now >= nextCharacterAt) {
      const character = characters[index];
      visualText.textContent += character;
      index += 1;
      nextCharacterAt += /[.!?…]/.test(character) ? 360 : /[,;:]/.test(character) ? 180 : 56;
    }

    if (index === characters.length) {
      visualText.classList.remove("is-typing");
      return;
    }

    window.requestAnimationFrame(typeNextCharacter);
  }

  typeNextCharacter(nextCharacterAt);
}

const heroCopy = document.querySelector(".hero-copy");
if (heroCopy) prepareTypewriter(heroCopy);
document.querySelectorAll(".section-heading > p, .dream-panel-intro").forEach(prepareTypewriter);

const revealElements = [
  ...document.querySelectorAll(".section-heading > p, .dream-panel-intro"),
  ...document.querySelectorAll(".profile-card, .moment, .album-box, .entertainment-card, .wheel-card, .quiz-card, .dream-panel, .closing"),
];
const alternatingRevealSelector = ".profile-card, .moment, .album-box, .entertainment-card, .dream-panel";

revealElements.forEach((element) => {
  element.classList.add("scroll-reveal");
  if (!element.matches(alternatingRevealSelector)) return;

  const index = [...element.parentElement.children].indexOf(element);
  element.classList.add(index % 2 === 0 ? "scroll-reveal--left" : "scroll-reveal--right");
});

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      entry.target.classList.add("is-visible");
      if (typewriterText.has(entry.target)) startTypewriter(entry.target);
    });
  }, { threshold: 0.12 });

  revealElements.forEach((element) => revealObserver.observe(element));
} else {
  revealElements.forEach((element) => {
    element.classList.add("is-visible");
    if (typewriterText.has(element)) startTypewriter(element);
  });
}

welcomeYes.addEventListener("click", () => {
  welcomeGate.hidden = true;
  document.body.classList.remove("gate-open");
  resetHomePosition();
  startTypewriter(heroCopy);
});

document.addEventListener("keydown", (event) => {
  if (welcomeGate.hidden) return;
  if (event.key === "Tab" || event.key === "Escape") {
    event.preventDefault();
    welcomeYes.focus();
  }
});

function moveNoButton(event) {
  if (event) event.preventDefault();
  const area = welcomeActions.getBoundingClientRect();
  const button = welcomeNo.getBoundingClientRect();
  const padding = 6;
  const maxX = Math.max(padding, area.width - button.width - padding);
  const maxY = Math.max(padding, area.height - button.height - padding);
  const pointerX = event && Number.isFinite(event.clientX) ? event.clientX - area.left : -1000;
  const pointerY = event && Number.isFinite(event.clientY) ? event.clientY - area.top : -1000;
  let x = padding;
  let y = padding;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    x = padding + Math.random() * (maxX - padding);
    y = padding + Math.random() * (maxY - padding);
    if (Math.hypot(x + button.width / 2 - pointerX, y + button.height / 2 - pointerY) > button.width + 30) break;
  }

  welcomeNo.style.transform = "none";
  welcomeNo.style.left = `${x}px`;
  welcomeNo.style.top = `${y}px`;
}

welcomeNo.addEventListener("pointerenter", moveNoButton);
welcomeNo.addEventListener("pointerdown", moveNoButton);
welcomeNo.addEventListener("focus", moveNoButton);
welcomeNo.addEventListener("click", (event) => {
  event.preventDefault();
  moveNoButton(event);
});

// BỘ ĐẾM THỜI GIAN: đổi ngày bắt đầu tại đây; tháng trong Date bắt đầu từ 0.
const startDate = new Date(2023, 0, 17, 0, 0, 0);

function updateCounter() {
  const now = new Date();
  const yearElement = document.getElementById("years");
  const dayElement = document.getElementById("days");
  if (!yearElement || !dayElement) return;

  if (now < startDate) {
    yearElement.textContent = "0";
    dayElement.textContent = "0";
    return;
  }

  let years = now.getFullYear() - startDate.getFullYear();
  const anniversary = new Date(startDate);
  anniversary.setFullYear(startDate.getFullYear() + years);
  if (anniversary > now) years -= 1;
  const yearStart = new Date(startDate);
  yearStart.setFullYear(startDate.getFullYear() + years);
  const days = Math.floor((now.getTime() - yearStart.getTime()) / 86400000);

  yearElement.textContent = String(years);
  dayElement.textContent = String(days);
}

updateCounter();
window.setInterval(updateCounter, 60000);

// ĐIỀU HƯỚNG: làm nổi bật mục hiện tại và chuyển cảnh nhẹ khi tới một phần mới.
const sectionNavLinks = [...document.querySelectorAll(".nav-links a[href^='#'], .mobile-nav a[href^='#']")];
const navigableSections = [...new Set(sectionNavLinks
  .map((link) => document.getElementById(link.hash.slice(1)))
  .filter(Boolean))];

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      entry.target.classList.add("section-entered");
      sectionNavLinks.forEach((link) => {
        const isCurrent = link.hash === `#${entry.target.id}`;
        link.classList.toggle("is-current", isCurrent);
        if (isCurrent) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
      document.getElementById("mobile-more").classList.toggle("is-current",
        Boolean(document.querySelector(".mobile-more-links a.is-current")));
    });
  }, { rootMargin: "-15% 0px -70% 0px", threshold: 0 });

  navigableSections.forEach((section) => sectionObserver.observe(section));
}

// CÂU CHUYỆN: mở nội dung của cột mốc trong trang sách.
const storyBook = document.getElementById("story-book");
const storyBookClose = storyBook.querySelector(".story-book-close");
const storyBookPeriod = document.getElementById("story-book-period");
const storyBookTitle = document.getElementById("story-book-title");
const storyBookContent = document.getElementById("story-book-content");
const storyBookImage = document.getElementById("story-book-image");
let activeStoryTrigger = null;

document.querySelectorAll(".moment-trigger").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const moment = trigger.closest(".moment");
    const image = moment.querySelector(".moment-card img");
    activeStoryTrigger = trigger;
    storyBookPeriod.textContent = moment.querySelector(".moment-period").textContent;
    storyBookTitle.textContent = trigger.textContent;
    storyBookContent.textContent = moment.querySelector(".moment-detail").textContent;
    storyBookImage.src = image.src;
    storyBookImage.alt = image.alt;
    trigger.setAttribute("aria-expanded", "true");
    storyBook.showModal();
  });
});

storyBookClose.addEventListener("click", () => storyBook.close());
storyBook.addEventListener("click", (event) => {
  if (event.target === storyBook) storyBook.close();
});
storyBook.addEventListener("close", () => {
  if (activeStoryTrigger) {
    activeStoryTrigger.setAttribute("aria-expanded", "false");
    activeStoryTrigger.focus();
    activeStoryTrigger = null;
  }
});

// GIẢI TRÍ: nhập nhiều mục, chỉnh tên và chấm điểm riêng cho từng mục.
document.querySelectorAll("[data-entertainment]").forEach((card) => {
  const category = card.dataset.entertainment;
  const key = `entertainment:${category}`;
  const legacyKey = `rating:${category}`;
  const form = card.querySelector("form");
  const list = card.querySelector("ul");
  const nameInput = form.elements.namedItem("name");
  const ratingInput = form.elements.namedItem("rating");
  const submit = form.querySelector("button");
  const rows = new Map();
  let hasRenderedItems = false;
  const pendingRemovals = new Set();
  let showAll = false;
  const count = document.createElement("p");
  count.className = "entertainment-count";
  const empty = document.createElement("p");
  empty.className = "entertainment-empty";
  empty.textContent = {
    movies: "Bộ phim đầu tiên của chúng mình là gì?",
    songs: "Bài hát nào khiến cậu nhớ đến hai đứa?",
    foods: "Lưu lại món ngon mình muốn ăn cùng nhau nhé.",
    sports: "Mình thích làm gì cùng nhau nhất?",
  }[category];
  const more = document.createElement("button");
  more.type = "button";
  more.className = "entertainment-more";
  list.id = `entertainment-list-${category}`;
  more.setAttribute("aria-controls", list.id);
  card.insertBefore(count, form);
  card.insertBefore(empty, form);
  card.insertBefore(list, form);
  card.insertBefore(more, form);
  const status = document.createElement("p");
  status.className = "entertainment-status";
  status.setAttribute("role", "status");
  card.append(status);
  more.addEventListener("click", () => {
    showAll = !showAll;
    renderItems();
  });

  function readItems() {
    const items = window.appCloud.get(key);
    if (Array.isArray(items)) return items;
    // Keep the old category score available until its item is named.
    const oldRating = window.appCloud.get(legacyKey);
    if (oldRating === undefined || oldRating === null || oldRating === "") return [];
    const rating = Number(oldRating);
    return Number.isFinite(rating) && rating >= 0 && rating <= 10 && rating % 0.5 === 0
      ? [{ id: "legacy", name: "", rating }] : [];
  }

  function renderItems() {
    const items = [...readItems()].reverse();
    count.textContent = `${items.length} trải nghiệm đã lưu`;
    empty.hidden = items.length > 0;
    more.hidden = items.length <= 3;
    more.textContent = showAll ? "Thu gọn ↑" : `Xem tất cả (${items.length}) ↓`;
    more.setAttribute("aria-expanded", String(showAll));
    const ids = new Set(items.map((item) => item.id));
    rows.forEach((row, id) => {
      if (!ids.has(id)) {
        if (pendingRemovals.has(id)) return;
        if (row.exiting) return;
        const removeRow = () => {
          if (readItems().some((item) => item.id === id)) return;
          row.element.remove();
          rows.delete(id);
        };
        if (typeof row.element.animate === "function" && !row.element.hidden
          && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          row.exiting = true;
          row.element.inert = true;
          row.exitAnimation = row.element.animate([
            { opacity: 1, height: `${row.element.getBoundingClientRect().height}px`, paddingBottom: "12px", marginBottom: "0px" },
            { opacity: 0, height: "0px", paddingBottom: "0px", marginBottom: "-12px" },
          ], { duration: 260, easing: "ease-in", fill: "forwards" });
          row.exitAnimation.finished.then(removeRow).catch(() => {});
        } else removeRow();
      }
    });
    items.forEach((item, index) => {
      let row = rows.get(item.id);
      const isNew = !row;
      if (!row) {
        const element = document.createElement("li");
        element.tabIndex = 0;
        const name = document.createElement("input");
        name.type = "text";
        name.className = "entertainment-name-input";
        name.maxLength = 160;
        name.required = true;
        name.placeholder = "Nhập tên...";
        name.setAttribute("aria-label", card.dataset.itemLabel);
        const control = document.createElement("label");
        control.className = "rating-control";
        const label = document.createElement("span");
        label.className = "sr-only";
        label.textContent = "Điểm đánh giá từ 0 đến 10";
        const rating = document.createElement("input");
        rating.type = "number";
        rating.className = "rating-input";
        rating.min = "0";
        rating.max = "10";
        rating.step = "0.5";
        rating.placeholder = "0–10";
        const star = document.createElement("span");
        star.textContent = "★";
        star.setAttribute("aria-hidden", "true");
        control.append(label, star, rating);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "entertainment-delete";
        remove.textContent = "Xóa";
        remove.addEventListener("click", async () => {
          if (remove.disabled) return;
          const items = readItems();
          if (!items.some((entry) => entry.id === item.id)) return;
          remove.disabled = true;
          name.disabled = true;
          rating.disabled = true;
          status.textContent = "Đang xóa trải nghiệm…";
          pendingRemovals.add(item.id);
          try {
            const saved = await window.appCloud.set(key, items.filter((entry) => entry.id !== item.id));
            pendingRemovals.delete(item.id);
            renderItems();
            status.textContent = saved ? "Đã xóa trải nghiệm." : "Chưa thể xóa. Cậu thử lại nhé.";
            if (saved) nameInput.focus({ preventScroll: true });
          } catch {
            pendingRemovals.delete(item.id);
            renderItems();
            status.textContent = "Chưa thể xóa. Cậu thử lại nhé.";
          } finally {
            remove.disabled = false;
            name.disabled = false;
            rating.disabled = false;
          }
        });
        element.append(name, control, remove);
        row = { element, name, rating, remove };
        rows.set(item.id, row);
        name.addEventListener("input", () => name.setCustomValidity(""));
        name.addEventListener("change", () => saveItem(item.id, "name", name));
        rating.addEventListener("input", () => {
          rating.setAttribute("aria-invalid", String(!rating.validity.valid));
        });
        rating.addEventListener("change", () => saveItem(item.id, "rating", rating));
      }
      if (document.activeElement !== row.name) row.name.value = item.name;
      if (row.exiting) {
        row.exitAnimation.cancel();
        row.exiting = false;
        row.element.inert = false;
      }
      if (document.activeElement !== row.rating) row.rating.value = item.rating ?? "";
      row.remove.setAttribute("aria-label", `Xóa ${item.name || "trải nghiệm"}`);
      row.element.hidden = !showAll && index >= 3;
      if (list.children[index] !== row.element) list.insertBefore(row.element, list.children[index] || null);
      if (isNew && hasRenderedItems && !row.element.hidden && typeof row.element.animate === "function"
        && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        row.element.animate([{ opacity: 0, translate: "0 12px" }, { opacity: 1, translate: "0 0" }],
          { duration: 300, easing: "ease-out" });
      }
    });
    hasRenderedItems = true;
  }

  async function saveItem(id, field, input) {
    if (field === "name") input.setCustomValidity(input.value.trim() ? "" : "Vui lòng nhập tên.");
    if (!input.reportValidity()) return;
    const value = field === "name" ? input.value.trim() : (input.value === "" ? null : Number(input.value));
    const items = readItems();
    if (!items.some((item) => item.id === id)) return;
    if (field === "name") input.value = value;
    const saved = await window.appCloud.set(key, items.map((item) => item.id === id ? { ...item, [field]: value } : item));
    if (!saved) {
      const restored = readItems().find((item) => item.id === id);
      if (restored) input.value = restored[field] ?? "";
      renderItems();
    }
  }

  nameInput.addEventListener("input", () => nameInput.setCustomValidity(""));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    const name = nameInput.value.trim();
    nameInput.setCustomValidity(name ? "" : "Vui lòng nhập tên.");
    if (!form.reportValidity()) return;
    const item = {
      id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      rating: ratingInput.value === "" ? null : Number(ratingInput.value),
    };
    submit.disabled = true;
    try {
      if (await window.appCloud.set(key, [...readItems(), item])) {
        form.reset();
        nameInput.focus({ preventScroll: true });
      }
    } finally {
      submit.disabled = false;
    }
  });
  window.appCloud.subscribe(key, renderItems);
  window.appCloud.subscribe(legacyKey, renderItems);
});

// MINIGAME: mỗi gói có ngân hàng riêng; answer là vị trí đáp án, bắt đầu từ 0.
// Bổ sung sở thích của Hải Hà khi hồ sơ đã có thông tin cụ thể.
const quizPacks = {
  personal: {
    title: "Cá nhân",
    questions: [
      { question: "Sinh nhật của Hoài Chiều là ngày nào?", options: ["22/06/2006", "07/03/2006", "22/07/2006"], answer: 0 },
      { question: "Sinh nhật của Hải Hà là ngày nào?", options: ["03/07/2006", "07/03/2006", "07/06/2006"], answer: 1 },
      { question: "Hai đứa có cùng quê ở đâu?", options: ["Quảng Bình", "Thừa Thiên Huế", "Quảng Trị"], answer: 2 },
      { question: "Hoài Chiều học trường đại học nào?", options: ["Đại học Ngân Hàng", "Đại học Công Nghệ Thông Tin, ĐHQG-TP.HCM", "Đại học Bách Khoa"], answer: 1 },
      { question: "Hải Hà học trường đại học nào?", options: ["Đại học Ngân Hàng", "Đại học Công Nghệ Thông Tin", "Đại học Kinh Tế"], answer: 0 }
    ]
  },
  interests: {
    title: "Sở thích",
    questions: [
      { question: "Môn thể thao nào có trong sở thích trên hồ sơ của Hoài Chiều?", options: ["Bơi lội", "Cầu lông", "Đá bóng"], answer: 2 },
      { question: "Hoạt động giải trí nào được Hoài Chiều ghi trong hồ sơ?", options: ["Chơi game", "Sưu tầm tem", "Làm gốm"], answer: 0 },
      { question: "Sở thích nghệ thuật nào được Hoài Chiều ghi trong hồ sơ?", options: ["Vẽ tranh", "Hát", "Múa"], answer: 1 }
    ]
  }
};
let activeQuizPack = null;
let questions = [];
let questionIndex = 0;
let score = 0;
let answered = false;
const questionElement = document.getElementById("quiz-question");
const optionsElement = document.getElementById("quiz-options");
const feedbackElement = document.getElementById("quiz-feedback");
const nextButton = document.getElementById("quiz-next");

document.querySelectorAll("[data-quiz-pack]").forEach((button) => {
  const pack = quizPacks[button.dataset.quizPack];
  button.querySelector("[data-quiz-pack-count]").textContent = `${pack.questions.length} câu hỏi · Chơi ngay ↗`;
  button.addEventListener("click", () => startQuizPack(button.dataset.quizPack));
});

function startQuizPack(packId) {
  activeQuizPack = packId;
  questions = quizPacks[packId].questions;
  questionIndex = 0;
  score = 0;
  document.getElementById("quiz-pack-picker").hidden = true;
  document.getElementById("quiz-result").hidden = true;
  document.getElementById("quiz-play").hidden = false;
  document.getElementById("quiz-pack-title").textContent = `Gói ${quizPacks[packId].title}`;
  renderQuestion();
}

document.querySelectorAll(".quiz-change-pack").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById("quiz-play").hidden = true;
    document.getElementById("quiz-result").hidden = true;
    document.getElementById("quiz-pack-picker").hidden = false;
    answered = true;
    nextButton.hidden = true;
    const selectedPack = document.querySelector(`[data-quiz-pack="${activeQuizPack}"]`);
    activeQuizPack = null;
    selectedPack.focus();
  });
});

function renderQuestion() {
  const current = questions[questionIndex];
  answered = false;
  document.getElementById("quiz-count").textContent = `Câu ${questionIndex + 1} / ${questions.length}`;
  document.getElementById("quiz-score").textContent = `Đúng: ${score}`;
  document.getElementById("quiz-progress").style.width = `${(questionIndex / questions.length) * 100}%`;
  questionElement.textContent = current.question;
  feedbackElement.textContent = "";
  nextButton.hidden = true;
  optionsElement.replaceChildren();
  current.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "quiz-option";
    button.type = "button";
    button.textContent = option;
    button.addEventListener("click", () => selectAnswer(index, button));
    optionsElement.append(button);
  });
  questionElement.focus({ preventScroll: true });
}

function selectAnswer(selected, selectedButton) {
  if (answered) return;
  answered = true;
  const current = questions[questionIndex];
  const buttons = [...optionsElement.querySelectorAll("button")];
  buttons.forEach((button) => { button.disabled = true; });
  if (selected === current.answer) {
    score += 1;
    selectedButton.classList.add("correct");
    feedbackElement.textContent = "Chính xác! Cậu nhớ giỏi quá ♡";
  } else {
    selectedButton.classList.add("incorrect");
    buttons[current.answer].classList.add("correct");
    feedbackElement.textContent = "Chưa đúng rồi, nhưng không sao, mình còn nhiều dịp cùng nhau ôn lại mà ♡";
  }
  document.getElementById("quiz-score").textContent = `Đúng: ${score}`;
  document.getElementById("quiz-progress").style.width = `${((questionIndex + 1) / questions.length) * 100}%`;
  nextButton.hidden = false;
  nextButton.textContent = questionIndex === questions.length - 1 ? "Xem kết quả ♡" : "Câu tiếp theo →";
}

nextButton.addEventListener("click", () => {
  if (!activeQuizPack || !answered || questionIndex >= questions.length) return;
  questionIndex += 1;
  if (questionIndex < questions.length) {
    renderQuestion();
    return;
  }
  document.getElementById("quiz-play").hidden = true;
  document.getElementById("quiz-result").hidden = false;
  document.getElementById("quiz-result-pack").textContent = `Kết quả · ${quizPacks[activeQuizPack].title}`;
  document.getElementById("result-title").textContent = `${score} / ${questions.length} câu đúng`;
  document.getElementById("result-message").textContent = score === questions.length
    ? "Cậu hiểu câu chuyện của chúng mình thật rõ. Giỏi nhất luôn!"
    : score / questions.length >= 0.6
      ? "Cậu nhớ được nhiều điều đáng yêu lắm. Mình cùng tạo thêm kỷ niệm mới nhé!"
      : "Không sao đâu, mình còn cả chặng đường dài để hiểu nhau hơn mà.";
  document.getElementById("result-title").focus({ preventScroll: true });
});
document.getElementById("quiz-restart").addEventListener("click", () => {
  if (activeQuizPack) startQuizPack(activeQuizPack);
});

// VÒNG QUAY: tạo ô lựa chọn và quay ngẫu nhiên đến một kết quả.
const wheelEntriesInput = document.getElementById("wheel-entries");
const wheelCountInput = document.getElementById("wheel-count");
const wheelResetButton = document.getElementById("wheel-reset");
const wheelStorageStatus = document.getElementById("wheel-storage-status");
const wheelStorageKey = "wheel:choices";
let wheelEntryFields = [];
const wheelElement = document.getElementById("wheel");
const wheelSpinButton = document.getElementById("wheel-spin");
const wheelResult = document.getElementById("wheel-result");
const wheelFireworks = document.getElementById("wheel-fireworks");
let wheelFireworksTimer;
const wheelColors = [1, 2, 3, 4, 5, 6].map((index) => `var(--wheel-${index})`);
let wheelRotation = 0;
let wheelIsSpinning = false;

function getWheelEntries() {
  return wheelEntryFields.map((field) => field.value.trim());
}

function updateWheel() {
  wheelResult.classList.remove("is-winner");
  wheelFireworks.replaceChildren();
  window.clearTimeout(wheelFireworksTimer);
  const entries = getWheelEntries();
  wheelEntryFields.forEach((field) => field.classList.remove("is-selected"));
  if (entries.length < 2 || entries.length > 10) {
    wheelElement.style.background = "var(--paper-deep)";
    wheelElement.replaceChildren();
    wheelSpinButton.disabled = true;
    wheelResult.textContent = "Chọn từ 2 đến 10 lựa chọn để tạo vòng quay.";
    return;
  }

  const segmentSize = 360 / entries.length;
  const segments = entries.map((_, index) =>
    `${wheelColors[index % wheelColors.length]} ${index * segmentSize}deg ${(index + 1) * segmentSize}deg`
  );
  wheelElement.style.background = `conic-gradient(${segments.join(", ")})`;
  wheelElement.replaceChildren();

  entries.forEach((entry, index) => {
    const label = document.createElement("span");
    const angle = (index + 0.5) * segmentSize;
    const radians = (angle * Math.PI) / 180;
    const labelRadius = 31;
    const maxLabelWidth = 2 * labelRadius * Math.sin(Math.PI / entries.length) * 0.8;
    label.className = "wheel-label";
    label.textContent = entry;
    label.title = entry;
    label.style.left = `${50 + Math.sin(radians) * labelRadius}%`;
    label.style.top = `${50 - Math.cos(radians) * labelRadius}%`;
    label.style.width = `${Math.min(40, maxLabelWidth)}%`;
    label.style.setProperty("--wheel-label-size", entries.length >= 10 ? "8px" : entries.length >= 7 ? "9px" : entries.length >= 5 ? "10px" : "11px");
    wheelElement.append(label);
  });

  wheelSpinButton.disabled = wheelIsSpinning || entries.some((entry) => !entry);
  if (!wheelIsSpinning) {
    wheelResult.textContent = entries.some((entry) => !entry)
      ? `Đã điền ${entries.filter(Boolean).length}/${entries.length} lựa chọn · Điền đủ để quay nhé!`
      : `Đã có ${entries.length} lựa chọn · Sẵn sàng quay may mắn ♡`;
  }
}

function saveWheelEntries() {
  try {
    window.localStorage.setItem(wheelStorageKey, JSON.stringify(wheelEntryFields.map((field) => field.value)));
    wheelStorageStatus.textContent = "Đã lưu các lựa chọn trên trình duyệt này.";
  } catch {
    wheelStorageStatus.textContent = "Trình duyệt chưa thể lưu lựa chọn. Nội dung có thể mất khi tải lại trang.";
  }
}

function createWheelEntries(previousEntries = wheelEntryFields.map((field) => field.value)) {
  const count = Number(wheelCountInput.value);
  if (!Number.isInteger(count) || count < 2 || count > 10) return;
  wheelEntriesInput.replaceChildren();
  wheelEntryFields = Array.from({ length: count }, (_, index) => {
    const input = document.createElement("input");
    input.className = "wheel-entry";
    input.type = "text";
    input.maxLength = 50;
    input.placeholder = "Nhập lựa chọn…";
    input.value = previousEntries[index] || "";
    input.setAttribute("aria-label", `Nội dung lựa chọn ${index + 1}`);
    input.setAttribute("aria-describedby", "wheel-help");
    input.addEventListener("input", () => {
      updateWheel();
      saveWheelEntries();
    });
    wheelEntriesInput.append(input);
    return input;
  });
  updateWheel();
}

wheelCountInput.addEventListener("change", () => {
  createWheelEntries();
  saveWheelEntries();
});
wheelResetButton.addEventListener("click", () => {
  if (wheelIsSpinning) return;
  createWheelEntries([]);
  saveWheelEntries();
  wheelSpinButton.textContent = "Quay may mắn ↻";
  wheelEntryFields[0].focus();
});

function celebrateWheel() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#e987a5", "#edbd58", "#8cbfae", "#a59adc", "#e8966c"];
  const fragment = document.createDocumentFragment();
  for (let burst = 0; burst < 5; burst += 1) {
    const originX = [22, 78, 48, 15, 85][burst];
    const originY = [25, 20, 45, 65, 60][burst];
    for (let spark = 0; spark < 22; spark += 1) {
      const particle = document.createElement("i");
      const angle = (spark / 22) * Math.PI * 2;
      const distance = 55 + Math.random() * 85;
      particle.className = "wheel-spark";
      particle.style.left = `${originX}%`;
      particle.style.top = `${originY}%`;
      particle.style.background = colors[(spark + burst) % colors.length];
      particle.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--spark-y", `${Math.sin(angle) * distance}px`);
      particle.style.animationDelay = `${burst * 240}ms`;
      fragment.append(particle);
    }
  }
  wheelFireworks.replaceChildren(fragment);
  wheelFireworksTimer = window.setTimeout(() => wheelFireworks.replaceChildren(), 2600);
}

wheelSpinButton.addEventListener("click", () => {
  if (wheelIsSpinning) return;
  const entries = getWheelEntries();
  if (entries.length < 2 || entries.length > 10 || entries.some((entry) => !entry)) {
    updateWheel();
    return;
  }

  wheelIsSpinning = true;
  updateWheel();
  wheelElement.setAttribute("aria-busy", "true");
  wheelCountInput.disabled = true;
  wheelResetButton.disabled = true;
  wheelEntryFields.forEach((field) => { field.disabled = true; });
  wheelSpinButton.disabled = true;
  wheelSpinButton.textContent = "Đang quay…";
  wheelResult.textContent = "Vòng quay đang quay...";

  const selectedIndex = Math.floor(Math.random() * entries.length);
  const segmentCenter = (selectedIndex + 0.5) * (360 / entries.length);
  const currentAngle = ((wheelRotation % 360) + 360) % 360;
  const desiredAngle = (360 - segmentCenter) % 360;
  const adjustment = (desiredAngle - currentAngle + 360) % 360;
  wheelRotation += 5 * 360 + adjustment;

  let spinTimeout;
  const finishSpin = () => {
    if (!wheelIsSpinning) return;
    wheelElement.removeEventListener("transitionend", onWheelStop);
    window.clearTimeout(spinTimeout);
    wheelIsSpinning = false;
    wheelCountInput.disabled = false;
    wheelResetButton.disabled = false;
    wheelEntryFields.forEach((field) => { field.disabled = false; });
    updateWheel();
    wheelElement.setAttribute("aria-busy", "false");
    wheelSpinButton.textContent = "Quay thêm lần nữa ↻";
    const caption = document.createElement("span");
    caption.textContent = "✦ CHÚC MỪNG! LỰA CHỌN LÀ";
    const winner = document.createElement("strong");
    winner.textContent = entries[selectedIndex];
    wheelResult.replaceChildren(caption, winner);
    wheelResult.classList.add("is-winner");
    wheelEntryFields[selectedIndex].classList.add("is-selected");
    celebrateWheel();
  };
  const onWheelStop = (event) => {
    if (event.target === wheelElement && event.propertyName === "transform") finishSpin();
  };

  wheelElement.addEventListener("transitionend", onWheelStop);
  wheelElement.style.transform = `rotate(${wheelRotation}deg)`;
  spinTimeout = window.setTimeout(finishSpin, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 100 : 5500);
});
let savedWheelEntries = [];
try {
  const saved = JSON.parse(window.localStorage.getItem(wheelStorageKey));
  if (Array.isArray(saved) && saved.length >= 2 && saved.length <= 10
    && saved.every((entry) => typeof entry === "string" && entry.length <= 50)) {
    savedWheelEntries = saved;
    wheelCountInput.value = String(saved.length);
  }
} catch {
  wheelStorageStatus.textContent = "Chưa thể đọc lựa chọn đã lưu. Cậu vẫn có thể nhập và quay bình thường.";
}
createWheelEntries(savedWheelEntries);

const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const heartRain = document.createElement("div");
heartRain.className = "heart-rain";
heartRain.setAttribute("aria-hidden", "true");
document.body.append(heartRain);
let heartRainTimer;

function createFallingHeart() {
  const heart = document.createElement("span");
  heart.className = "falling-heart";
  heart.textContent = Math.random() < 0.75 ? "♡" : "♥";
  heart.style.left = `${Math.random() * 100}%`;
  heart.style.fontSize = `${14 + Math.random() * 14}px`;
  heart.style.setProperty("--fall-duration", `${9 + Math.random() * 5}s`);
  heart.style.setProperty("--heart-sway", `${Math.random() * 70 - 35}px`);
  heart.style.setProperty("--heart-opacity", `${0.2 + Math.random() * 0.2}`);
  heart.addEventListener("animationend", () => heart.remove(), { once: true });
  heartRain.append(heart);
}

function updateHeartRain() {
  window.clearInterval(heartRainTimer);
  heartRain.replaceChildren();
  if (motionPreference.matches) return;
  createFallingHeart();
  heartRainTimer = window.setInterval(createFallingHeart, 1600);
}

updateHeartRain();
motionPreference.addEventListener("change", updateHeartRain);

// ALBUM: mỗi box mở slideshow ảnh riêng, ảnh được chọn bằng data-album.
const albumCategories = {
  outing: "Ảnh đi chơi",
  cute: "Ảnh cute",
  funny: "Ảnh dìm",
};
let albumPhotos = [...document.querySelectorAll(".album-photo")];
const albumSlideshow = document.getElementById("album-slideshow");
const albumSlideshowImage = document.getElementById("album-slideshow-image");
const albumSlideshowOutgoing = document.getElementById("album-slideshow-outgoing");
let albumRenderVersion = 0;
let albumTransition = Promise.resolve();
let albumFade;
let albumImageMotion;
let albumSlideDirection = 1;
const albumSlideshowEmpty = document.getElementById("album-slideshow-empty");
const albumSlideshowCaption = document.getElementById("album-slideshow-caption");
const albumSlideshowTitle = document.getElementById("album-slideshow-title");
const albumSlideshowControls = document.getElementById("album-slideshow-controls");
const albumSlideshowCount = document.getElementById("album-slideshow-count");
const albumSlideshowToggle = document.getElementById("album-slideshow-toggle");
const albumSlideshowDelete = document.getElementById("album-slideshow-delete");
const albumSlideshowPrevious = document.getElementById("album-slideshow-prev");
const albumSlideshowNext = document.getElementById("album-slideshow-next");
let activeAlbum = "";
let activeAlbumPhotos = [];
let albumPhotoIndex = 0;
let albumAutoplayTimer;
let lastAlbumTrigger;
let albumPaused = motionPreference.matches;
let albumPhotoReady = false;
const albumImageLoads = new WeakMap();
let albumPreloadTimer;
let albumPreloadQueue = [];
let albumPreloadWorkers = 0;

function isAlbumImageReady(photo) {
  const cached = albumImageLoads.get(photo);
  const image = photo.querySelector("img");
  return Boolean(cached?.ready && image.complete && image.naturalWidth && image.getAttribute("src") === cached.url
    && (!photo.dataset.cloudPath || window.appCloud.isImageUrlCurrent(photo.dataset.cloudPath, cached.url)));
}

function loadAlbumImage(photo) {
  const cached = albumImageLoads.get(photo);
  if (cached && (!cached.ready || isAlbumImageReady(photo))) return cached.promise;
  const image = photo.querySelector("img");
  const entry = { ready: false };
  entry.promise = (async () => {
    const url = photo.dataset.cloudPath
      ? await window.appCloud.imageUrl(photo.dataset.cloudPath)
      : image.getAttribute("src");
    if (!url) return;
    // Hidden lazy images are never fetched until their album is opened.
    image.loading = "eager";
    image.decoding = "async";
    if (image.getAttribute("src") !== url) image.src = url;
    await image.decode();
    entry.url = url;
    entry.ready = true;
    return url;
  })().catch((error) => {
    if (albumImageLoads.get(photo) === entry) albumImageLoads.delete(photo);
    throw error;
  });
  albumImageLoads.set(photo, entry);
  return entry.promise;
}

function preloadAlbumImages() {
  if (!window.appCloud.isReady) return;
  window.clearTimeout(albumPreloadTimer);
  albumPreloadTimer = window.setTimeout(() => {
    const groups = Object.keys(albumCategories).map((album) =>
      albumPhotos.filter((photo) => photo.dataset.album === album && !isAlbumImageReady(photo)));
    albumPreloadQueue = [];
    // Fetch the first photo of every album before the remaining photos.
    for (let index = 0; groups.some((group) => index < group.length); index += 1) {
      groups.forEach((group) => {
        if (group[index]) albumPreloadQueue.push(group[index]);
      });
    }
    async function worker() {
      albumPreloadWorkers += 1;
      while (albumPreloadQueue.length && window.appCloud.isReady) {
        const photo = albumPreloadQueue.shift();
        if (!photo.isConnected) continue;
        try {
          await loadAlbumImage(photo);
        } catch (error) {
          // Opening the photo retries failed background requests.
          console.warn("Album image preload failed", error);
        }
      }
      albumPreloadWorkers -= 1;
    }
    // Limit concurrent downloads so album preloading leaves room for the page.
    while (albumPreloadWorkers < 4 && albumPreloadQueue.length) worker();
  }, 0);
}

document.querySelectorAll(".album-box").forEach((box) => {
  const { album } = box.dataset;
  box.addEventListener("click", () => {
    activeAlbum = album;
    activeAlbumPhotos = albumPhotos.filter((photo) => photo.dataset.album === activeAlbum);
    albumPhotoIndex = 0;
    lastAlbumTrigger = box;
    albumSlideshowTitle.textContent = albumCategories[activeAlbum];
    renderAlbumPhoto();
    albumSlideshow.showModal();
    albumSlideshow.querySelector(".album-slideshow-close").focus();
    setAlbumPaused(motionPreference.matches);
  });
});

function updateAlbumCounts() {
  document.querySelectorAll(".album-box").forEach((box) => {
    const { album } = box.dataset;
    const count = albumPhotos.filter((photo) => photo.dataset.album === album).length;
    const label = count ? `${count} ảnh` : "Chưa có ảnh";
    box.querySelector("[data-album-count]").textContent = label;
    box.setAttribute("aria-label", `Mở album ${albumCategories[album]}, ${label}`);
  });
}

updateAlbumCounts();

async function transitionAlbumImage(url, alt, version) {
  const previousSource = albumSlideshowImage.getAttribute("src");
  const shouldFade = previousSource && previousSource !== url && !motionPreference.matches;
  if (shouldFade) {
    albumSlideshowOutgoing.src = previousSource;
    albumSlideshowOutgoing.hidden = false;
  }
  try {
    if (shouldFade) await albumSlideshowOutgoing.decode();
    if (version !== albumRenderVersion || !albumSlideshow.open) return;
    albumSlideshowImage.src = url;
    await albumSlideshowImage.decode();
    if (version !== albumRenderVersion || !albumSlideshow.open || !activeAlbumPhotos.length) return;
    albumSlideshowImage.alt = alt;
    albumSlideshowImage.hidden = false;
    if (!motionPreference.matches) {
      albumImageMotion = albumSlideshowImage.animate(
        [{ opacity: shouldFade ? 0.4 : 0, scale: shouldFade ? "1" : ".96", translate: shouldFade ? `${albumSlideDirection * 20}px 0` : "0 0" },
          { opacity: 1, scale: "1", translate: "0 0" }],
        { duration: shouldFade ? 900 : 380, easing: "ease-out" }
      );
    }
    if (shouldFade) {
      albumFade = albumSlideshowOutgoing.animate(
        [{ opacity: 1, translate: "0 0" }, { opacity: 0, translate: `${-albumSlideDirection * 20}px 0` }],
        { duration: 900, easing: "ease-in-out", fill: "forwards" }
      );
      await albumFade.finished.catch(() => {});
    }
    if (albumImageMotion) await albumImageMotion.finished.catch(() => {});
  } catch (error) {
    if (previousSource && version === albumRenderVersion && albumSlideshow.open) {
      albumSlideshowImage.src = previousSource;
    }
    throw error;
  } finally {
    albumSlideshowOutgoing.hidden = true;
    albumFade?.cancel();
    albumFade = null;
    albumImageMotion?.cancel();
    albumImageMotion = null;
  }
}

function renderAlbumPhoto() {
  const version = ++albumRenderVersion;
  albumPhotoReady = false;
  window.clearTimeout(albumAutoplayTimer);
  const total = activeAlbumPhotos.length;
  const hasAlbumPhotos = total > 0;
  albumSlideshowEmpty.hidden = hasAlbumPhotos;
  albumSlideshowCaption.hidden = !hasAlbumPhotos;
  albumSlideshowControls.hidden = !hasAlbumPhotos;
  albumSlideshowPrevious.hidden = !hasAlbumPhotos;
  albumSlideshowNext.hidden = !hasAlbumPhotos;

  if (!hasAlbumPhotos) {
    albumFade?.cancel();
    albumSlideshowImage.hidden = true;
    albumSlideshowOutgoing.hidden = true;
    albumSlideshowImage.removeAttribute("src");
    albumSlideshowCaption.textContent = "";
    albumSlideshowDelete.hidden = true;
    return;
  }

  albumPhotoIndex = ((albumPhotoIndex % total) + total) % total;
  const photo = activeAlbumPhotos[albumPhotoIndex];
  const image = photo.querySelector("img");
  albumSlideshowDelete.hidden = false;
  loadAlbumImage(photo).then(async (url) => {
    await albumTransition.catch(() => {});
    if (!url || version !== albumRenderVersion || !albumSlideshow.open) return;
    albumTransition = transitionAlbumImage(url, image.alt, version);
    await albumTransition;
    if (version === albumRenderVersion && albumSlideshow.open) {
      albumPhotoReady = true;
      scheduleAlbumAutoplay();
    }
  }).catch((error) => {
    if (version === albumRenderVersion) showImageUploadStatus(`Không tải được ảnh: ${error.message}`);
  });
  albumSlideshowCaption.textContent = photo.dataset.caption || image.alt;
  albumSlideshowCount.textContent = `${albumPhotoIndex + 1} / ${total}`;
  albumSlideshowPrevious.disabled = total < 2;
  albumSlideshowNext.disabled = total < 2;
  albumSlideshowToggle.hidden = total < 2;
}

function setAlbumPaused(paused) {
  albumPaused = paused;
  window.clearTimeout(albumAutoplayTimer);
  albumSlideshowToggle.textContent = paused ? "Phát trình chiếu" : "Tạm dừng";
  albumSlideshowToggle.setAttribute("aria-pressed", String(paused));
  if (!paused) scheduleAlbumAutoplay();
}

function scheduleAlbumAutoplay() {
  window.clearTimeout(albumAutoplayTimer);
  if (albumPaused || !albumPhotoReady || activeAlbumPhotos.length < 2 || !albumSlideshow.open) return;

  albumAutoplayTimer = window.setTimeout(() => {
    changeAlbumPhoto(1);
  }, 3000);
}

function changeAlbumPhoto(direction) {
  if (activeAlbumPhotos.length < 2) return;
  albumSlideDirection = direction;
  albumPhotoIndex = (albumPhotoIndex + direction + activeAlbumPhotos.length) % activeAlbumPhotos.length;
  renderAlbumPhoto();
}

albumSlideshowPrevious.addEventListener("click", () => changeAlbumPhoto(-1));
albumSlideshowNext.addEventListener("click", () => changeAlbumPhoto(1));
albumSlideshowToggle.addEventListener("click", () => setAlbumPaused(!albumPaused));
albumSlideshow.querySelector("#album-slideshow-close").addEventListener("click", () => albumSlideshow.close());
albumSlideshow.addEventListener("close", () => {
  albumPhotoReady = false;
  albumRenderVersion += 1;
  albumFade?.cancel();
  albumImageMotion?.cancel();
  albumSlideshowOutgoing.hidden = true;
  albumSlideshowImage.hidden = true;
  albumSlideshowImage.removeAttribute("src");
  window.clearTimeout(albumAutoplayTimer);
  if (lastAlbumTrigger) lastAlbumTrigger.focus();
});
albumSlideshow.addEventListener("click", (event) => {
  if (event.target === albumSlideshow) albumSlideshow.close();
});

const albumSwipeStage = albumSlideshow.querySelector(".album-slideshow-stage");
let albumSwipeStart = null;
albumSwipeStage.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary) { albumSwipeStart = null; return; }
  if (event.pointerType === "mouse" || event.target.closest("button")) return;
  albumSwipeStart = { x: event.clientX, y: event.clientY, id: event.pointerId, time: event.timeStamp };
});
albumSwipeStage.addEventListener("pointerup", (event) => {
  const start = albumSwipeStart;
  albumSwipeStart = null;
  if (!start || start.id !== event.pointerId || !albumSlideshow.open) return;
  const dx = event.clientX - start.x;
  const dy = event.clientY - start.y;
  if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.3 && event.timeStamp - start.time < 900) {
    changeAlbumPhoto(dx < 0 ? 1 : -1);
  }
});
albumSwipeStage.addEventListener("pointercancel", () => { albumSwipeStart = null; });
document.addEventListener("keydown", (event) => {
  if (!albumSlideshow.open || activeAlbumPhotos.length < 2) return;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    changeAlbumPhoto(event.key === "ArrowLeft" ? -1 : 1);
  }
});

const imageDefaults = new Map();
const imageDecodes = new WeakMap();
const cloudImageRequests = new WeakMap();
const profileDefaults = new Map();
const storyImages = [...document.querySelectorAll(".moment-card img")];
const imageSlots = [
  ["hero", document.querySelector(".hero-photo img")],
  ["story:1", storyImages[0]],
  ["story:2", storyImages[1]],
  ["story:3", storyImages[2]],
  ["story:4", storyImages[3]],
];
const supportedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
]);

imageSlots.forEach(([slot, image]) => {
  imageDefaults.set(slot, { src: image.getAttribute("src"), alt: image.alt });
});
["me", "her"].forEach((person) => {
  const profileName = person === "me" ? "my-profile-name" : "her-profile-name";
  const avatar = document.querySelector(`[aria-labelledby="${profileName}"] .profile-avatar`);
  profileDefaults.set(person, avatar.querySelector("svg").cloneNode(true));
});

function showImageUploadStatus(message, persistent = false) {
  window.appCloud.showStatus(message, persistent);
}

async function prepareUploadImage(file) {
  if (file.type === "image/gif") return file;
  const url = URL.createObjectURL(file);
  const image = new Image();
  let canvas;
  try {
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    const name = `${file.name.replace(/\.[^.]+$/, "")}.webp`;
    return new File([blob], name, { type: blob.type, lastModified: file.lastModified });
  } catch (error) {
    // Upload the original when the device cannot decode or convert this format.
    return file;
  } finally {
    URL.revokeObjectURL(url);
    if (canvas) canvas.width = canvas.height = 0;
  }
}

function makeImagePath(folder, filename) {
  const randomId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const safeName = filename.replace(/[^\w.-]+/g, "_").slice(-80);
  return `${folder}/${randomId}-${safeName}`;
}

function preloadSlotImage(image) {
  image.loading = "eager";
  image.decoding = "async";
  const source = image.src;
  const cached = imageDecodes.get(image);
  if (cached?.source === source) return cached.promise;
  const entry = { source };
  entry.promise = image.decode().catch((error) => {
    if (imageDecodes.get(image) === entry) imageDecodes.delete(image);
    throw error;
  });
  imageDecodes.set(image, entry);
  return entry.promise;
}

async function setCloudImage(image, record, altText) {
  if (!record) return;
  const request = {};
  cloudImageRequests.set(image, request);
  const url = await window.appCloud.imageUrl(record.path);
  if (cloudImageRequests.get(image) !== request) return;
  image.loading = "eager";
  if (image.getAttribute("src") !== url) image.src = url;
  image.alt = altText;
  await preloadSlotImage(image);
}

async function displayUploadedSlot(slot, record) {
  if (!window.appCloud.isReady) return;
  if (record?.deleted) record = undefined;
  const removeButton = document.querySelector(`[data-image-remove="${slot}"]`);
  if (removeButton) removeButton.hidden = !record;

  if (slot === "hero" || slot.startsWith("story:")) {
    const image = slot === "hero"
      ? document.querySelector(".hero-photo img")
      : storyImages[Number(slot.split(":")[1]) - 1];
    if (record) {
      await setCloudImage(image, record, imageDefaults.get(slot).alt);
    } else {
      cloudImageRequests.delete(image);
      const source = imageDefaults.get(slot).src;
      if (image.getAttribute("src") !== source) image.src = source;
      image.alt = imageDefaults.get(slot).alt;
      await preloadSlotImage(image);
    }
    if (storyBook.open && activeStoryTrigger?.closest(".moment").querySelector(".moment-card img") === image) {
      storyBookImage.src = image.src;
      storyBookImage.alt = image.alt;
    }
    return;
  }

  const person = slot.split(":")[1];
  const profileName = person === "me" ? "my-profile-name" : "her-profile-name";
  const avatar = document.querySelector(`[aria-labelledby="${profileName}"] .profile-avatar`);
  if (!record) {
    avatar.replaceChildren(profileDefaults.get(person).cloneNode(true));
    return;
  }

  let image = avatar.querySelector("img");
  if (!image) {
    image = document.createElement("img");
    image.loading = "eager";
    image.decoding = "async";
    avatar.replaceChildren(image);
  }
  await setCloudImage(image, record, profileDefaults.get(person).getAttribute("aria-label"));
}

function renderSharedAlbum(album, records = []) {
  const existing = new Map([...document.querySelectorAll(`.album-photo[data-cloud-album="${album}"]`)]
    .map((photo) => [photo.dataset.cloudPhoto, photo]));
  const albumContainer = document.querySelector(".album-photos");

  records.forEach((record) => {
    let figure = existing.get(record.id);
    if (figure?.dataset.cloudPath !== record.path) {
      figure?.remove();
      figure = undefined;
    }
    existing.delete(record.id);
    const image = figure?.querySelector("img") || document.createElement("img");
    if (!figure) {
      figure = document.createElement("figure");
      image.loading = "lazy";
      image.decoding = "async";
      figure.append(image);
    }
    figure.className = "album-photo";
    figure.dataset.album = album;
    figure.dataset.cloudAlbum = album;
    figure.dataset.cloudPhoto = record.id;
    figure.dataset.cloudPath = record.path;
    figure.dataset.caption = record.name;
    image.alt = `Ảnh đã tải lên: ${record.name}`;
    albumContainer.append(figure);
  });
  existing.forEach((photo) => photo.remove());

  albumPhotos = [...document.querySelectorAll(".album-photo")];
  updateAlbumCounts();
  preloadAlbumImages();
  if (albumSlideshow.open && activeAlbum === album) {
    activeAlbumPhotos = albumPhotos.filter((photo) => photo.dataset.album === album);
    albumPhotoIndex = Math.min(albumPhotoIndex, Math.max(0, activeAlbumPhotos.length - 1));
    renderAlbumPhoto();
  }
}

function removeDeletedSamplePhotos(ids = []) {
  const removedIds = new Set(ids);
  document.querySelectorAll(".album-photo[data-sample-photo]").forEach((photo) => {
    if (removedIds.has(photo.dataset.samplePhoto)) photo.remove();
  });
  albumPhotos = [...document.querySelectorAll(".album-photo")];
  updateAlbumCounts();

  if (albumSlideshow.open && activeAlbum) {
    activeAlbumPhotos = albumPhotos.filter((photo) => photo.dataset.album === activeAlbum);
    if (albumPhotoIndex >= activeAlbumPhotos.length) {
      albumPhotoIndex = Math.max(0, activeAlbumPhotos.length - 1);
    }
    renderAlbumPhoto();
  }
}

function refreshSharedImages() {
  ["hero", "profile:me", "profile:her", "story:1", "story:2", "story:3", "story:4"].forEach((slot) => {
    const record = window.appCloud.get(`image:${slot}`);
    if (record || slot.startsWith("story:")) {
      displayUploadedSlot(slot, record).catch((error) => {
        showImageUploadStatus(`Không tải được ảnh đã lưu: ${error.message}`);
      });
    }
  });
  preloadAlbumImages();
}

["hero", "profile:me", "profile:her", "story:1", "story:2", "story:3", "story:4"].forEach((slot) => {
  const key = `image:${slot}`;
  window.appCloud.subscribe(key, (record) => {
    displayUploadedSlot(slot, record).catch((error) => {
      showImageUploadStatus(`Không tải được ảnh đã lưu: ${error.message}`);
    });
  });
});
Object.keys(albumCategories).forEach((album) => {
  window.appCloud.subscribe(`album:${album}`, (records) => {
    renderSharedAlbum(album, Array.isArray(records) ? records : []);
  });
});
window.appCloud.subscribe("album:removed-samples", (ids) => {
  removeDeletedSamplePhotos(Array.isArray(ids) ? ids : []);
});

document.querySelectorAll("[data-image-upload]").forEach((input) => {
  input.addEventListener("change", async () => {
    const files = [...input.files];
    if (!files.length || input.disabled) return;
    input.disabled = true;
    const destination = input.dataset.imageUpload;
    const album = destination.startsWith("album:") ? destination.split(":")[1] : "";
    const uploaded = new Array(files.length);
    const errors = [];
    let nextIndex = 0;
    let processedCount = 0;
    let uploadedCount = 0;
    let savedCount = 0;

    try {
      showImageUploadStatus(`Đang chuẩn bị ${files.length} ảnh...`, true);
      async function worker() {
        while (nextIndex < files.length) {
          const index = nextIndex++;
          const file = files[index];
          try {
            if (!supportedImageTypes.has(file.type)) {
              throw new Error("Định dạng ảnh chưa được hỗ trợ");
            }
            if (file.size > 20 * 1024 * 1024) {
              throw new Error("Vượt quá giới hạn 20 MB");
            }
            const prepared = await prepareUploadImage(file);
            const record = {
              path: makeImagePath(album ? `albums/${album}` : "slots", prepared.name),
              name: file.name,
            };
            if (album) {
              record.id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            }
            await window.appCloud.uploadImage(record.path, prepared);
            uploaded[index] = record;
            uploadedCount += 1;
          } catch (error) {
            errors.push(`${file.name}: ${error.message}`);
          } finally {
            processedCount += 1;
            showImageUploadStatus(`Đã tải ${uploadedCount}/${files.length} ảnh · Đã xử lý ${processedCount}/${files.length}`, true);
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(album ? 3 : 1, files.length) }, () => worker()));
      const records = uploaded.filter(Boolean);
      if (records.length) {
        showImageUploadStatus("Đang lưu ảnh vào kho dùng chung...", true);
        const key = album ? `album:${album}` : `image:${destination}`;
        const previous = window.appCloud.get(key);
        const value = album ? [...(previous || []), ...records] : records[records.length - 1];
        let saved = false;
        try {
          saved = await window.appCloud.set(key, value);
        } finally {
          if (!saved) {
            await window.appCloud.deleteImages(records.map((record) => record.path)).catch((error) => {
              console.warn("Could not clean up unsaved uploads", error);
            });
          }
        }
        if (!saved) throw new Error("Không lưu được danh sách ảnh. Hãy thử lại.");
        savedCount = records.length;
        if (!album && previous?.path) {
          await window.appCloud.deleteImages([previous.path]).catch((error) => {
            console.warn("Could not clean up replaced image", error);
          });
        }
      }
      const summary = `Đã lưu ${savedCount}/${files.length} ảnh lên kho dùng chung.`;
      showImageUploadStatus(errors.length ? `${summary} ${errors.length} ảnh lỗi. ${errors[0]}` : summary);
    } catch (error) {
      showImageUploadStatus(`Không thể tải ảnh lên: ${error.message}`);
    } finally {
      input.disabled = false;
      input.value = "";
    }
  });
});

document.querySelectorAll("[data-image-remove]").forEach((button) => {
  button.addEventListener("click", async () => {
    const key = `image:${button.dataset.imageRemove}`;
    const record = window.appCloud.get(key);
    if (!record?.path) return;
    if (!await window.appCloud.delete(key)) return;
    try {
      await window.appCloud.deleteImages([record.path]);
    } catch (error) {
      showImageUploadStatus(`Đã xóa ảnh khỏi trang nhưng không dọn được tệp lưu trữ: ${error.message}`);
    }
  });
});

albumSlideshowDelete.addEventListener("click", async () => {
  const photo = activeAlbumPhotos[albumPhotoIndex];
  if (!photo) return;

  if (photo.dataset.samplePhoto) {
    const removedSamples = window.appCloud.get("album:removed-samples") || [];
    const saved = await window.appCloud.set("album:removed-samples", [
      ...removedSamples,
      photo.dataset.samplePhoto,
    ]);
    if (saved) showImageUploadStatus("Đã xóa ảnh khỏi album.");
    return;
  }

  if (!photo.dataset.cloudPhoto) return;
  const key = `album:${activeAlbum}`;
  const records = window.appCloud.get(key) || [];
  const deleted = records.find((record) => record.id === photo.dataset.cloudPhoto);
  const saved = await window.appCloud.set(key, records.filter((record) => record.id !== photo.dataset.cloudPhoto));
  if (!saved || !deleted) return;
  try {
    await window.appCloud.deleteImages([deleted.path]);
  } catch (error) {
    showImageUploadStatus(`Đã xóa ảnh khỏi album nhưng không dọn được tệp lưu trữ: ${error.message}`);
  }
});

let legacyImagesMigrated = false;
async function migrateLegacyImages() {
  if (legacyImagesMigrated) return;
  const request = window.indexedDB?.open("our-story-images", 1);
  if (!request) {
    legacyImagesMigrated = true;
    return;
  }

  const database = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Không thể đọc ảnh cũ."));
  });
  if (!database.objectStoreNames.contains("images")) {
    database.close();
    legacyImagesMigrated = true;
    return;
  }

  const legacyRecords = await new Promise((resolve, reject) => {
    const readRequest = database.transaction("images").objectStore("images").getAll();
    readRequest.onsuccess = () => resolve(readRequest.result);
    readRequest.onerror = () => reject(readRequest.error || new Error("Không thể đọc ảnh cũ."));
  });
  database.close();

  for (const oldRecord of legacyRecords) {
    let key;
    let previous;
    let metadata;
    if (oldRecord.id.startsWith("slot:")) {
      key = `image:${oldRecord.id.slice("slot:".length)}`;
      previous = window.appCloud.get(key);
      // A deletion marker is existing shared data, not an image awaiting migration.
      if (previous !== undefined) continue;
      metadata = { path: makeImagePath("legacy", oldRecord.name), name: oldRecord.name };
    } else if (oldRecord.id.startsWith("album:")) {
      const album = oldRecord.id.split(":")[1];
      if (!albumCategories[album]) continue;
      key = `album:${album}`;
      previous = window.appCloud.get(key) || [];
      metadata = {
        id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        path: makeImagePath(`albums/${album}`, oldRecord.name),
        name: oldRecord.name,
      };
    } else {
      continue;
    }

    await window.appCloud.uploadImage(metadata.path, oldRecord.blob);
    if (key.startsWith("image:") && window.appCloud.get(key) !== undefined) {
      await window.appCloud.deleteImages([metadata.path]);
      continue;
    }
    const saved = await window.appCloud.set(key, key.startsWith("album:") ? [...previous, metadata] : metadata);
    if (!saved) {
      await window.appCloud.deleteImages([metadata.path]);
      throw new Error(`Không thể chuyển ảnh "${oldRecord.name}" lên kho dùng chung.`);
    }
  }
  legacyImagesMigrated = true;
}

window.addEventListener("app-cloud-ready", () => {
  refreshSharedImages();
  migrateLegacyImages().catch((error) => {
    showImageUploadStatus(`Không thể chuyển ảnh cũ lên kho dùng chung: ${error.message}`);
  });
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshSharedImages();
});
window.setInterval(refreshSharedImages, 50 * 60 * 1000);
