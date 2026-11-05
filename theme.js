"use strict";

(() => {
  const themes = {
    rose: "#fbf5ef",
    sage: "#f5f7f1",
    lavender: "#f8f5fc",
    ocean: "#f2f8fb",
    caramel: "#faf4eb",
  };
  const storageKey = "site-theme";

  function applyTheme(theme) {
    const selected = Object.hasOwn(themes, theme) ? theme : "rose";
    document.documentElement.dataset.theme = selected;
    document.querySelector('meta[name="theme-color"]').content = themes[selected];
    return selected;
  }

  // Restore before styles load so returning visits do not flash the default palette.
  let selected = "rose";
  try { selected = localStorage.getItem(storageKey); } catch (_) {}
  selected = applyTheme(selected);

  document.addEventListener("DOMContentLoaded", () => {
    const picker = document.getElementById("theme-picker");
    const summary = picker.querySelector("summary");
    picker.querySelectorAll('input[name="site-theme"]').forEach((input) => {
      input.checked = input.value === selected;
      input.addEventListener("change", () => {
        if (!input.checked) return;
        selected = applyTheme(input.value);
        try { localStorage.setItem(storageKey, selected); } catch (_) {}
        picker.open = false;
        summary.focus({ preventScroll: true });
      });
    });
    document.addEventListener("click", (event) => {
      if (!picker.contains(event.target)) picker.open = false;
    });
    picker.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      picker.open = false;
      summary.focus({ preventScroll: true });
    });
  });
})();
