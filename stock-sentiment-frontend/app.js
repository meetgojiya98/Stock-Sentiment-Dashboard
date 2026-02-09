const dom = {
  apiBaseInput: document.querySelector("#api-base-input"),
  saveApiBaseBtn: document.querySelector("#save-api-base-btn"),
  refreshBtn: document.querySelector("#refresh-btn"),
  autoRefreshBtn: document.querySelector("#auto-refresh-btn"),
  sourceFilter: document.querySelector("#source-filter"),
  sentimentFilter: document.querySelector("#sentiment-filter"),
  searchFilter: document.querySelector("#search-filter"),
  clearFiltersBtn: document.querySelector("#clear-filters-btn"),
  feedList: document.querySelector("#feed-list"),
  activeFilterPill: document.querySelector("#active-filter-pill"),
  trendingTickers: document.querySelector("#trending-tickers"),
  narrativesList: document.querySelector("#narratives-list"),
  themesList: document.querySelector("#themes-list"),
  timelineCanvas: document.querySelector("#timeline-canvas"),
  timelineLegends: document.querySelector("#timeline-legends"),
  heroMarketPulse: document.querySelector("#hero-market-pulse"),
  heroTrend: document.querySelector("#hero-trend"),
  lastUpdated: document.querySelector("#last-updated"),
  gaugeFill: document.querySelector("#sentiment-gauge-fill"),
  gaugeValue: document.querySelector("#sentiment-gauge-value"),
  kpiTotalItems: document.querySelector("#kpi-total-items"),
  kpiActiveTickers: document.querySelector("#kpi-active-tickers"),
  kpiVolatility: document.querySelector("#kpi-volatility"),
  kpiPositiveRatio: document.querySelector("#kpi-positive-ratio"),
  watchlistInput: document.querySelector("#watchlist-input"),
  watchlistAddBtn: document.querySelector("#watchlist-add-btn"),
  watchlistTags: document.querySelector("#watchlist-tags"),
  watchlistGrid: document.querySelector("#watchlist-grid"),
  watchlistSubtitle: document.querySelector("#watchlist-subtitle"),
  authStatusChip: document.querySelector("#auth-status-chip"),
  authOpenBtn: document.querySelector("#auth-open-btn"),
  authLogoutBtn: document.querySelector("#auth-logout-btn"),
  authModal: document.querySelector("#auth-modal"),
  authCloseBtn: document.querySelector("#auth-close-btn"),
  authTabSignin: document.querySelector("#auth-tab-signin"),
  authTabSignup: document.querySelector("#auth-tab-signup"),
  signinForm: document.querySelector("#signin-form"),
  signupForm: document.querySelector("#signup-form"),
  signinEmail: document.querySelector("#signin-email"),
  signinPassword: document.querySelector("#signin-password"),
  signupEmail: document.querySelector("#signup-email"),
  signupPassword: document.querySelector("#signup-password"),
  signupConfirmPassword: document.querySelector("#signup-confirm-password"),
  toastStack: document.querySelector("#toast-stack"),
  loadingFeedTemplate: document.querySelector("#loading-feed-template"),
};

const DEFAULT_WATCHLIST = ["AAPL", "MSFT", "NVDA", "TSLA"];
const REFRESH_INTERVAL_MS = 60_000;
const AUTH_USERS_KEY = "ssd_auth_users_v1";
const AUTH_SESSION_KEY = "ssd_auth_session_v1";
const WATCHLIST_KEY_GUEST = "ssd_watchlist_guest";

const state = {
  apiBase: loadApiBase(),
  auth: {
    mode: "signin",
    users: loadAuthUsers(),
    session: loadAuthSession(),
  },
  dashboard: null,
  feed: [],
  watchlist: loadWatchlist(),
  watchlistData: [],
  staticSnapshot: null,
  staticFallbackNotified: false,
  filters: {
    source: "",
    sentiment: "",
    search: "",
    ticker: "",
  },
  autoRefresh: true,
  timerId: null,
  searchDebounceId: null,
};

init();

async function init() {
  dom.apiBaseInput.value = state.apiBase;
  bindEvents();
  renderAuthState();
  setAuthMode(state.auth.mode);
  renderWatchlistTags();
  setAutoRefresh(true);
  await refreshAll(true);
}

function bindEvents() {
  dom.saveApiBaseBtn.addEventListener("click", onSaveApiBase);
  dom.apiBaseInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      onSaveApiBase();
    }
  });

  dom.refreshBtn.addEventListener("click", async () => {
    await refreshAll(true);
    toast("Data refreshed");
  });

  dom.autoRefreshBtn.addEventListener("click", () => {
    setAutoRefresh(!state.autoRefresh);
    toast(`Auto refresh ${state.autoRefresh ? "enabled" : "disabled"}`);
  });

  dom.sourceFilter.addEventListener("change", async (event) => {
    state.filters.source = event.target.value;
    await refreshFeed(false);
  });

  dom.sentimentFilter.addEventListener("change", async (event) => {
    state.filters.sentiment = event.target.value;
    await refreshFeed(false);
  });

  dom.searchFilter.addEventListener("input", (event) => {
    const nextValue = event.target.value;
    window.clearTimeout(state.searchDebounceId);
    state.searchDebounceId = window.setTimeout(async () => {
      state.filters.search = nextValue;
      await refreshFeed(false);
    }, 280);
  });

  dom.clearFiltersBtn.addEventListener("click", async () => {
    state.filters = { source: "", sentiment: "", search: "", ticker: "" };
    syncFilterInputs();
    await refreshFeed(false);
  });

  dom.watchlistAddBtn.addEventListener("click", async () => {
    await addWatchlistTicker();
  });

  dom.watchlistInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      await addWatchlistTicker();
    }
  });

  dom.watchlistTags.addEventListener("click", async (event) => {
    const removeButton = event.target.closest("button[data-remove-ticker]");
    if (removeButton) {
      const ticker = removeButton.dataset.removeTicker;
      state.watchlist = state.watchlist.filter((symbol) => symbol !== ticker);
      saveWatchlist(state.watchlist);
      renderWatchlistTags();
      await refreshWatchlistData(false);
      return;
    }

    const filterTicker = event.target.closest("[data-filter-ticker]");
    if (filterTicker) {
      state.filters.ticker = filterTicker.dataset.filterTicker;
      await refreshFeed(false);
    }
  });

  dom.watchlistGrid.addEventListener("click", async (event) => {
    const row = event.target.closest("[data-filter-ticker]");
    if (!row) {
      return;
    }
    state.filters.ticker = row.dataset.filterTicker;
    await refreshFeed(false);
  });

  dom.trendingTickers.addEventListener("click", async (event) => {
    const card = event.target.closest("[data-filter-ticker]");
    if (!card) {
      return;
    }
    state.filters.ticker = card.dataset.filterTicker;
    await refreshFeed(false);
  });

  document.addEventListener("keydown", async (event) => {
    if (event.key === "/" && document.activeElement !== dom.searchFilter) {
      event.preventDefault();
      dom.searchFilter.focus();
      dom.searchFilter.select();
    }

    if (event.key === "Escape" && !dom.authModal.classList.contains("is-hidden")) {
      closeAuthModal();
      return;
    }

    if (event.key === "Escape" && state.filters.ticker) {
      state.filters.ticker = "";
      await refreshFeed(false);
    }
  });

  window.addEventListener("resize", debounce(() => drawTimeline(state.dashboard?.timeline ?? []), 120));

  dom.authOpenBtn.addEventListener("click", () => {
    openAuthModal();
  });

  dom.authLogoutBtn.addEventListener("click", async () => {
    signOut();
    await refreshWatchlistData(false);
  });

  dom.authCloseBtn.addEventListener("click", () => {
    closeAuthModal();
  });

  dom.authModal.addEventListener("click", (event) => {
    if (event.target === dom.authModal) {
      closeAuthModal();
    }
  });

  dom.authTabSignin.addEventListener("click", () => {
    setAuthMode("signin");
  });

  dom.authTabSignup.addEventListener("click", () => {
    setAuthMode("signup");
  });

  dom.signinForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = normalizeEmail(dom.signinEmail.value);
    const password = dom.signinPassword.value;

    if (!email || password.length < 6) {
      toast("Enter a valid email and password (min 6 chars)", "warn");
      return;
    }

    const user = state.auth.users.find((entry) => entry.email === email);
    if (!user || user.passwordDigest !== digestPassword(email, password)) {
      toast("Invalid credentials", "error");
      return;
    }

    state.auth.session = { email, signedInAt: new Date().toISOString() };
    persistAuthSession(state.auth.session);
    renderAuthState();
    closeAuthModal();
    toast(`Signed in as ${email}`);
    state.watchlist = loadWatchlist();
    renderWatchlistTags();
    await refreshWatchlistData(false);
    dom.signinForm.reset();
  });

  dom.signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = normalizeEmail(dom.signupEmail.value);
    const password = dom.signupPassword.value;
    const confirm = dom.signupConfirmPassword.value;

    if (!email) {
      toast("Enter a valid email", "warn");
      return;
    }

    if (password.length < 6) {
      toast("Use at least 6 characters for password", "warn");
      return;
    }

    if (password !== confirm) {
      toast("Passwords do not match", "warn");
      return;
    }

    const exists = state.auth.users.some((entry) => entry.email === email);
    if (exists) {
      toast("Account already exists. Please sign in.", "warn");
      setAuthMode("signin");
      dom.signinEmail.value = email;
      return;
    }

    const user = {
      email,
      passwordDigest: digestPassword(email, password),
      createdAt: new Date().toISOString(),
    };
    state.auth.users = [...state.auth.users, user];
    persistAuthUsers(state.auth.users);

    state.auth.session = { email, signedInAt: new Date().toISOString() };
    persistAuthSession(state.auth.session);
    renderAuthState();
    closeAuthModal();
    toast(`Welcome, ${email}`);
    state.watchlist = loadWatchlist();
    renderWatchlistTags();
    await refreshWatchlistData(false);
    dom.signupForm.reset();
    dom.signinForm.reset();
  });
}

async function refreshAll(forceRefresh = false) {
  setRefreshing(true);
  try {
    const dashboardPath = `/api/dashboard?force_refresh=${String(forceRefresh)}`;
    const [dashboard] = await Promise.all([fetchJson(dashboardPath)]);
    state.dashboard = dashboard;
    renderDashboard();

    await Promise.all([refreshFeed(forceRefresh), refreshWatchlistData(forceRefresh)]);
  } catch (error) {
    toast(`Could not load dashboard: ${error.message}`, "error");
    renderEmptyStates();
  } finally {
    setRefreshing(false);
  }
}

async function refreshFeed(forceRefresh = false) {
  showFeedSkeleton();
  try {
    const params = new URLSearchParams({ limit: "70", force_refresh: String(forceRefresh) });
    if (state.filters.source) {
      params.set("source", state.filters.source);
    }
    if (state.filters.sentiment) {
      params.set("sentiment", state.filters.sentiment);
    }
    if (state.filters.search) {
      params.set("q", state.filters.search);
    }
    if (state.filters.ticker) {
      params.set("ticker", state.filters.ticker);
    }

    const response = await fetchJson(`/api/feed?${params.toString()}`);
    state.feed = response.items ?? [];
    renderFeed(state.feed);
    renderActiveFilterPill();
  } catch (error) {
    dom.feedList.innerHTML = `<div class="empty-state">Unable to load feed. ${escapeHtml(error.message)}</div>`;
  }
}

async function refreshWatchlistData(forceRefresh = false) {
  try {
    const tickerList = state.watchlist.join(",");
    const params = new URLSearchParams({ tickers: tickerList, force_refresh: String(forceRefresh) });
    const response = await fetchJson(`/api/watchlist?${params.toString()}`);
    state.watchlistData = response.items ?? [];
    renderWatchlistGrid();
  } catch (error) {
    dom.watchlistGrid.innerHTML = `<div class="empty-state">Watchlist unavailable. ${escapeHtml(error.message)}</div>`;
  }
}

function renderDashboard() {
  const dashboard = state.dashboard;
  if (!dashboard) {
    return;
  }

  const overview = dashboard.overview ?? {};
  const sentimentIndex = Number(overview.sentimentIndex ?? 0);

  dom.heroMarketPulse.textContent = overview.marketPulse || "No pulse data";
  dom.heroTrend.textContent = `Trend: ${toTitleCase(overview.trendDirection || "flat")}`;
  dom.lastUpdated.textContent = `Last update: ${formatDateTime(dashboard.generatedAt)}`;

  animateMetric(dom.gaugeValue, sentimentIndex, { decimals: 1 });
  dom.gaugeFill.style.left = `${clamp((sentimentIndex + 100) / 2, 0, 100)}%`;

  animateMetric(dom.kpiTotalItems, Number(overview.totalItems ?? 0), { decimals: 0 });
  animateMetric(dom.kpiActiveTickers, Number(overview.activeTickers ?? 0), { decimals: 0 });
  animateMetric(dom.kpiVolatility, Number(overview.volatilityIndex ?? 0), { decimals: 1 });
  animateMetric(dom.kpiPositiveRatio, Number(overview.positiveRatio ?? 0), { decimals: 1, suffix: "%" });

  renderTrending(dashboard.trending ?? []);
  renderThemes(dashboard.themes ?? []);
  renderNarratives(dashboard.narratives ?? []);
  drawTimeline(dashboard.timeline ?? []);
}

function renderTrending(rows) {
  if (!rows.length) {
    dom.trendingTickers.innerHTML = `<div class="empty-state">No ticker mentions detected yet.</div>`;
    return;
  }

  dom.trendingTickers.innerHTML = rows
    .map((row) => {
      const positivePct = Math.round((row.bullish / Math.max(row.mentions, 1)) * 100);
      const negativePct = Math.round((row.bearish / Math.max(row.mentions, 1)) * 100);
      const neutralPct = 100 - positivePct - negativePct;
      const sentimentClass = sentimentClassFromScore(row.averageSentiment);

      return `
      <article class="ticker-card" data-filter-ticker="${row.ticker}">
        <div class="ticker-head">
          <span class="ticker-symbol">${row.ticker}</span>
          <span class="ticker-mentions">${row.mentions} mentions</span>
        </div>
        <div class="feed-meta-left">
          <span class="sentiment-pill ${sentimentClass}">${formatSigned(row.averageSentiment)} avg</span>
          <span class="badge">Momentum ${formatSigned(row.momentum)}</span>
        </div>
        <div class="ticker-bars">
          <div class="ticker-bar"><span style="width:${positivePct}%;background:#2daa74"></span></div>
          <div class="ticker-bar"><span style="width:${Math.max(negativePct, 2)}%;background:#d26b57"></span></div>
          <div class="ticker-bar"><span style="width:${Math.max(neutralPct, 2)}%;background:#bfa761"></span></div>
        </div>
      </article>`;
    })
    .join("");
}

function renderThemes(rows) {
  if (!rows.length) {
    dom.themesList.innerHTML = `<div class="empty-state">No dominant themes yet.</div>`;
    return;
  }

  const topMention = Math.max(...rows.map((row) => row.mentions), 1);

  dom.themesList.innerHTML = rows
    .map((row) => {
      const width = Math.round((row.mentions / topMention) * 100);
      const hue = row.averageSentiment >= 0 ? "#2baa73" : "#cc6b57";

      return `
      <article class="theme-item">
        <h4>${row.theme}</h4>
        <p>${row.mentions} mentions | sentiment ${formatSigned(row.averageSentiment)}</p>
        <div class="theme-meter"><span style="width:${Math.max(width, 6)}%;background:${hue}"></span></div>
      </article>`;
    })
    .join("");
}

function renderNarratives(rows) {
  if (!rows.length) {
    dom.narrativesList.innerHTML = `<div class="empty-state">Narrative engine is warming up.</div>`;
    return;
  }

  dom.narrativesList.innerHTML = rows
    .map((row) => {
      const sentimentClass = sentimentClassFromScore(row.sentiment);
      const tickerChips = (row.tickerFocus || [])
        .map((ticker) => `<span class="inline-pill">${ticker}</span>`)
        .join("");

      return `
      <article class="narrative-item">
        <h4>${row.theme}</h4>
        <p>${escapeHtml(row.headline)}</p>
        <div class="feed-meta-left">
          <span class="sentiment-pill ${sentimentClass}">${formatSigned(row.sentiment)}</span>
          <span class="badge">${row.mentions} mentions</span>
          ${tickerChips}
        </div>
      </article>`;
    })
    .join("");
}

function renderFeed(items) {
  if (!items.length) {
    dom.feedList.innerHTML = `<div class="empty-state">No feed items match your active filters.</div>`;
    return;
  }

  dom.feedList.innerHTML = items
    .map((item) => {
      const sentiment = item.sentiment || {};
      const sentimentClass = sentimentClassFromLabel(sentiment.label);
      const themes = (item.themes || []).map((theme) => `<span class="theme-pill">${theme}</span>`).join("");
      const tickers = (item.tickers || [])
        .slice(0, 6)
        .map((ticker) => `<span class="inline-pill" data-filter-ticker="${ticker}">${ticker}</span>`)
        .join("");

      return `
      <article class="feed-item">
        <div class="feed-item-head">
          <h4>${escapeHtml(item.title || "Untitled")}</h4>
          <span class="source-pill">${escapeHtml(item.source || "source")}</span>
        </div>
        <p>${escapeHtml(item.summary || item.text || "")}</p>
        <div class="feed-meta">
          <span class="sentiment-pill ${sentimentClass}">${toTitleCase(sentiment.label || "neutral")} ${formatSigned(sentiment.score || 0)}</span>
          <span class="badge">Confidence ${Number(sentiment.confidence || 0).toFixed(1)}%</span>
          <span class="badge">${formatRelativeTime(item.publishedAt)}</span>
          ${themes}
          ${tickers}
        </div>
        <a href="${escapeAttribute(item.url || "#")}" target="_blank" rel="noreferrer">Open source</a>
      </article>`;
    })
    .join("");

  dom.feedList.querySelectorAll("[data-filter-ticker]").forEach((chip) => {
    chip.addEventListener("click", async () => {
      state.filters.ticker = chip.dataset.filterTicker;
      await refreshFeed(false);
    });
  });
}

function renderWatchlistTags() {
  if (!state.watchlist.length) {
    dom.watchlistTags.innerHTML = `<div class="empty-state">Add a ticker to start your watchtower.</div>`;
    return;
  }

  dom.watchlistTags.innerHTML = state.watchlist
    .map(
      (ticker) =>
        `<span class="watchlist-tag" data-filter-ticker="${ticker}">${ticker} <button type="button" data-remove-ticker="${ticker}" aria-label="Remove ${ticker}">×</button></span>`,
    )
    .join("");
}

function renderWatchlistGrid() {
  if (!state.watchlistData.length) {
    dom.watchlistGrid.innerHTML = `<div class="empty-state">No watchlist data yet.</div>`;
    return;
  }

  dom.watchlistGrid.innerHTML = state.watchlistData
    .map((row) => {
      const sentimentClass = sentimentClassFromScore(row.averageSentiment || 0);
      return `
      <article class="watchlist-row" data-filter-ticker="${row.ticker}">
        <div class="watchlist-row-head">
          <strong>${row.ticker}</strong>
          <span class="sentiment-pill ${sentimentClass}">${formatSigned(row.averageSentiment || 0)}</span>
        </div>
        <p>${row.mentions || 0} mentions | hype ${Number(row.hypeScore || 0).toFixed(1)}</p>
      </article>`;
    })
    .join("");
}

function renderActiveFilterPill() {
  if (!state.filters.ticker) {
    dom.activeFilterPill.classList.add("is-hidden");
    dom.activeFilterPill.innerHTML = "";
    return;
  }

  dom.activeFilterPill.classList.remove("is-hidden");
  dom.activeFilterPill.innerHTML = `<span class="filter-pill">Ticker filter: ${state.filters.ticker}</span>`;
}

function drawTimeline(points) {
  const canvas = dom.timelineCanvas;
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, width, height);

  if (!points.length) {
    ctx.fillStyle = "#587270";
    ctx.font = "500 13px Bricolage Grotesque";
    ctx.fillText("No timeline points yet", 16, 22);
    dom.timelineLegends.innerHTML = "";
    return;
  }

  const pad = { top: 20, right: 15, bottom: 30, left: 36 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;

  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (chartHeight / 4) * i;
    ctx.strokeStyle = "rgba(22, 72, 68, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
  }

  const values = points.map((point) => Number(point.sentiment || 0));
  const minValue = Math.min(...values, -30);
  const maxValue = Math.max(...values, 30);
  const span = Math.max(maxValue - minValue, 10);

  const coords = points.map((point, index) => {
    const x = pad.left + (index / Math.max(points.length - 1, 1)) * chartWidth;
    const y = pad.top + ((maxValue - Number(point.sentiment || 0)) / span) * chartHeight;
    return { x, y, raw: point };
  });

  const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartHeight);
  gradient.addColorStop(0, "rgba(14, 148, 136, 0.34)");
  gradient.addColorStop(1, "rgba(14, 148, 136, 0.02)");

  ctx.beginPath();
  ctx.moveTo(coords[0].x, pad.top + chartHeight);
  coords.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.lineTo(coords.at(-1).x, pad.top + chartHeight);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  coords.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.strokeStyle = "#0a857a";
  ctx.lineWidth = 2.6;
  ctx.stroke();

  coords.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#0c6c63";
    ctx.fill();
  });

  ctx.fillStyle = "#516967";
  ctx.font = "500 11px Bricolage Grotesque";
  const step = Math.max(1, Math.floor(points.length / 5));
  points.forEach((point, index) => {
    if (index % step !== 0 && index !== points.length - 1) {
      return;
    }
    const x = pad.left + (index / Math.max(points.length - 1, 1)) * chartWidth;
    ctx.fillText(formatTimelineLabel(point.label), x - 24, height - 10);
  });

  const highlights = [...points]
    .sort((a, b) => Math.abs(b.sentiment) - Math.abs(a.sentiment))
    .slice(0, 4)
    .map((point) => `<span class="legend-pill">${escapeHtml(point.leadTicker || "Macro")}: ${formatSigned(point.sentiment)}</span>`)
    .join("");

  dom.timelineLegends.innerHTML = highlights || `<span class="legend-pill">No standout tickers</span>`;
}

function showFeedSkeleton() {
  if (!dom.loadingFeedTemplate) {
    return;
  }

  const fragments = [];
  for (let i = 0; i < 4; i += 1) {
    const clone = dom.loadingFeedTemplate.content.cloneNode(true);
    fragments.push(clone);
  }

  dom.feedList.innerHTML = "";
  fragments.forEach((fragment) => dom.feedList.appendChild(fragment));
}

function renderEmptyStates() {
  dom.trendingTickers.innerHTML = `<div class="empty-state">No market data available.</div>`;
  dom.themesList.innerHTML = `<div class="empty-state">No theme data available.</div>`;
  dom.narrativesList.innerHTML = `<div class="empty-state">No narrative data available.</div>`;
  dom.feedList.innerHTML = `<div class="empty-state">No feed data available.</div>`;
  dom.watchlistGrid.innerHTML = `<div class="empty-state">No watchlist data available.</div>`;
}

function syncFilterInputs() {
  dom.sourceFilter.value = state.filters.source;
  dom.sentimentFilter.value = state.filters.sentiment;
  dom.searchFilter.value = state.filters.search;
}

async function addWatchlistTicker() {
  const symbol = sanitizeTicker(dom.watchlistInput.value);
  if (!symbol) {
    toast("Enter a valid ticker symbol", "warn");
    return;
  }

  if (state.watchlist.includes(symbol)) {
    state.filters.ticker = symbol;
    await refreshFeed(false);
    return;
  }

  state.watchlist = [...state.watchlist, symbol].slice(-25);
  dom.watchlistInput.value = "";
  saveWatchlist(state.watchlist);
  renderWatchlistTags();
  await refreshWatchlistData(false);
}

function setAutoRefresh(enabled) {
  state.autoRefresh = Boolean(enabled);
  dom.autoRefreshBtn.setAttribute("aria-pressed", String(state.autoRefresh));
  dom.autoRefreshBtn.textContent = `Auto Refresh: ${state.autoRefresh ? "On" : "Off"}`;

  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }

  if (state.autoRefresh) {
    state.timerId = window.setInterval(() => {
      refreshAll(false).catch(() => {
        toast("Background refresh failed", "warn");
      });
    }, REFRESH_INTERVAL_MS);
  }
}

function onSaveApiBase() {
  const input = normalizeApiBase(dom.apiBaseInput.value);
  if (!input) {
    toast("API base URL is invalid", "error");
    return;
  }
  state.apiBase = input;
  localStorage.setItem("ssd_api_base", input);
  toast("API base saved");
  refreshAll(true).catch(() => {
    toast("Could not connect to API", "error");
  });
}

async function fetchJson(path) {
  const url = `${state.apiBase}${path}`;
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }
    return response.json();
  } catch (error) {
    const fallbackPayload = await tryStaticFallback(path);
    if (fallbackPayload !== null) {
      return fallbackPayload;
    }
    throw error;
  }
}

async function tryStaticFallback(path) {
  if (!String(path).startsWith("/api/")) {
    return null;
  }

  try {
    const payload = await resolveStaticApi(path);
    if (!state.staticFallbackNotified) {
      toast("Using static GitHub Pages snapshot data", "warn");
      state.staticFallbackNotified = true;
    }
    return payload;
  } catch {
    return null;
  }
}

async function resolveStaticApi(path) {
  const snapshot = await loadStaticSnapshot();
  const request = new URL(path, "https://local.snapshot");
  const route = request.pathname;
  const params = request.searchParams;
  const generatedAt = snapshot.generatedAt || snapshot.dashboard?.generatedAt || new Date().toISOString();
  const snapshotFeed = Array.isArray(snapshot.feed) ? snapshot.feed : [];
  const tickerIndex = Array.isArray(snapshot.tickerIndex) ? snapshot.tickerIndex : snapshot.dashboard?.trending ?? [];

  if (route === "/api/dashboard") {
    return snapshot.dashboard;
  }

  if (route === "/api/feed") {
    const limit = toBoundedInteger(params.get("limit"), 40, 1, 200);
    const filteredItems = filterSnapshotFeed(snapshotFeed, {
      source: params.get("source"),
      sentiment: params.get("sentiment"),
      ticker: params.get("ticker"),
      q: params.get("q"),
    });
    return {
      generatedAt,
      cached: true,
      count: filteredItems.length,
      items: filteredItems.slice(0, limit),
    };
  }

  if (route === "/api/watchlist") {
    const requestedTickers = (params.get("tickers") || "")
      .split(",")
      .map((token) => sanitizeTicker(token))
      .filter(Boolean);
    const symbols = [...new Set(requestedTickers.length ? requestedTickers : DEFAULT_WATCHLIST)].slice(0, 25);
    const index = new Map(tickerIndex.map((row) => [row.ticker, row]));
    const items = symbols.map((symbol) => index.get(symbol) || emptyTickerSnapshot(symbol));

    return {
      generatedAt,
      cached: true,
      count: items.length,
      items,
    };
  }

  if (route === "/api/health") {
    return {
      status: "ok",
      version: "static-snapshot",
      cached: true,
      cacheAgeSeconds: 0,
      items: snapshotFeed.length,
      generatedAt,
    };
  }

  if (route === "/api/trending-stocks") {
    const limit = toBoundedInteger(params.get("limit"), 15, 1, 50);
    return tickerIndex.slice(0, limit);
  }

  if (route === "/api/sentiment") {
    const summary = snapshot.dashboard?.sentiment || { positive: 0, negative: 0, neutral: 0 };
    return [
      { sentiment: "POSITIVE", count: summary.positive || 0 },
      { sentiment: "NEGATIVE", count: summary.negative || 0 },
      { sentiment: "NEUTRAL", count: summary.neutral || 0 },
    ];
  }

  if (route === "/api/news" || route === "/api/reddit") {
    const source = route.endsWith("news") ? "news" : "reddit";
    const limit = toBoundedInteger(params.get("limit"), 20, 1, 100);
    return snapshotFeed
      .filter((item) => item.source === source)
      .slice(0, limit)
      .map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        date: item.publishedAt,
        text: item.text,
      }));
  }

  if (route.startsWith("/api/ticker/")) {
    const symbol = sanitizeTicker(route.split("/").at(-1) || "");
    const related = snapshotFeed.filter((item) => item.tickers?.includes(symbol));
    const row = tickerIndex.find((entry) => entry.ticker === symbol) || emptyTickerSnapshot(symbol);
    return {
      generatedAt,
      cached: true,
      ticker: symbol,
      mentions: related.length,
      snapshot: row,
      items: related.slice(0, 40),
      themes: [],
    };
  }

  if (route === "/api/insights") {
    return {
      generatedAt,
      cached: true,
      itemCount: snapshotFeed.length,
      sentimentIndex: snapshot.dashboard?.overview?.sentimentIndex || 0,
      themes: snapshot.dashboard?.themes || [],
      trendingTickers: tickerIndex.slice(0, 10),
      narratives: snapshot.dashboard?.narratives || [],
    };
  }

  throw new Error(`No static route for ${route}`);
}

async function loadStaticSnapshot() {
  if (state.staticSnapshot) {
    return state.staticSnapshot;
  }

  const snapshotUrl = getStaticSnapshotUrl();
  const response = await fetch(snapshotUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Snapshot not found (${response.status})`);
  }

  const snapshot = await response.json();
  const dashboard = snapshot.dashboard || {};
  const feed = Array.isArray(snapshot.feed) ? snapshot.feed : [];
  state.staticSnapshot = {
    ...snapshot,
    generatedAt: snapshot.generatedAt || dashboard.generatedAt || new Date().toISOString(),
    dashboard: {
      ...dashboard,
      generatedAt: dashboard.generatedAt || snapshot.generatedAt || new Date().toISOString(),
    },
    feed: [...feed].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
  };
  return state.staticSnapshot;
}

function getStaticSnapshotUrl() {
  let basePath = window.location.pathname || "/";
  if (!basePath.endsWith("/")) {
    if (basePath.includes(".")) {
      basePath = basePath.slice(0, basePath.lastIndexOf("/") + 1);
    } else {
      basePath = `${basePath}/`;
    }
  }
  return `${window.location.origin}${basePath}data/snapshot.json`;
}

function filterSnapshotFeed(items, filters) {
  const source = String(filters.source || "").toLowerCase();
  const sentiment = String(filters.sentiment || "").toLowerCase();
  const ticker = sanitizeTicker(filters.ticker || "");
  const query = String(filters.q || "").trim().toLowerCase();

  return items.filter((item) => {
    if (source && item.source !== source) {
      return false;
    }
    if (sentiment && String(item?.sentiment?.label || "").toLowerCase() !== sentiment) {
      return false;
    }
    if (ticker && !Array.isArray(item.tickers)) {
      return false;
    }
    if (ticker && !item.tickers.includes(ticker)) {
      return false;
    }
    if (query) {
      const haystack = `${item.title || ""} ${item.text || ""}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

function emptyTickerSnapshot(symbol) {
  return {
    ticker: symbol,
    mentions: 0,
    averageSentiment: 0,
    bullish: 0,
    bearish: 0,
    neutral: 0,
    momentum: 0,
    hypeScore: 0,
    sourceMix: {},
  };
}

function toBoundedInteger(raw, fallback, min, max) {
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(num)));
}

function animateMetric(element, target, options = {}) {
  const { decimals = 0, suffix = "" } = options;
  const startValue = Number(element.dataset.value || 0);
  const endValue = Number(target || 0);
  const duration = 420;
  const startTime = performance.now();

  const frame = (now) => {
    const t = clamp((now - startTime) / duration, 0, 1);
    const eased = 1 - (1 - t) ** 3;
    const value = startValue + (endValue - startValue) * eased;
    element.textContent = `${value.toFixed(decimals)}${suffix}`;

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      element.dataset.value = String(endValue);
      element.textContent = `${endValue.toFixed(decimals)}${suffix}`;
    }
  };

  requestAnimationFrame(frame);
}

function setRefreshing(isRefreshing) {
  dom.refreshBtn.disabled = isRefreshing;
  if (isRefreshing) {
    dom.refreshBtn.textContent = "Refreshing...";
  } else {
    dom.refreshBtn.textContent = "Refresh";
  }
}

function toast(message, level = "info") {
  const el = document.createElement("div");
  el.className = `toast ${level}`;
  el.textContent = message;
  dom.toastStack.appendChild(el);

  window.setTimeout(() => {
    el.remove();
  }, 3200);
}

function openAuthModal() {
  dom.authModal.classList.remove("is-hidden");
  document.body.classList.add("modal-open");
  if (state.auth.mode === "signin") {
    dom.signinEmail.focus();
  } else {
    dom.signupEmail.focus();
  }
}

function closeAuthModal() {
  dom.authModal.classList.add("is-hidden");
  document.body.classList.remove("modal-open");
}

function setAuthMode(mode) {
  state.auth.mode = mode === "signup" ? "signup" : "signin";
  const isSignin = state.auth.mode === "signin";

  dom.authTabSignin.classList.toggle("is-active", isSignin);
  dom.authTabSignup.classList.toggle("is-active", !isSignin);
  dom.signinForm.classList.toggle("is-hidden", !isSignin);
  dom.signupForm.classList.toggle("is-hidden", isSignin);
}

function renderAuthState() {
  const session = state.auth.session;
  if (session?.email) {
    dom.authStatusChip.textContent = session.email;
    dom.authOpenBtn.textContent = "Account";
    dom.authLogoutBtn.classList.remove("is-hidden");
    dom.watchlistSubtitle.textContent = `Personal symbol radar for ${session.email}`;
  } else {
    dom.authStatusChip.textContent = "Guest Mode";
    dom.authOpenBtn.textContent = "Sign In / Sign Up";
    dom.authLogoutBtn.classList.add("is-hidden");
    dom.watchlistSubtitle.textContent = "Personal symbol radar with local persistence";
  }
}

function signOut() {
  state.auth.session = null;
  persistAuthSession(null);
  renderAuthState();
  state.watchlist = loadWatchlist();
  renderWatchlistTags();
  toast("Signed out");
}

function loadAuthUsers() {
  const raw = localStorage.getItem(AUTH_USERS_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((row) => ({
        email: normalizeEmail(row?.email),
        passwordDigest: String(row?.passwordDigest || ""),
        createdAt: String(row?.createdAt || ""),
      }))
      .filter((row) => row.email && row.passwordDigest);
  } catch {
    return [];
  }
}

function persistAuthUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function loadAuthSession() {
  const raw = localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    const email = normalizeEmail(parsed?.email);
    if (!email) {
      return null;
    }
    return {
      email,
      signedInAt: String(parsed?.signedInAt || ""),
    };
  } catch {
    return null;
  }
}

function persistAuthSession(session) {
  if (!session) {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "";
  }
  return email;
}

function digestPassword(email, password) {
  const input = `${email}::${password}::stock-sentiment-dashboard`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function watchlistStorageKey() {
  const session = loadAuthSession();
  if (session?.email) {
    return `ssd_watchlist_${session.email}`;
  }
  return WATCHLIST_KEY_GUEST;
}

function loadWatchlist() {
  const key = watchlistStorageKey();
  const raw = localStorage.getItem("ssd_watchlist");
  const namespaced = localStorage.getItem(key);
  const data = namespaced ?? raw;
  if (!data) {
    return DEFAULT_WATCHLIST;
  }

  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      return DEFAULT_WATCHLIST;
    }

    const clean = parsed.map((value) => sanitizeTicker(String(value))).filter(Boolean);
    return clean.length ? clean.slice(0, 25) : DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}

function saveWatchlist(watchlist) {
  localStorage.setItem(watchlistStorageKey(), JSON.stringify(watchlist));
}

function loadApiBase() {
  const saved = localStorage.getItem("ssd_api_base");
  if (saved) {
    return normalizeApiBase(saved);
  }

  if (window.location.protocol.startsWith("http")) {
    return `${window.location.protocol}//${window.location.host}`;
  }

  return "http://127.0.0.1:8000";
}

function normalizeApiBase(value) {
  const cleaned = String(value || "").trim().replace(/\/+$/, "");
  if (!cleaned) {
    return "";
  }

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  return `http://${cleaned}`;
}

function sanitizeTicker(value) {
  const token = String(value || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5);
  if (!token) {
    return "";
  }
  return token;
}

function sentimentClassFromScore(score) {
  if (Number(score) > 8) {
    return "sentiment-positive";
  }
  if (Number(score) < -8) {
    return "sentiment-negative";
  }
  return "sentiment-neutral";
}

function sentimentClassFromLabel(label) {
  const normalized = String(label || "").toLowerCase();
  if (normalized === "positive") {
    return "sentiment-positive";
  }
  if (normalized === "negative") {
    return "sentiment-negative";
  }
  return "sentiment-neutral";
}

function formatSigned(value) {
  const num = Number(value || 0);
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(1)}`;
}

function formatDateTime(value) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRelativeTime(value) {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (Number.isNaN(diffMs)) {
    return "Unknown time";
  }

  const minutes = Math.max(1, Math.round(diffMs / 60_000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatTimelineLabel(label) {
  if (!label) {
    return "--";
  }
  return label.split(" ").slice(1).join(" ");
}

function toTitleCase(value) {
  return String(value || "")
    .split(/\s+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function debounce(fn, wait) {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), wait);
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}
