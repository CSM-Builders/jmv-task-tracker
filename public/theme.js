(() => {
  try {
    const saved = localStorage.getItem("jmv-theme");
    document.documentElement.dataset.theme =
      saved === "light" || saved === "dark" ? saved : "dark";
  } catch {
    document.documentElement.dataset.theme = "dark";
  }
})();
