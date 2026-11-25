document.addEventListener("DOMContentLoaded", () => {
  const style = document.createElement("style");
  style.textContent = [
    ".github-icons{position:fixed;top:16px;right:16px;z-index:9999;display:flex;gap:10px;}",
    ".github-icon{display:flex;align-items:center;justify-content:center;width:36px;height:36px;",
    "border-radius:50%;background:rgba(0,0,0,0.5);opacity:0.7;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);",
    "cursor:pointer;text-decoration:none;}",
    ".github-icon svg{width:20px;height:20px;fill:#fff;transition:fill 0.3s;}",
    ".github-icon:hover{opacity:1;transform:scale(1.25) rotate(8deg);",
    "background:rgba(255,255,255,0.95);box-shadow:0 0 16px rgba(255,255,255,0.6),0 4px 12px rgba(0,0,0,0.3);}",
    ".github-icon:hover svg{fill:#24292e;}",
    ".github-icon:active{transform:scale(0.9);transition:transform 0.1s;}",
    "@keyframes icon-bounce{0%,100%{transform:scale(1.25) rotate(8deg) translateY(0);}",
    "50%{transform:scale(1.3) rotate(8deg) translateY(-4px);}}",
    ".github-icon:hover{animation:icon-bounce 0.6s ease-in-out infinite;}",
    "@keyframes icon-glow-pulse{0%,100%{box-shadow:0 0 16px rgba(255,255,255,0.6),0 4px 12px rgba(0,0,0,0.3);}",
    "50%{box-shadow:0 0 24px rgba(255,255,255,0.9),0 4px 20px rgba(0,0,0,0.4);}}",
    ".github-icon:hover{animation:icon-bounce 0.6s ease-in-out infinite,icon-glow-pulse 1.2s ease-in-out infinite;}",
    ".back-home{position:fixed;top:16px;left:16px;z-index:9999;display:flex;align-items:center;gap:6px;",
    "padding:6px 14px;border-radius:20px;background:rgba(0,0,0,0.45);color:#fff;",
    "font-size:14px;text-decoration:none;opacity:0.75;transition:opacity 0.2s;}",
    ".back-home:hover{opacity:1;}",
  ].join("");
  document.head.appendChild(style);

  // GitHub icon group (all pages)
  const repo = "AloysHF/childhood";
  const icons = document.createElement("div");
  icons.className = "github-icons";
  icons.innerHTML = [
    // Source repository
    '<a class="github-icon" href="https://github.com/' +
      repo +
      '" target="_blank" title="源码仓库">',
    '  <svg viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>',
    "</a>",
    // Submit feedback
    '<a class="github-icon" href="https://github.com/' +
      repo +
      '/issues/new" target="_blank" title="提建议">',
    '  <svg viewBox="0 0 16 16"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9-3a1 1 0 11-2 0 1 1 0 012 0zM8 7a1 1 0 00-1 1v3a1 1 0 102 0V8a1 1 0 00-1-1z"/></svg>',
    "</a>",
    // QQ group
    '<a class="github-icon" href="https://qm.qq.com/q/LAO7DKAWUC" target="_blank" title="QQ群交流">',
    '  <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.34 1.05 4.47 2.78 6.05-.27 1.88-.82 3.3-1.28 4.2-.15.3.02.55.12.65.1.1.3.15.55.05.7-.3 1.8-.85 2.83-1.65.75.2 1.55.35 2.4.45-.07.3-.12.6-.15.9-.05.5.2.75.45.85.25.1.55.05.8-.15.55-.45 1.05-1.15 1.45-2.1 1.05.25 2.15.4 3.3.4 5.52 0 10-3.82 10-8.5S17.52 2 12 2z"/></svg>',
    "</a>",
    // Bookmark
    '<a class="github-icon" href="javascript:void(0)" title="收藏到书签">',
    '  <svg viewBox="0 0 16 16"><path d="M3 2.5A1.5 1.5 0 014.5 1h7A1.5 1.5 0 0113 2.5V14l-5-3-5 3V2.5z"/></svg>',
    "</a>",
  ].join("");
  document.body.appendChild(icons);

  // Bookmark click event
  icons.querySelector('[title="收藏到书签"]').addEventListener("click", (e) => {
    e.preventDefault();
    const title = document.title;
    const url = window.location.href;
    if (window.sidebar && window.sidebar.addPanel) {
      window.sidebar.addPanel(title, url, "");
    } else if (window.external && window.external.AddFavorite) {
      window.external.AddFavorite(url, title);
    } else {
      alert("请按 Ctrl+D 将本页加入书签");
    }
  });

  // PWA: register service worker (with ?nosw=1 kill switch).
  // Uses a root-relative URL so the SW scope always covers the whole site,
  // regardless of which page registers it. Falls back silently when the
  // page is opened over file:// or in a browser without SW support, so
  // direct browser access is never blocked.
  // Skip SW entirely when running inside a Tauri shell: Tauri serves the
  // app from a custom protocol with its own asset cache, so a SW is both
  // redundant and can fail to install on those origins.
  const isTauri =
    typeof window !== "undefined" &&
    (window.__TAURI__ || window.__TAURI_INTERNALS__ || window.location.protocol === "tauri:");
  if (!isTauri && "serviceWorker" in navigator) {
    const params = new URLSearchParams(window.location.search);
    if (params.has("nosw")) {
      // Kill switch: tear down every SW + cache for this origin.
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      if (window.caches && caches.keys) {
        caches
          .keys()
          .then((keys) => keys.forEach((k) => caches.delete(k)))
          .catch(() => {});
      }
    } else if (
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      // Resolve sw.js relative to the site root so any subpage works.
      // location.pathname examples:
      //   /childhood/                -> base "/childhood/"
      //   /childhood/apps/x/y/index.html -> base "/childhood/"
      const path = window.location.pathname;
      const appsIdx = path.indexOf("/apps/");
      const base = appsIdx !== -1 ? path.slice(0, appsIdx + 1) : path.replace(/[^/]*$/, "");
      const swUrl = base + "sw.js";
      window.addEventListener("load", () => {
        navigator.serviceWorker.register(swUrl, { scope: base }).catch(() => {
          // Silent: SW registration failure must not break the page.
        });
      });
    }
  }

  // Back to home button (subpages only, paths containing /apps/)
  if (window.location.pathname.indexOf("/apps/") !== -1) {
    // Calculate relative path to root.
    // Pathname forms we need to support:
    //   .../apps/card-game/chinese-army-chess/index.html  (file://, GitHub Pages)
    //   .../apps/card-game/chinese-army-chess/             (with trailing slash)
    //   .../apps/card-game/chinese-army-chess              (serve cleanUrls strips it)
    // Real depth = number of directory segments after "/apps/" (skip the
    // index.html part and the empty tail caused by trailing slash) + 1 for
    // jumping out of the "apps" directory itself.
    const tail = window.location.pathname.split("/apps/")[1] || "";
    const dirs = tail.split("/").filter((s) => s && !/\.html?$/i.test(s));
    const levels = dirs.length + 1;
    const prefix = "../".repeat(levels);

    const back = document.createElement("a");
    back.className = "back-home";
    back.href = prefix + "index.html";
    back.title = "返回首页";
    back.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="#fff"><path d="M8 0L0 6v10h5v-5h6v5h5V6z"/></svg> 首页';
    document.body.appendChild(back);
  }
});
