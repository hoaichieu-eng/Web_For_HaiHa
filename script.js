"use strict";

// MÀN HÌNH CHÀO: nút Yes mở trang; nút No đổi chỗ khi có người định chọn.
const welcomeGate = document.getElementById("welcome-gate");
const welcomeYes = document.getElementById("welcome-yes");
const welcomeNo = document.getElementById("welcome-no");
const welcomeActions = document.getElementById("welcome-actions");
document.body.classList.add("gate-open");
welcomeYes.focus();

welcomeYes.addEventListener("click", () => {
  welcomeGate.hidden = true;
  document.body.classList.remove("gate-open");
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

// GIẢI TRÍ: cập nhật điểm hiển thị và giới hạn thang đánh giá từ 0 đến 10.
document.querySelectorAll(".rating-input").forEach((input) => {
  const ratingValue = input.parentElement.querySelector(".rating-value");
  input.addEventListener("input", () => {
    if (!input.value) {
      ratingValue.textContent = "Chưa chấm";
      input.setAttribute("aria-invalid", "false");
      return;
    }

    if (!input.validity.valid) {
      ratingValue.textContent = "0–10";
      input.setAttribute("aria-invalid", "true");
      return;
    }

    ratingValue.textContent = `${Number(input.value)}/10`;
    input.setAttribute("aria-invalid", "false");
  });
});

// MINIGAME: sửa nội dung câu hỏi, lựa chọn và chỉ số đáp án đúng trong mảng này.
const questions = [
  { question: "Lần đầu chúng mình gặp nhau vào ngày nào?", options: ["18 tháng 6, 2022", "2 tháng 7, 2022", "12 tháng 2, 2023"], answer: 0 },
  { question: "Buổi hẹn đầu tiên của chúng mình là khi nào?", options: ["18 tháng 6, 2022", "2 tháng 7, 2022", "Một ngày mùa đông"], answer: 1 },
  { question: "Chuyến đi đầu tiên trong câu chuyện diễn ra vào tháng mấy?", options: ["Tháng 6", "Tháng 7", "Tháng 2"], answer: 2 },
  { question: "Điều gì khiến những ngày bình thường trở nên đặc biệt?", options: ["Một món quà bất ngờ", "Mình được ở cạnh nhau", "Một chuyến đi xa"], answer: 1 },
  { question: "Điều mình mong nhất cho những ngày sau là gì?", options: ["Có thêm nhiều ngày bên nhau", "Đi thật nhiều nơi", "Chụp thật nhiều ảnh"], answer: 0 }
];
let questionIndex = 0;
let score = 0;
let answered = false;
const questionElement = document.getElementById("quiz-question");
const optionsElement = document.getElementById("quiz-options");
const feedbackElement = document.getElementById("quiz-feedback");
const nextButton = document.getElementById("quiz-next");

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
  questionIndex += 1;
  if (questionIndex < questions.length) {
    renderQuestion();
    return;
  }
  document.getElementById("quiz-play").hidden = true;
  document.getElementById("quiz-result").hidden = false;
  document.getElementById("result-title").textContent = `${score} / ${questions.length} câu đúng`;
  document.getElementById("result-message").textContent = score === questions.length
    ? "Cậu hiểu câu chuyện của chúng mình thật rõ. Giỏi nhất luôn!"
    : score >= 3
      ? "Cậu nhớ được nhiều điều đáng yêu lắm. Mình cùng tạo thêm kỷ niệm mới nhé!"
      : "Không sao đâu, mình còn cả chặng đường dài để hiểu nhau hơn mà.";
});
document.getElementById("quiz-restart").addEventListener("click", () => {
  questionIndex = 0;
  score = 0;
  document.getElementById("quiz-result").hidden = true;
  document.getElementById("quiz-play").hidden = false;
  renderQuestion();
});
renderQuestion();

// VÒNG QUAY: tạo ô lựa chọn và quay ngẫu nhiên đến một kết quả.
const wheelCountInput = document.getElementById("wheel-count");
const wheelEntriesContainer = document.getElementById("wheel-entries");
const wheelElement = document.getElementById("wheel");
const wheelSpinButton = document.getElementById("wheel-spin");
const wheelResult = document.getElementById("wheel-result");
const wheelColors = ["#f0d7d4", "#f3e8df", "#e7c4c1", "#fbf5ef", "#dfb2b0", "#f7eee8"];
let wheelEntryFields = [];
let wheelRotation = 0;
let wheelIsSpinning = false;

function updateWheel() {
  const entries = wheelEntryFields.map((field) => field.value.trim());
  if (entries.length === 0) {
    wheelElement.style.background = "var(--paper-deep)";
    wheelElement.replaceChildren();
    wheelSpinButton.disabled = true;
    wheelResult.textContent = "Chọn số ô để tạo vòng quay.";
    return;
  }

  const segmentSize = 360 / entries.length;
  const segments = entries.map((_, index) =>
    `${wheelColors[index % wheelColors.length]} ${index * segmentSize}deg ${(index + 1) * segmentSize}deg`
  );
  wheelElement.style.background = `conic-gradient(${segments.join(", ")})`;
  wheelElement.replaceChildren();

  entries.forEach((entry, index) => {
    if (!entry) return;

    const label = document.createElement("span");
    const angle = (index + 0.5) * segmentSize;
    const radians = (angle * Math.PI) / 180;
    const labelRadius = 26;
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

  wheelSpinButton.disabled = wheelIsSpinning || entries.length < 2 || entries.some((entry) => !entry);
  if (!wheelIsSpinning) {
    wheelResult.textContent = entries.some((entry) => !entry)
      ? "Hãy điền nội dung cho tất cả các ô."
      : "";
  }
}

function createWheelEntries() {
  const count = Number(wheelCountInput.value);
  if (!Number.isInteger(count) || count < 2 || count > 12) {
    return;
  }

  const previousEntries = wheelEntryFields.map((field) => field.value);
  wheelEntriesContainer.replaceChildren();
  wheelEntryFields = Array.from({ length: count }, (_, index) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    label.className = "wheel-entry";
    label.append(document.createTextNode(`${index + 1}.`));
    input.type = "text";
    input.maxLength = 50;
    input.placeholder = `Nội dung ô ${index + 1}`;
    input.value = previousEntries[index] || "";
    input.setAttribute("aria-label", `Nội dung ô ${index + 1}`);
    input.addEventListener("input", updateWheel);
    label.append(input);
    wheelEntriesContainer.append(label);
    return input;
  });
  updateWheel();
}

wheelCountInput.addEventListener("change", createWheelEntries);
wheelSpinButton.addEventListener("click", () => {
  if (wheelIsSpinning) return;
  const entries = wheelEntryFields.map((field) => field.value.trim());
  if (entries.length < 2 || entries.some((entry) => !entry)) {
    updateWheel();
    return;
  }

  wheelIsSpinning = true;
  wheelCountInput.disabled = true;
  wheelEntryFields.forEach((field) => { field.disabled = true; });
  wheelSpinButton.disabled = true;
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
    wheelEntryFields.forEach((field) => { field.disabled = false; });
    updateWheel();
    wheelResult.textContent = `Kết quả: ${entries[selectedIndex]} ♡`;
  };
  const onWheelStop = (event) => {
    if (event.target === wheelElement && event.propertyName === "transform") finishSpin();
  };

  wheelElement.addEventListener("transitionend", onWheelStop);
  wheelElement.style.transform = `rotate(${wheelRotation}deg)`;
  spinTimeout = window.setTimeout(finishSpin, 5500);
});
updateWheel();

// ƯỚC MƠ CHUNG: lưu trạng thái các ô đã hoàn thành trong bộ nhớ trình duyệt.
const dreamChecks = [...document.querySelectorAll("#dream-list input")];
function updateDreams() {
  let done = 0;
  dreamChecks.forEach((checkbox) => {
    checkbox.checked = localStorage.getItem(`love-dream-${checkbox.dataset.id}`) === "true";
    checkbox.closest(".dream-item").classList.toggle("is-done", checkbox.checked);
    if (checkbox.checked) done += 1;
  });
  document.getElementById("dream-progress").textContent = `Chúng mình đã hoàn thành ${done}/${dreamChecks.length} ước mơ. Mỗi dấu tích là một kỷ niệm mới ♡`;
}
dreamChecks.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    localStorage.setItem(`love-dream-${checkbox.dataset.id}`, String(checkbox.checked));
    updateDreams();
  });
});
updateDreams();

// ƯỚC MƠ CÁ NHÂN: thêm/xóa mục riêng cho mỗi người; dữ liệu được lưu theo từng danh sách.
function addPersonalDreamList(formId, inputId, listId, storageKey) {
  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  const dreams = JSON.parse(localStorage.getItem(storageKey) || "[]");

  function render() {
    list.replaceChildren();
    dreams.forEach((dream, index) => {
      const item = document.createElement("li");
      item.className = "personal-dream-item";
      const text = document.createElement("span");
      text.textContent = dream;
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "Xóa";
      removeButton.setAttribute("aria-label", `Xóa ước mơ: ${dream}`);
      removeButton.addEventListener("click", () => {
        dreams.splice(index, 1);
        localStorage.setItem(storageKey, JSON.stringify(dreams));
        render();
      });
      item.append(text, removeButton);
      list.append(item);
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const dream = input.value.trim();
    if (!dream) return;
    dreams.push(dream);
    localStorage.setItem(storageKey, JSON.stringify(dreams));
    input.value = "";
    render();
  });

  render();
}

addPersonalDreamList("my-dream-form", "my-dream-input", "my-dream-list", "love-my-dreams");
addPersonalDreamList("her-dream-form", "her-dream-input", "her-dream-list", "love-her-dreams");

// THÀNH TỰU: mỗi người có danh sách riêng được lưu trong bộ nhớ trình duyệt.
function addAchievementList(formId, inputId, listId, storageKey) {
  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  const count = list.closest(".achievement-box").querySelector(".achievement-count");
  const achievements = JSON.parse(localStorage.getItem(storageKey) || "[]");

  function render() {
    list.replaceChildren();
    count.textContent = `${achievements.length} mục`;
    achievements.forEach((achievement, index) => {
      const item = document.createElement("li");
      const text = document.createElement("span");
      text.textContent = achievement;
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "Xóa";
      removeButton.setAttribute("aria-label", `Xóa thành tựu: ${achievement}`);
      removeButton.addEventListener("click", () => {
        achievements.splice(index, 1);
        localStorage.setItem(storageKey, JSON.stringify(achievements));
        render();
      });
      item.append(text, removeButton);
      list.append(item);
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const achievement = input.value.trim();
    if (!achievement) return;
    achievements.push(achievement);
    localStorage.setItem(storageKey, JSON.stringify(achievements));
    input.value = "";
    render();
  });

  render();
}

addAchievementList("my-achievement-form", "my-achievement-input", "my-achievement-list", "love-my-achievements");
addAchievementList("her-achievement-form", "her-achievement-input", "her-achievement-list", "love-her-achievements");

// ĐỊA ĐIỂM CHUNG: thêm/xóa địa điểm, lưu lại và tạo liên kết tìm trên Google Maps.
const placeForm = document.getElementById("place-form");
const placeInput = document.getElementById("place-input");
const customPlaceList = document.getElementById("custom-place-list");
const customPlaces = JSON.parse(localStorage.getItem("love-custom-places") || "[]");

function renderCustomPlaces() {
  customPlaceList.replaceChildren();
  customPlaces.forEach((place, index) => {
    const item = document.createElement("div");
    item.className = "place";
    const name = document.createElement("span");
    name.textContent = place;
    const actions = document.createElement("span");
    const mapLink = document.createElement("a");
    mapLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
    mapLink.target = "_blank";
    mapLink.rel = "noopener noreferrer";
    mapLink.textContent = "Xem bản đồ ↗";
    const removeButton = document.createElement("button");
    removeButton.className = "place-remove";
    removeButton.type = "button";
    removeButton.textContent = "Xóa";
    removeButton.setAttribute("aria-label", `Xóa địa điểm: ${place}`);
    removeButton.addEventListener("click", () => {
      customPlaces.splice(index, 1);
      localStorage.setItem("love-custom-places", JSON.stringify(customPlaces));
      renderCustomPlaces();
    });
    actions.append(mapLink, removeButton);
    item.append(name, actions);
    customPlaceList.append(item);
  });
}

placeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const place = placeInput.value.trim();
  if (!place) return;
  customPlaces.push(place);
  localStorage.setItem("love-custom-places", JSON.stringify(customPlaces));
  placeInput.value = "";
  renderCustomPlaces();
});
renderCustomPlaces();

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
const albumPhotos = [...document.querySelectorAll(".album-photo")];
const albumSlideshow = document.getElementById("album-slideshow");
const albumSlideshowImage = document.getElementById("album-slideshow-image");
const albumSlideshowEmpty = document.getElementById("album-slideshow-empty");
const albumSlideshowCaption = document.getElementById("album-slideshow-caption");
const albumSlideshowTitle = document.getElementById("album-slideshow-title");
const albumSlideshowControls = document.getElementById("album-slideshow-controls");
const albumSlideshowCount = document.getElementById("album-slideshow-count");
const albumSlideshowToggle = document.getElementById("album-slideshow-toggle");
const albumSlideshowPrevious = document.getElementById("album-slideshow-prev");
const albumSlideshowNext = document.getElementById("album-slideshow-next");
let activeAlbum = "";
let activeAlbumPhotos = [];
let albumPhotoIndex = 0;
let albumAutoplayTimer;
let lastAlbumTrigger;
let albumPaused = motionPreference.matches;

document.querySelectorAll(".album-box").forEach((box) => {
  const { album } = box.dataset;
  const count = albumPhotos.filter((photo) => photo.dataset.album === album).length;
  const countLabel = box.querySelector("[data-album-count]");
  countLabel.textContent = count ? `${count} ảnh` : "Chưa có ảnh";
  box.setAttribute("aria-label", `Mở album ${albumCategories[album]}, ${count ? `${count} ảnh` : "chưa có ảnh"}`);

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

function renderAlbumPhoto() {
  const total = activeAlbumPhotos.length;
  const hasAlbumPhotos = total > 0;
  albumSlideshowImage.hidden = !hasAlbumPhotos;
  albumSlideshowEmpty.hidden = hasAlbumPhotos;
  albumSlideshowCaption.hidden = !hasAlbumPhotos;
  albumSlideshowControls.hidden = !hasAlbumPhotos;
  albumSlideshowPrevious.hidden = !hasAlbumPhotos;
  albumSlideshowNext.hidden = !hasAlbumPhotos;

  if (!hasAlbumPhotos) {
    albumSlideshowImage.removeAttribute("src");
    albumSlideshowCaption.textContent = "";
    return;
  }

  albumPhotoIndex = (albumPhotoIndex + total) % total;
  const photo = activeAlbumPhotos[albumPhotoIndex];
  const image = photo.querySelector("img");
  albumSlideshowImage.classList.remove("is-entering");
  albumSlideshowImage.src = image.getAttribute("src");
  albumSlideshowImage.alt = image.alt;
  albumSlideshowCaption.textContent = photo.dataset.caption || image.alt;
  albumSlideshowCount.textContent = `${albumPhotoIndex + 1} / ${total}`;
  albumSlideshowPrevious.disabled = total < 2;
  albumSlideshowNext.disabled = total < 2;
  albumSlideshowToggle.hidden = total < 2;
  void albumSlideshowImage.offsetWidth;
  albumSlideshowImage.classList.add("is-entering");
}

function setAlbumPaused(paused) {
  albumPaused = paused;
  window.clearInterval(albumAutoplayTimer);
  albumSlideshowToggle.textContent = paused ? "Phát trình chiếu" : "Tạm dừng";
  albumSlideshowToggle.setAttribute("aria-pressed", String(paused));
  if (!paused && activeAlbumPhotos.length > 1 && albumSlideshow.open) {
    albumAutoplayTimer = window.setInterval(() => changeAlbumPhoto(1), 2250);
  }
}

function changeAlbumPhoto(direction) {
  if (activeAlbumPhotos.length < 2) return;
  albumPhotoIndex += direction;
  renderAlbumPhoto();
}

albumSlideshowPrevious.addEventListener("click", () => changeAlbumPhoto(-1));
albumSlideshowNext.addEventListener("click", () => changeAlbumPhoto(1));
albumSlideshowToggle.addEventListener("click", () => setAlbumPaused(!albumPaused));
albumSlideshow.querySelector("#album-slideshow-close").addEventListener("click", () => albumSlideshow.close());
albumSlideshow.addEventListener("close", () => {
  window.clearInterval(albumAutoplayTimer);
  if (lastAlbumTrigger) lastAlbumTrigger.focus();
});
albumSlideshow.addEventListener("click", (event) => {
  if (event.target === albumSlideshow) albumSlideshow.close();
});
document.addEventListener("keydown", (event) => {
  if (!albumSlideshow.open || activeAlbumPhotos.length < 2) return;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    changeAlbumPhoto(event.key === "ArrowLeft" ? -1 : 1);
  }
});
