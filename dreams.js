"use strict";

(() => {
  const list = document.getElementById("shared-dream-list");
  const summary = document.getElementById("shared-dream-summary");
  const form = document.getElementById("shared-dream-form");
  const input = document.getElementById("shared-dream-input");
  const status = document.getElementById("shared-dream-status");
  const editor = document.getElementById("dream-editor");
  const editorStatus = document.getElementById("dream-editor-status");
  const complete = document.getElementById("dream-editor-complete");
  const remove = document.getElementById("dream-editor-delete");
  const addBalloon = document.getElementById("dream-balloon-more");
  const removeBalloon = document.getElementById("dream-balloon-less");
  let balloons = null;
  let resizing = false;
  let dreams = [];
  let saving = false;
  let selectedId = null;
  let selectedSlot = 0;
  let originalText = "";
  let openingAnimation = null;
  let openingRun = 0;

  function openDream(dream, slot, balloon) {
    if (saving || resizing) return;
    const run = ++openingRun;
    const palette = {
      orange: ["#ffd68b", "#f79432", "#d96713"], red: ["#ffaca8", "#f26b69", "#d64b53"],
      purple: ["#e6a6f7", "#b65bda", "#8333aa"], green: ["#8ce6c5", "#2bbf94", "#079d77"],
      blue: ["#99c6ff", "#397bed", "#2053b5"], yellow: ["#fff19a", "#f8cd22", "#d7a405"]
    }[balloon.dataset.balloonColor];
    ["--balloon-light", "--balloon-color", "--balloon-dark"].forEach((name, index) => editor.style.setProperty(name, palette[index]));
    const ratio = Number(balloon.dataset.balloonRatio) || 0.7;
    const rotation = balloon.style.transform || "rotate(0deg)";
    const angle = (Number(balloon.dataset.balloonAngle) || 0) * Math.PI / 180;
    editor.style.setProperty("--balloon-ratio", String(ratio));
    editor.style.setProperty("--editor-width-factor", "1");
    editor.style.setProperty("--editor-height-factor", String(1 / ratio));
    editor.style.transform = "rotate(0deg)";
    selectedId = dream?.id || null;
    selectedSlot = slot;
    originalText = dream?.text || "";
    input.value = originalText;
    editorStatus.textContent = "";
    document.getElementById("dream-editor-title").textContent = dream ? "Điều ước trong quả bóng này" : "Gửi một ước mơ vào quả bóng";
    complete.hidden = remove.hidden = !dream;
    complete.textContent = dream?.completed === true ? "Đánh dấu chưa xong" : "Hoàn thành ✨";
    const animate = typeof editor.animate === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    editor.dataset.opening = String(animate);
    form.inert = animate;
    const from = animate ? balloon.getBoundingClientRect() : null;
    editor.showModal();
    if (animate) {
      const to = editor.getBoundingClientRect();
      const x = from.left + from.width / 2 - to.left - to.width / 2;
      const y = from.top + from.height / 2 - to.top - to.height / 2;
      const sourceWidth = balloon.offsetWidth || from.width / (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle)) / ratio);
      openingAnimation = editor.animate([
        { transform: "translate(" + x + "px, " + y + "px) " + rotation + " scale(" + sourceWidth / to.width + ")" },
        { transform: "translate(0, 0) rotate(0deg) scale(1)" }
      ], { duration: 650, easing: "cubic-bezier(.22, .75, .25, 1)", fill: "backwards" });
      openingAnimation.finished.then(() => {
        if (run !== openingRun || !editor.open) return;
        editor.dataset.opening = "false";
        form.inert = false;
        openingAnimation = null;
        input.focus({ preventScroll: true });
      }).catch(() => {});
    } else input.focus({ preventScroll: true });
  }

  function closeEditor() {
    if (saving) return;
    editor.close();
  }
  document.getElementById("dream-editor-close").addEventListener("click", closeEditor);
  editor.addEventListener("cancel", (event) => { if (saving) event.preventDefault(); });
  editor.addEventListener("close", () => {
    openingRun += 1;
    openingAnimation?.cancel();
    openingAnimation = null;
    editor.dataset.opening = "false";
    form.inert = false;
    const balloons = [...list.querySelectorAll(".dream-balloon")];
    (balloons.find((button) => selectedId && button.dataset.dreamId === selectedId)
      || balloons[selectedSlot] || balloons[0])?.focus({ preventScroll: true });
  });

  function celebrate(balloon) {
    document.querySelector(".dream-celebration")?.remove();
    const layer = document.createElement("div");
    layer.className = "dream-celebration";
    layer.setAttribute("aria-hidden", "true");
    const message = document.createElement("span");
    message.className = "dream-celebration-message";
    message.textContent = "Một ước mơ đã thành hiện thực! ♡";
    layer.append(message);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const bounds = balloon?.getBoundingClientRect?.();
      const releaseX = bounds ? bounds.left + bounds.width / 2 : null;
      const releaseY = bounds ? Math.max(70, bounds.top - 140) : null;
      if (bounds) {
        const flying = document.createElement("span");
        flying.className = "dream-release-balloon balloon-" + balloon.dataset.balloonColor;
        flying.style.left = releaseX + "px";
        flying.style.top = (bounds.top + bounds.height / 2) + "px";
        flying.style.width = bounds.width + "px";
        flying.style.height = bounds.height + "px";
        flying.style.setProperty("--release-rise", (releaseY - bounds.top - bounds.height / 2) + "px");
        layer.append(flying);
      }
      [22, 76, 48, 18, 82, 52].forEach((left, burst) => {
        for (let index = 0; index < 40; index += 1) {
          const spark = document.createElement("span");
          const angle = index / 40 * Math.PI * 2;
          const radius = 0.65 + Math.random() * 0.35;
          spark.className = "dream-firework";
          spark.style.left = bounds ? releaseX + "px" : left + "%";
          spark.style.top = bounds ? releaseY + "px" : (28 + burst % 3 * 18) + "%";
          spark.style.setProperty("--spark-x", "calc(var(--firework-radius) * " + Math.cos(angle) * radius + ")");
          spark.style.setProperty("--spark-y", "calc(var(--firework-radius) * " + Math.sin(angle) * radius + ")");
          spark.style.setProperty("--spark-angle", angle + "rad");
          spark.style.setProperty("--spark-color", ["#ffda56", "#ff7ab8", "#64f5d2", "#bca0ff", "#ffffff"][index % 5]);
          spark.style.setProperty("--spark-delay", (bounds ? 0.85 + burst * 0.12 : burst * 0.38) + "s");
          layer.append(spark);
        }
      });
    }
    document.body.append(layer);
    window.setTimeout(() => layer.remove(), 4800);
  }

  async function save(nextDreams) {
    if (saving || resizing) return false;
    saving = true;
    updateBalloonControls();
    editorStatus.textContent = "Đang lưu ước mơ…";
    form.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    document.getElementById("dream-editor-close").disabled = true;
    list.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    try {
      const saved = await window.appCloud.set("love-shared-dreams", nextDreams);
      status.textContent = saved ? "Đã lưu ước mơ của chúng mình ♡" : "Chưa lưu được. Hãy thử lại nhé.";
      editorStatus.textContent = saved ? "" : "Chưa lưu được. Nội dung vẫn ở đây, hãy thử lại nhé.";
      return saved;
    } catch {
      editorStatus.textContent = "Chưa lưu được ước mơ. Hãy thử lại nhé.";
      return false;
    } finally {
      saving = false;
      form.querySelectorAll("button").forEach((button) => { button.disabled = false; });
      document.getElementById("dream-editor-close").disabled = false;
      render();
    }
  }

  function dreamSlots() {
    const slots = new Map();
    dreams.forEach((dream) => {
      if (Number.isInteger(dream.slot) && dream.slot >= 0 && dream.slot < 10000 && !slots.has(dream.slot)) slots.set(dream.slot, dream);
    });
    dreams.filter((dream) => ![...slots.values()].some((current) => current.id === dream.id)).forEach((dream) => {
      let slot = 0;
      while (slots.has(slot)) slot += 1;
      slots.set(slot, dream);
    });
    return slots;
  }

  function visibleSlots() {
    // Luôn hiện bóng có ước mơ, kể cả khi thiết bị khác vừa giảm số bóng.
    const slots = new Set(balloons === null ? [0, 1, 2, 3, 4, 5] : balloons.map((balloon) => balloon.slot));
    dreamSlots().forEach((dream, slot) => slots.add(slot));
    if (!slots.size) slots.add(0);
    return [...slots].sort((a, b) => a - b);
  }

  function updateBalloonControls() {
    const slots = visibleSlots();
    const occupied = dreamSlots();
    addBalloon.disabled = saving || resizing;
    removeBalloon.disabled = saving || resizing || slots.length <= 1 || slots.every((slot) => occupied.has(slot));
    document.getElementById("dream-balloon-count").textContent = slots.length + " bóng bay";
  }

  async function resizeBalloons(delta) {
    if (saving || resizing) return;
    const slots = visibleSlots();
    if (delta > 0) {
      let next = 0;
      while (slots.includes(next)) next += 1;
      slots.push(next);
    } else {
      const occupied = dreamSlots();
      const empty = [...slots].reverse().find((slot) => !occupied.has(slot));
      if (slots.length <= 1 || empty === undefined) return;
      slots.splice(slots.indexOf(empty), 1);
    }
    resizing = true;
    status.textContent = "Đang lưu số bóng bay…";
    render();
    try {
      const saved = await window.appCloud.set("love-dream-balloons", slots.map((slot) => ({ id: "balloon-" + slot, slot })));
      status.textContent = saved ? "Đã lưu số bóng bay ♡" : "Chưa lưu được số bóng. Hãy thử lại nhé.";
    } catch {
      status.textContent = "Chưa lưu được số bóng. Hãy thử lại nhé.";
    } finally {
      resizing = false;
      render();
    }
  }
  addBalloon.addEventListener("click", () => resizeBalloons(1));
  removeBalloon.addEventListener("click", () => resizeBalloons(-1));

  function render() {
    list.replaceChildren();
    updateBalloonControls();
    const completed = dreams.filter((dream) => dream.completed === true).length;
    summary.textContent = dreams.length + " ước mơ · " + completed + " đã thành hiện thực";
    document.getElementById("shared-dream-empty").hidden = dreams.length > 0;
    const perBouquet = 12;
    const compactPositions = [[33, 0, "orange"], [21, 21, "red"], [55, 16, "purple"], [3, 40, "green"], [36, 43, "blue"], [67, 37, "yellow"]];
    // Vòng ngoài ôm lấy bốn quả ở giữa, so le như một chùm bóng thật.
    const roundPositions = [[37, 0], [12, 8], [63, 9], [1, 29], [73, 30], [12, 49], [38, 58], [64, 49], [28, 23], [49, 25], [25, 40], [47, 43]];
    const colors = ["orange", "red", "purple", "green", "blue", "yellow"];
    const slots = dreamSlots();
    const visible = new Set(visibleSlots());
    const groupCount = Math.ceil((Math.max(...visible) + 1) / perBouquet);
    for (let group = 0; group < groupCount; group += 1) {
      const firstSlot = group * perBouquet;
      const groupSlots = [...visible].filter((slot) => slot >= firstSlot && slot < firstSlot + perBouquet);
      if (!groupSlots.length) continue;
      const dense = groupSlots.some((slot) => slot - firstSlot >= compactPositions.length);
      const positions = dense ? roundPositions.map(([left, top], index) =>
        [left, top, colors[index % colors.length]]) : compactPositions;
      const height = dense ? 600 : 530;
      const angleFor = (left, top) => Math.atan2(left + (dense ? 12.5 : 14.5) - 50, 97 - top) * 180 / Math.PI;
      const bouquet = document.createElement("li");
      bouquet.className = "dream-bouquet" + (dense ? " is-dense" : "");
      bouquet.innerHTML = '<svg class="dream-balloon-strings" viewBox="0 0 420 ' + height + '" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6">'
        + positions.map(([left, top], index) => {
          if (!visible.has(firstSlot + index)) return "";
          const angle = angleFor(left, top) * Math.PI / 180;
          const halfHeight = (dense ? 12.5 : 15) * height / 100;
          const x = (left + (dense ? 12.5 : 14.5)) * 4.2 - Math.sin(angle) * halfHeight;
          const y = (top + (dense ? 12.5 : 15)) * height / 100 + Math.cos(angle) * halfHeight + 5;
          return '<path d="M' + x + ' ' + y + ' C' + (x + (index % 2 ? 45 : -45)) + ' ' + (y + 75) + ' 210 ' + (height - 90) + ' 210 ' + (height - 15) + '"/>';
        }).join("") + '</g></svg>';
      positions.forEach(([left, top, color], index) => {
        const slot = firstSlot + index;
        if (!visible.has(slot)) return;
        const dream = slots.get(slot);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "dream-balloon balloon-" + color + (dream?.completed === true ? " is-complete" : "");
        button.style.left = left + "%";
        button.style.top = top + "%";
        button.style.transform = "rotate(" + angleFor(left, top) + "deg)";
        button.dataset.balloonAngle = String(angleFor(left, top));
        button.dataset.balloonRatio = String(dense ? 420 / 600 : 0.29 * 420 / (0.30 * 530));
        button.style.zIndex = String(index + 1);
        button.dataset.dreamId = dream?.id || "";
        button.dataset.balloonColor = color;
        button.disabled = saving || resizing;
        button.setAttribute("aria-label", dream ? "Mở ước mơ: " + dream.text + (dream.completed === true ? " · Đã hoàn thành" : "") : "Quả bóng trống " + (slot + 1) + ": viết ước mơ");
        const label = document.createElement("span");
        label.className = "dream-balloon-label";
        label.textContent = dream ? (dream.completed === true ? "✓ " : "") + dream.text : "";
        button.append(label);
        button.addEventListener("click", () => openDream(dream, slot, button));
        bouquet.append(button);
      });
      list.append(bouquet);
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || saving || !editor.open) return;
    if (selectedId && !dreams.some((dream) => dream.id === selectedId)) {
      editorStatus.textContent = "Ước mơ này vừa được xóa trên thiết bị khác. Hãy đóng và chọn một quả bóng trống nhé.";
      return;
    }
    const id = selectedId || window.crypto?.randomUUID?.() || Date.now() + "-" + Math.random().toString(16).slice(2);
    if (!selectedId && dreamSlots().has(selectedSlot)) {
      editorStatus.textContent = "Quả bóng này vừa có điều ước từ thiết bị khác. Hãy đóng và chọn một quả bóng trống nhé.";
      return;
    }
    const next = selectedId ? dreams.map((dream) => dream.id === selectedId ? { ...dream, text, slot: selectedSlot } : dream)
      : [...dreams, { id, text, completed: false, slot: selectedSlot }];
    if (await save(next)) {
      selectedId = id;
      closeEditor();
    }
  });

  complete.addEventListener("click", async () => {
    const dream = dreams.find((current) => current.id === selectedId);
    if (!dream || saving) return;
    if (input.value.trim() !== originalText) {
      editorStatus.textContent = "Lưu nội dung đã sửa trước khi thay đổi trạng thái nhé.";
      return;
    }
    const done = dream.completed === true;
    if (await save(dreams.map((current) => current.id === dream.id ? { ...current, completed: !done } : current))) {
      closeEditor();
      if (!done) {
        status.textContent = "Chúc mừng! Ước mơ “" + dream.text + "” đã thành hiện thực ♡";
        celebrate([...list.querySelectorAll(".dream-balloon")].find((balloon) => balloon.dataset.dreamId === dream.id));
      }
    }
  });
  remove.addEventListener("click", async () => {
    if (!selectedId || saving) return;
    if (await save(dreams.filter((dream) => dream.id !== selectedId))) closeEditor();
  });

  window.appCloud.subscribe("love-shared-dreams", (value) => {
    dreams = Array.isArray(value)
      ? value.filter((dream) => dream && typeof dream.id === "string" && typeof dream.text === "string") : [];
    render();
  });
  window.appCloud.subscribe("love-dream-balloons", (value) => {
    balloons = Array.isArray(value) ? value.filter((balloon) => balloon && Number.isInteger(balloon.slot)
      && balloon.slot >= 0 && balloon.slot < 10000 && balloon.id === "balloon-" + balloon.slot) : null;
    render();
  });
})();
