const CONFIG = {
  username: "karandeeps18",
  // Pick 6–8 repos only. Replace with your strongest ones.
  repos: [
    "qflib",
    "CreditRiskModel",
    "YOUR_REPO_1",
    "YOUR_REPO_2"
  ],
  cacheHours: 12
};

const els = {
  grid: document.getElementById("projectsGrid"),
  status: document.getElementById("projectsStatus"),
  search: document.getElementById("search"),
  year: document.getElementById("year")
};

els.year.textContent = String(new Date().getFullYear());

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function cacheKey() {
  return `gh_projects_${CONFIG.username}_${CONFIG.repos.join(",")}`;
}

function getCache() {
  try {
    const raw = localStorage.getItem(cacheKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ageMs = Date.now() - parsed.savedAt;
    if (ageMs > CONFIG.cacheHours * 60 * 60 * 1000) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function setCache(data) {
  try {
    localStorage.setItem(cacheKey(), JSON.stringify({ savedAt: Date.now(), data }));
  } catch {}
}

async function fetchRepo(repo) {
  const url = `https://api.github.com/repos/${CONFIG.username}/${repo}`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json"
    }
  });
  if (!res.ok) throw new Error(`Failed: ${repo}`);
  return res.json();
}

function projectCard(r) {
  const live = r.homepage && r.homepage.startsWith("http") ? r.homepage : null;

  const updated = r.pushed_at ? `Updated ${formatDate(r.pushed_at)}` : "";
  const lang = r.language ? r.language : "—";
  const stars = typeof r.stargazers_count === "number" ? `★ ${r.stargazers_count}` : "";
  const forks = typeof r.forks_count === "number" ? `⑂ ${r.forks_count}` : "";

  const el = document.createElement("article");
  el.className = "card project";
  el.dataset.name = (r.name || "").toLowerCase();
  el.dataset.desc = (r.description || "").toLowerCase();

  el.innerHTML = `
    <div class="project-top">
      <div>
        <div class="project-name">${r.name || "Repo"}</div>
        <div class="small subtle">${r.private ? "Private" : ""}</div>
      </div>
      <div class="project-meta">
        ${stars ? `<span class="tag">${stars}</span>` : ""}
        ${forks ? `<span class="tag">${forks}</span>` : ""}
      </div>
    </div>

    <p class="project-desc">${r.description ? r.description : "No description yet. Add one in your GitHub repo."}</p>

    <div class="project-meta">
      <span class="tag">${lang}</span>
      ${updated ? `<span class="tag">${updated}</span>` : ""}
    </div>

    <div class="project-links">
      <a class="link" href="${r.html_url}" target="_blank" rel="noreferrer">GitHub</a>
      ${live ? `<a class="link" href="${live}" target="_blank" rel="noreferrer">Live</a>` : ""}
    </div>
  `;
  return el;
}

function render(list) {
  els.grid.innerHTML = "";
  list.forEach(r => els.grid.appendChild(projectCard(r)));
}

function applySearch() {
  const q = (els.search.value || "").trim().toLowerCase();
  const cards = Array.from(els.grid.querySelectorAll(".project"));
  let shown = 0;

  for (const c of cards) {
    const hay = `${c.dataset.name} ${c.dataset.desc}`;
    const ok = !q || hay.includes(q);
    c.style.display = ok ? "" : "none";
    if (ok) shown += 1;
  }

  els.status.textContent = q ? `${shown} project(s) match “${q}”.` : "";
}

async function main() {
  els.status.textContent = "Loading projects…";

  const cached = getCache();
  if (cached) {
    render(cached);
    els.status.textContent = "";
    applySearch();
    return;
  }

  const repos = CONFIG.repos.filter(r => r && !r.startsWith("YOUR_REPO_"));
  if (!repos.length) {
    els.status.textContent = "Add your repo names in script.js (CONFIG.repos).";
    return;
  }

  try {
    const data = await Promise.all(repos.map(fetchRepo));
    // Keep the same order you listed in CONFIG.repos
    const byName = new Map(data.map(r => [r.name, r]));
    const ordered = repos.map(name => byName.get(name)).filter(Boolean);

    setCache(ordered);
    render(ordered);
    els.status.textContent = "";
    applySearch();
  } catch (e) {
    els.status.textContent = "Could not load GitHub repos (rate limit or typo). Check repo names in script.js.";
  }
}

els.search.addEventListener("input", applySearch);

main();
