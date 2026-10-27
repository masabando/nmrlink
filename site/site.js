// Progressive enhancement: the documentation and examples also work without it.
const menu = document.querySelector(".menu-button");
menu.addEventListener("click", () => {
  const open = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", String(open));
  document.querySelector(".sidebar").classList.toggle("is-open", open);
});

const search = document.querySelector("#nav-search");
search.addEventListener("input", () => {
  const query = search.value.trim().toLocaleLowerCase();
  let matches = 0;
  for (const group of document.querySelectorAll(".nav-group")) {
    let groupMatches = 0;
    for (const link of group.querySelectorAll("a")) {
      link.hidden = !link.textContent.toLocaleLowerCase().includes(query);
      if (!link.hidden) groupMatches++;
    }
    group.hidden = groupMatches === 0;
    matches += groupMatches;
    if (group.tagName === "DETAILS") {
      if (query) {
        if (!group.dataset.wasOpen) group.dataset.wasOpen = String(group.open);
        group.open = true;
      } else if (group.dataset.wasOpen) {
        group.open = group.dataset.wasOpen === "true";
        delete group.dataset.wasOpen;
      }
    }
  }
  document.querySelector("#search-empty").hidden = matches !== 0;
});

for (const pre of document.querySelectorAll("pre")) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "copy-button";
  button.textContent = "コピー";
  button.setAttribute("aria-label", "コードをコピー");
  const feedback = document.createElement("span");
  feedback.className = "copy-feedback";
  feedback.setAttribute("role", "status");
  const wrapper = document.createElement("div");
  wrapper.className = "code-block";
  pre.before(wrapper);
  wrapper.append(button, feedback, pre);
  button.addEventListener("click", async () => {
    const text = (pre.querySelector("code") ?? pre).textContent;
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        // LAN HTTP preview: clipboard API is unavailable, use selection fallback.
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.top = "0";
        area.style.opacity = "0";
        document.body.append(area);
        try {
          area.select();
          if (!document.execCommand("copy")) throw new Error("Copy unavailable");
        } finally { area.remove(); button.focus(); }
      }
      feedback.textContent = "コピーしました";
    } catch { feedback.textContent = "コピーできませんでした。コードを選択してコピーしてください。"; }
  });
}

// Only accept height messages from our own preview frames.
window.addEventListener("message", event => {
  if (event.origin !== location.origin || event.data?.type !== "nmrlink-example-height") return;
  const height = Number(event.data.height);
  if (!Number.isFinite(height) || height < 40 || height > 3000) return;
  for (const frame of document.querySelectorAll(".example iframe")) {
    if (frame.contentWindow === event.source) frame.style.height = `${Math.ceil(height)}px`;
  }
});

// Explicit UTC dates avoid stale relative-period results from the download API.
const downloadsBadge = document.querySelector("#npm-downloads-badge");
if (downloadsBadge) {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  const date = value => value.toISOString().slice(0, 10);
  const range = `${date(start)}:${date(end)}`;
  const query = new URLSearchParams({
    url: `https://api.npmjs.org/downloads/point/${range}/nmrlink`,
    query: "$.downloads",
    label: "downloads",
    suffix: "/30 days",
    logo: "npm",
    style: "flat",
  });
  downloadsBadge.alt = "npm直近30日間のダウンロード数";
  downloadsBadge.title = `${date(start)}〜${date(end)} (UTC)`;
  downloadsBadge.src = `https://img.shields.io/badge/dynamic/json?${query}`;
}
