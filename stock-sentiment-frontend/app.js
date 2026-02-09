const dom = {
  apiBaseInput: document.querySelector("#api-base-input"),
  saveApiBaseBtn: document.querySelector("#save-api-base-btn"),
  refreshBtn: document.querySelector("#refresh-btn"),
  autoRefreshBtn: document.querySelector("#auto-refresh-btn"),
  themeToggleBtn: document.querySelector("#theme-toggle-btn"),
  routeButtons: Array.from(document.querySelectorAll(".route-btn")),
  views: Array.from(document.querySelectorAll(".view")),

  sourceFilter: document.querySelector("#source-filter"),
  sentimentFilter: document.querySelector("#sentiment-filter"),
  searchFilter: document.querySelector("#search-filter"),
  feedSortSelect: document.querySelector("#feed-sort-select"),
  feedDensityBtn: document.querySelector("#feed-density-btn"),
  clearFiltersBtn: document.querySelector("#clear-filters-btn"),
  feedList: document.querySelector("#feed-list"),
  activeFilterPill: document.querySelector("#active-filter-pill"),
  feedMetricTotal: document.querySelector("#feed-metric-total"),
  feedMetricPositive: document.querySelector("#feed-metric-positive"),
  feedMetricNegative: document.querySelector("#feed-metric-negative"),

  trendingTickers: document.querySelector("#trending-tickers"),
  narrativesList: document.querySelector("#narratives-list"),
  themesList: document.querySelector("#themes-list"),
  timelineCanvas: document.querySelector("#timeline-canvas"),
  timelineLegends: document.querySelector("#timeline-legends"),
  chartSentimentVelocity: document.querySelector("#chart-sentiment-velocity"),
  chartSourceMix: document.querySelector("#chart-source-mix"),
  chartTickerRadar: document.querySelector("#chart-ticker-radar"),
  chartThemePressure: document.querySelector("#chart-theme-pressure"),

  heroMarketPulse: document.querySelector("#hero-market-pulse"),
  heroTrend: document.querySelector("#hero-trend"),
  lastUpdated: document.querySelector("#last-updated"),
  gaugeFill: document.querySelector("#sentiment-gauge-fill"),
  gaugeValue: document.querySelector("#sentiment-gauge-value"),
  homePulseChip: document.querySelector("#home-pulse-chip"),
  homeTickerTape: document.querySelector("#home-ticker-tape"),
  kpiTotalItems: document.querySelector("#kpi-total-items"),
  kpiActiveTickers: document.querySelector("#kpi-active-tickers"),
  kpiVolatility: document.querySelector("#kpi-volatility"),
  kpiPositiveRatio: document.querySelector("#kpi-positive-ratio"),
  homeInsightOpportunity: document.querySelector("#home-insight-opportunity"),
  homeInsightOpportunityCopy: document.querySelector("#home-insight-opportunity-copy"),
  homeInsightRisk: document.querySelector("#home-insight-risk"),
  homeInsightRiskCopy: document.querySelector("#home-insight-risk-copy"),
  homeInsightSource: document.querySelector("#home-insight-source"),
  homeInsightSourceCopy: document.querySelector("#home-insight-source-copy"),

  compareA: document.querySelector("#compare-a"),
  compareB: document.querySelector("#compare-b"),
  compareRunBtn: document.querySelector("#compare-run-btn"),
  compareResult: document.querySelector("#compare-result"),
  regimeChip: document.querySelector("#regime-chip"),
  regimeSummary: document.querySelector("#regime-summary"),
  regimeConfidence: document.querySelector("#regime-confidence"),

  watchlistSubtitle: document.querySelector("#watchlist-subtitle"),
  watchlistInput: document.querySelector("#watchlist-input"),
  watchlistAddBtn: document.querySelector("#watchlist-add-btn"),
  watchlistTags: document.querySelector("#watchlist-tags"),
  watchlistGrid: document.querySelector("#watchlist-grid"),

  bookmarkList: document.querySelector("#bookmark-list"),

  alertTickerInput: document.querySelector("#alert-ticker-input"),
  alertDirectionSelect: document.querySelector("#alert-direction-select"),
  alertThresholdInput: document.querySelector("#alert-threshold-input"),
  alertAddBtn: document.querySelector("#alert-add-btn"),
  alertsList: document.querySelector("#alerts-list"),
  towerHealthScore: document.querySelector("#tower-health-score"),
  towerBestTicker: document.querySelector("#tower-best-ticker"),
  towerRiskTicker: document.querySelector("#tower-risk-ticker"),
  towerTriggerCount: document.querySelector("#tower-trigger-count"),

  accountSummary: document.querySelector("#account-summary"),

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
const BOOKMARKS_KEY_GUEST = "ssd_bookmarks_guest";
const ALERTS_KEY_GUEST = "ssd_alerts_guest";
const FEED_SORT_KEY = "ssd_feed_sort_v1";
const FEED_DENSITY_KEY = "ssd_feed_density_v1";
const THEME_KEY = "ssd_theme_v1";
const ROUTES = ["home", "intelligence", "feed", "watchtower", "account"];

const state = {
  route: initialRoute(),
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
  bookmarks: loadBookmarks(),
  alerts: loadAlerts(),
  staticSnapshot: null,
  staticFallbackNotified: false,
  filters: {
    source: "",
    sentiment: "",
    search: "",
    ticker: "",
  },
  compare: {
    a: "",
    b: "",
  },
  theme: loadTheme(),
  feedSort: loadFeedSort(),
  feedDense: loadFeedDensity(),
  charts: {
    sentimentVelocity: null,
    sourceMix: null,
    tickerRadar: null,
    themePressure: null,
  },
  autoRefresh: true,
  timerId: null,
  searchDebounceId: null,
  firedAlertIds: new Set(),
};

init();

async function init() {
  dom.apiBaseInput.value = state.apiBase;
  applyTheme(state.theme);
  bindEvents();
  setRoute(state.route, { updateHash: false });
  renderAuthState();
  setAuthMode(state.auth.mode);
  renderWatchlistTags();
  renderBookmarks();
  renderAlerts();
  renderAccountSummary();
  syncFeedControls();
  applyFeedDensity();
  renderFeedMetrics([]);
  renderHomeInsights({ trending: [], sources: {} });
  renderRegimePanel({ overview: {} });
  renderWatchtowerInsights();
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

  if (dom.themeToggleBtn) {
    dom.themeToggleBtn.addEventListener("click", () => {
      const nextTheme = state.theme === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
      renderAdvancedCharts(state.dashboard);
      drawTimeline(state.dashboard?.timeline ?? []);
      toast(`Theme switched to ${toTitleCase(nextTheme)}`);
    });
  }

  dom.routeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setRoute(button.dataset.route);
    });
  });

  document.addEventListener("click", async (event) => {
    const routeTarget = event.target.closest("[data-route]");
    if (routeTarget) {
      setRoute(routeTarget.dataset.route);
    }

    const tickerFilter = event.target.closest("[data-filter-ticker]");
    if (tickerFilter && tickerFilter.dataset.filterTicker) {
      state.filters.ticker = tickerFilter.dataset.filterTicker;
      setRoute("feed");
      await refreshFeed(false);
    }

    const bookmarkToggle = event.target.closest("[data-bookmark-toggle]");
    if (bookmarkToggle) {
      const itemId = bookmarkToggle.dataset.bookmarkToggle;
      toggleBookmarkById(itemId);
      renderFeed(state.feed);
      renderFeedMetrics(state.feed);
      renderBookmarks();
      renderAccountSummary();
    }

    const bookmarkRemove = event.target.closest("[data-remove-bookmark]");
    if (bookmarkRemove) {
      const id = bookmarkRemove.dataset.removeBookmark;
      removeBookmark(id);
      renderFeed(state.feed);
      renderFeedMetrics(state.feed);
      renderBookmarks();
      renderAccountSummary();
    }

    const alertRemove = event.target.closest("[data-remove-alert]");
    if (alertRemove) {
      const id = alertRemove.dataset.removeAlert;
      state.alerts = state.alerts.filter((row) => row.id !== id);
      saveAlerts(state.alerts);
      renderAlerts();
      renderWatchtowerInsights();
      renderAccountSummary();
    }
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
    }, 260);
  });

  if (dom.feedSortSelect) {
    dom.feedSortSelect.addEventListener("change", () => {
      state.feedSort = dom.feedSortSelect.value || "recent";
      persistFeedSort(state.feedSort);
      renderFeed(state.feed);
      renderFeedMetrics(state.feed);
    });
  }

  if (dom.feedDensityBtn) {
    dom.feedDensityBtn.addEventListener("click", () => {
      state.feedDense = !state.feedDense;
      persistFeedDensity(state.feedDense);
      applyFeedDensity();
    });
  }

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

  dom.alertAddBtn.addEventListener("click", () => {
    addAlertRule();
  });

  dom.compareRunBtn.addEventListener("click", () => {
    runCompare();
  });

  dom.compareA.addEventListener("change", (event) => {
    state.compare.a = event.target.value;
  });

  dom.compareB.addEventListener("change", (event) => {
    state.compare.b = event.target.value;
  });

  dom.authOpenBtn.addEventListener("click", () => {
    openAuthModal();
  });

  dom.authLogoutBtn.addEventListener("click", async () => {
    signOut();
    await refreshWatchlistData(false);
    renderFeed(state.feed);
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
    state.watchlist = loadWatchlist();
    state.watchlistData = [];
    state.bookmarks = loadBookmarks();
    state.alerts = loadAlerts();
    state.firedAlertIds = new Set();
    renderAuthState();
    renderWatchlistTags();
    renderBookmarks();
    renderAlerts();
    renderWatchtowerInsights();
    renderAccountSummary();
    closeAuthModal();
    toast(`Signed in as ${email}`);
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

    if (state.auth.users.some((entry) => entry.email === email)) {
      toast("Account exists. Please sign in.", "warn");
      setAuthMode("signin");
      dom.signinEmail.value = email;
      return;
    }

    state.auth.users = [
      ...state.auth.users,
      {
        email,
        passwordDigest: digestPassword(email, password),
        createdAt: new Date().toISOString(),
      },
    ];
    persistAuthUsers(state.auth.users);

    state.auth.session = { email, signedInAt: new Date().toISOString() };
    persistAuthSession(state.auth.session);
    state.watchlist = loadWatchlist();
    state.watchlistData = [];
    state.bookmarks = loadBookmarks();
    state.alerts = loadAlerts();
    state.firedAlertIds = new Set();
    renderAuthState();
    renderWatchlistTags();
    renderBookmarks();
    renderAlerts();
    renderWatchtowerInsights();
    renderAccountSummary();
    closeAuthModal();
    toast(`Welcome, ${email}`);
    await refreshWatchlistData(false);
    dom.signinForm.reset();
    dom.signupForm.reset();
  });

  window.addEventListener("hashchange", () => {
    const next = initialRoute();
    setRoute(next, { updateHash: false });
  });

  document.addEventListener("keydown", async (event) => {
    if (event.key === "/" && document.activeElement !== dom.searchFilter) {
      event.preventDefault();
      setRoute("feed");
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

  window.addEventListener(
    "resize",
    debounce(() => {
      drawTimeline(state.dashboard?.timeline ?? []);
      renderAdvancedCharts(state.dashboard);
    }, 120),
  );
}

function setRoute(route, options = {}) {
  const { updateHash = true } = options;
  const normalized = ROUTES.includes(route) ? route : "home";
  state.route = normalized;

  dom.routeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.route === normalized);
  });

  dom.views.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === normalized);
  });

  if (updateHash && window.location.hash !== `#${normalized}`) {
    window.location.hash = normalized;
  }

  if (normalized === "account") {
    renderAccountSummary();
  }
}

async function refreshAll(forceRefresh = false) {
  setRefreshing(true);
  try {
    const dashboard = await fetchJson(`/api/dashboard?force_refresh=${String(forceRefresh)}`);
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
    const params = new URLSearchParams({ limit: "80", force_refresh: String(forceRefresh) });
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
    renderFeedMetrics(state.feed);
    renderBookmarks();
    renderActiveFilterPill();
    renderAccountSummary();
  } catch (error) {
    dom.feedList.innerHTML = `<div class="empty-state">Unable to load feed. ${escapeHtml(error.message)}</div>`;
    renderFeedMetrics([]);
  }
}

async function refreshWatchlistData(forceRefresh = false) {
  try {
    const tickerList = state.watchlist.join(",");
    const params = new URLSearchParams({ tickers: tickerList, force_refresh: String(forceRefresh) });
    const response = await fetchJson(`/api/watchlist?${params.toString()}`);
    state.watchlistData = response.items ?? [];
    renderWatchlistGrid();
    renderAlerts();
    renderCompareOptions();
    evaluateAlerts();
    renderWatchtowerInsights();
    renderAccountSummary();
  } catch (error) {
    dom.watchlistGrid.innerHTML = `<div class="empty-state">Watchlist unavailable. ${escapeHtml(error.message)}</div>`;
    renderAlerts();
    renderWatchtowerInsights();
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
  dom.homePulseChip.textContent = `Signal: ${formatSigned(sentimentIndex)} | ${toTitleCase(overview.trendDirection || "flat")}`;

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
  renderAdvancedCharts(dashboard);
  renderHomeTickerTape(dashboard.trending ?? []);
  renderHomeInsights(dashboard);
  renderRegimePanel(dashboard);
  renderCompareOptions();
}

function renderHomeTickerTape(rows) {
  if (!rows.length) {
    dom.homeTickerTape.innerHTML = `<span class="ticker-tape-item">No active tickers yet</span>`;
    return;
  }

  const chips = rows
    .slice(0, 8)
    .map(
      (row) =>
        `<span class="ticker-tape-item"><strong>${row.ticker}</strong> <span>${formatSigned(row.averageSentiment)}</span> <span>${row.mentions}x</span></span>`,
    )
    .join("");

  dom.homeTickerTape.innerHTML = `${chips}${chips}`;
}

function renderHomeInsights(dashboard) {
  const trending = dashboard?.trending || [];
  const sources = dashboard?.sources || {};

  const opportunity = [...trending].sort((a, b) => (b.averageSentiment + b.momentum * 0.5) - (a.averageSentiment + a.momentum * 0.5))[0];
  const risk = [...trending].sort((a, b) => (a.averageSentiment - a.momentum * 0.25) - (b.averageSentiment - b.momentum * 0.25))[0];
  const dominantSource = Object.entries(sources).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0];

  if (dom.homeInsightOpportunity) {
    dom.homeInsightOpportunity.textContent = opportunity ? `${opportunity.ticker} lead setup` : "No opportunity signal";
  }
  if (dom.homeInsightOpportunityCopy) {
    dom.homeInsightOpportunityCopy.textContent = opportunity
      ? `${opportunity.mentions} mentions, sentiment ${formatSigned(opportunity.averageSentiment)}, momentum ${formatSigned(opportunity.momentum)}.`
      : "Run refresh to compute highest conviction setup.";
  }

  if (dom.homeInsightRisk) {
    dom.homeInsightRisk.textContent = risk ? `${risk.ticker} downside pocket` : "No risk concentration";
  }
  if (dom.homeInsightRiskCopy) {
    dom.homeInsightRiskCopy.textContent = risk
      ? `${risk.mentions} mentions with sentiment ${formatSigned(risk.averageSentiment)}.`
      : "Sentiment downside and momentum decay will appear here.";
  }

  if (dom.homeInsightSource) {
    dom.homeInsightSource.textContent = dominantSource ? `${toTitleCase(dominantSource[0])} channel` : "No source concentration";
  }
  if (dom.homeInsightSourceCopy) {
    dom.homeInsightSourceCopy.textContent = dominantSource
      ? `${dominantSource[1]} items (${Math.round((Number(dominantSource[1] || 0) / Math.max(Number(dashboard?.overview?.totalItems || 0), 1)) * 100)}% of flow).`
      : "Source concentration updates as news and reddit flow in.";
  }
}

function renderRegimePanel(dashboard) {
  if (!dom.regimeChip || !dom.regimeSummary || !dom.regimeConfidence) {
    return;
  }

  const overview = dashboard?.overview || {};
  const sentiment = Number(overview.sentimentIndex || 0);
  const volatility = Number(overview.volatilityIndex || 0);
  const trend = String(overview.trendDirection || "flat").toLowerCase();

  let regime = "neutral";
  let title = "Balanced / transition regime";
  if ((sentiment >= 8 && trend !== "down") || (sentiment >= 4 && trend === "up")) {
    regime = "risk-on";
    title = "Risk-on regime with bullish pressure";
  } else if ((sentiment <= -8 && trend !== "up") || (sentiment <= -4 && trend === "down")) {
    regime = "risk-off";
    title = "Risk-off regime with defensive tone";
  }

  dom.regimeChip.className = `regime-chip ${regime}`;
  dom.regimeChip.textContent = regime === "risk-on" ? "Risk-On" : regime === "risk-off" ? "Risk-Off" : "Balanced";
  dom.regimeSummary.textContent = `${title}. Trend is ${toTitleCase(trend)} with volatility ${volatility.toFixed(1)}.`;

  const confidence = clamp(Math.round(Math.abs(sentiment) * 3.4 + (trend === "flat" ? 12 : 24) - volatility * 0.35), 18, 96);
  dom.regimeConfidence.textContent = `Confidence: ${confidence}%`;
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
          <div class="ticker-bar"><span style="width:${Math.max(positivePct, 2)}%;background:#23a874"></span></div>
          <div class="ticker-bar"><span style="width:${Math.max(negativePct, 2)}%;background:#d6655c"></span></div>
          <div class="ticker-bar"><span style="width:${Math.max(neutralPct, 2)}%;background:#bea763"></span></div>
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
      const hue = row.averageSentiment >= 0 ? "#21a876" : "#d4685c";
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
      const tickerChips = (row.tickerFocus || []).map((ticker) => `<span class="inline-pill">${ticker}</span>`).join("");
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
  const sortedItems = sortFeedItems(items);

  if (!sortedItems.length) {
    dom.feedList.innerHTML = `<div class="empty-state">No feed items match your active filters.</div>`;
    applyFeedDensity();
    return;
  }

  dom.feedList.innerHTML = sortedItems
    .map((item) => {
      const sentiment = item.sentiment || {};
      const sentimentClass = sentimentClassFromLabel(sentiment.label);
      const themes = (item.themes || []).map((theme) => `<span class="theme-pill">${theme}</span>`).join("");
      const tickers = (item.tickers || []).slice(0, 6).map((ticker) => `<span class="inline-pill" data-filter-ticker="${ticker}">${ticker}</span>`).join("");
      const bookmarked = state.bookmarks.some((row) => row.id === item.id);

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
        <div class="feed-item-actions">
          <a href="${escapeAttribute(item.url || "#")}" target="_blank" rel="noreferrer">Open source</a>
          <button class="mini-btn ${bookmarked ? "active" : ""}" type="button" data-bookmark-toggle="${item.id}">
            ${bookmarked ? "Saved" : "Save"}
          </button>
        </div>
      </article>`;
    })
    .join("");

  applyFeedDensity();
}

function renderFeedMetrics(items) {
  if (!dom.feedMetricTotal || !dom.feedMetricPositive || !dom.feedMetricNegative) {
    return;
  }

  const total = items.length;
  const positive = items.filter((item) => String(item?.sentiment?.label || "").toLowerCase() === "positive").length;
  const negative = items.filter((item) => String(item?.sentiment?.label || "").toLowerCase() === "negative").length;

  dom.feedMetricTotal.textContent = String(total);
  dom.feedMetricPositive.textContent = String(positive);
  dom.feedMetricNegative.textContent = String(negative);
}

function sortFeedItems(items) {
  const sorted = [...items];
  const byDateDesc = (a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();

  switch (state.feedSort) {
    case "sentiment_high":
      sorted.sort((a, b) => Number(b?.sentiment?.score || 0) - Number(a?.sentiment?.score || 0) || byDateDesc(a, b));
      break;
    case "sentiment_low":
      sorted.sort((a, b) => Number(a?.sentiment?.score || 0) - Number(b?.sentiment?.score || 0) || byDateDesc(a, b));
      break;
    case "confidence":
      sorted.sort((a, b) => Number(b?.sentiment?.confidence || 0) - Number(a?.sentiment?.confidence || 0) || byDateDesc(a, b));
      break;
    case "ticker_density":
      sorted.sort((a, b) => (b?.tickers?.length || 0) - (a?.tickers?.length || 0) || byDateDesc(a, b));
      break;
    case "recent":
    default:
      sorted.sort(byDateDesc);
      break;
  }

  return sorted;
}

function syncFeedControls() {
  if (dom.feedSortSelect) {
    dom.feedSortSelect.value = state.feedSort;
  }
  if (dom.feedDensityBtn) {
    dom.feedDensityBtn.textContent = `Density: ${state.feedDense ? "Compact" : "Cozy"}`;
  }
}

function applyFeedDensity() {
  if (!dom.feedList) {
    return;
  }
  dom.feedList.classList.toggle("is-compact", state.feedDense);
  syncFeedControls();
}

function renderBookmarks() {
  if (!state.bookmarks.length) {
    dom.bookmarkList.innerHTML = `<div class="empty-state">Save feed items to build a focused shortlist.</div>`;
    return;
  }

  dom.bookmarkList.innerHTML = [...state.bookmarks]
    .reverse()
    .map((item) => {
      const sentimentClass = sentimentClassFromLabel(item.sentiment?.label);
      const tickerChip = (item.tickers || [])
        .slice(0, 3)
        .map((ticker) => `<span class="inline-pill" data-filter-ticker="${ticker}">${ticker}</span>`)
        .join("");

      return `
      <article class="bookmark-item">
        <div class="bookmark-item-head">
          <h4>${escapeHtml(item.title || "Untitled")}</h4>
          <span class="sentiment-pill ${sentimentClass}">${formatSigned(item.sentiment?.score || 0)}</span>
        </div>
        <p>${escapeHtml(item.summary || item.text || "")}</p>
        <div class="bookmark-actions">
          ${tickerChip}
          <a href="${escapeAttribute(item.url || "#")}" target="_blank" rel="noreferrer">Open</a>
          <button class="mini-btn" type="button" data-remove-bookmark="${item.id}">Remove</button>
        </div>
      </article>`;
    })
    .join("");
}

function renderWatchlistTags() {
  if (!state.watchlist.length) {
    dom.watchlistTags.innerHTML = `<div class="empty-state">Add a ticker to start your watchtower.</div>`;
    return;
  }

  dom.watchlistTags.innerHTML = state.watchlist
    .map(
      (ticker) =>
        `<span class="watchlist-tag" data-filter-ticker="${ticker}">${ticker} <button type="button" data-remove-watch-ticker="${ticker}">×</button></span>`,
    )
    .join("");

  dom.watchlistTags.querySelectorAll("[data-remove-watch-ticker]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const ticker = button.dataset.removeWatchTicker;
      state.watchlist = state.watchlist.filter((symbol) => symbol !== ticker);
      saveWatchlist(state.watchlist);
      renderWatchlistTags();
      await refreshWatchlistData(false);
      renderAccountSummary();
    });
  });
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

function renderAlerts() {
  if (!state.alerts.length) {
    dom.alertsList.innerHTML = `<div class="empty-state">No alert rules yet. Add one to monitor sentiment thresholds.</div>`;
    return;
  }

  const watchIndex = new Map((state.watchlistData || []).map((row) => [row.ticker, row]));

  dom.alertsList.innerHTML = state.alerts
    .map((rule) => {
      const row = watchIndex.get(rule.ticker);
      const current = Number(row?.averageSentiment ?? 0);
      const triggered = rule.direction === "above" ? current >= rule.threshold : current <= rule.threshold;

      return `
      <article class="alert-item">
        <div class="alert-item-head">
          <h4>${rule.ticker} ${rule.direction === "above" ? "above" : "below"} ${rule.threshold}</h4>
          <span class="alert-status ${triggered ? "triggered" : ""}">${triggered ? "Triggered" : "Monitoring"}</span>
        </div>
        <p>Current sentiment: ${formatSigned(current)} | Created ${formatDateTime(rule.createdAt)}</p>
        <div class="alert-item-meta">
          <button class="mini-btn" type="button" data-remove-alert="${rule.id}">Remove</button>
        </div>
      </article>`;
    })
    .join("");
}

function renderWatchtowerInsights() {
  if (!dom.towerHealthScore || !dom.towerBestTicker || !dom.towerRiskTicker || !dom.towerTriggerCount) {
    return;
  }

  if (!state.watchlistData.length) {
    dom.towerHealthScore.textContent = "--";
    dom.towerBestTicker.textContent = "--";
    dom.towerRiskTicker.textContent = "--";
    dom.towerTriggerCount.textContent = "0";
    return;
  }

  const avgSentiment =
    state.watchlistData.reduce((sum, row) => sum + Number(row.averageSentiment || 0), 0) / Math.max(state.watchlistData.length, 1);
  const healthScore = clamp(Math.round(((avgSentiment + 100) / 200) * 100), 0, 100);
  const bestTicker = [...state.watchlistData].sort((a, b) => (b.averageSentiment + b.momentum * 0.45) - (a.averageSentiment + a.momentum * 0.45))[0];
  const riskTicker = [...state.watchlistData].sort((a, b) => (a.averageSentiment - a.momentum * 0.2) - (b.averageSentiment - b.momentum * 0.2))[0];

  let triggeredRules = 0;
  const watchIndex = new Map(state.watchlistData.map((row) => [row.ticker, row]));
  for (const rule of state.alerts) {
    const row = watchIndex.get(rule.ticker);
    if (!row) {
      continue;
    }
    const current = Number(row.averageSentiment || 0);
    const triggered = rule.direction === "above" ? current >= rule.threshold : current <= rule.threshold;
    if (triggered) {
      triggeredRules += 1;
    }
  }

  dom.towerHealthScore.textContent = `${healthScore}`;
  dom.towerBestTicker.textContent = bestTicker ? `${bestTicker.ticker} (${formatSigned(bestTicker.averageSentiment)})` : "--";
  dom.towerRiskTicker.textContent = riskTicker ? `${riskTicker.ticker} (${formatSigned(riskTicker.averageSentiment)})` : "--";
  dom.towerTriggerCount.textContent = String(triggeredRules);
}

function evaluateAlerts() {
  if (!state.alerts.length || !state.watchlistData.length) {
    return;
  }

  const watchIndex = new Map(state.watchlistData.map((row) => [row.ticker, row]));
  for (const rule of state.alerts) {
    const row = watchIndex.get(rule.ticker);
    if (!row) {
      continue;
    }

    const current = Number(row.averageSentiment || 0);
    const triggered = rule.direction === "above" ? current >= rule.threshold : current <= rule.threshold;
    if (triggered && !state.firedAlertIds.has(rule.id)) {
      state.firedAlertIds.add(rule.id);
      toast(`Alert: ${rule.ticker} ${rule.direction} ${rule.threshold} (${formatSigned(current)})`, "warn");
    }
  }
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

function renderCompareOptions() {
  const options = tickerUniverse();
  if (!options.length) {
    dom.compareA.innerHTML = "<option value=''>No tickers</option>";
    dom.compareB.innerHTML = "<option value=''>No tickers</option>";
    dom.compareResult.innerHTML = `<div class="empty-state">No ticker data available for comparison.</div>`;
    return;
  }

  if (!options.includes(state.compare.a)) {
    state.compare.a = options[0];
  }
  if (!options.includes(state.compare.b) || state.compare.b === state.compare.a) {
    state.compare.b = options[Math.min(1, options.length - 1)] || options[0];
  }

  dom.compareA.innerHTML = options.map((ticker) => `<option value="${ticker}" ${ticker === state.compare.a ? "selected" : ""}>${ticker}</option>`).join("");
  dom.compareB.innerHTML = options.map((ticker) => `<option value="${ticker}" ${ticker === state.compare.b ? "selected" : ""}>${ticker}</option>`).join("");
  runCompare();
}

function runCompare() {
  const a = sanitizeTicker(dom.compareA.value || state.compare.a);
  const b = sanitizeTicker(dom.compareB.value || state.compare.b);
  if (!a || !b || a === b) {
    dom.compareResult.innerHTML = `<div class="empty-state">Choose two different tickers.</div>`;
    return;
  }

  state.compare.a = a;
  state.compare.b = b;

  const index = new Map((state.dashboard?.trending || []).map((row) => [row.ticker, row]));
  const rowA = index.get(a) || state.watchlistData.find((row) => row.ticker === a);
  const rowB = index.get(b) || state.watchlistData.find((row) => row.ticker === b);

  if (!rowA || !rowB) {
    dom.compareResult.innerHTML = `<div class="empty-state">Comparison data unavailable for one or both symbols.</div>`;
    return;
  }

  const sentimentLead = rowA.averageSentiment >= rowB.averageSentiment ? a : b;
  const momentumLead = rowA.momentum >= rowB.momentum ? a : b;
  const mentionsLead = rowA.mentions >= rowB.mentions ? a : b;

  dom.compareResult.innerHTML = `
    <div class="feed-meta-left">
      <span class="badge">Sentiment Leader: <strong>${sentimentLead}</strong></span>
      <span class="badge">Momentum Leader: <strong>${momentumLead}</strong></span>
      <span class="badge">Coverage Leader: <strong>${mentionsLead}</strong></span>
    </div>
    <p>${a}: ${formatSigned(rowA.averageSentiment)} (${rowA.mentions} mentions) | ${b}: ${formatSigned(rowB.averageSentiment)} (${rowB.mentions} mentions)</p>
  `;
}

function renderAccountSummary() {
  const session = state.auth.session;
  const watchCount = state.watchlist.length;
  const bookmarkCount = state.bookmarks.length;
  const alertCount = state.alerts.length;
  const routeName = toTitleCase(state.route);

  dom.accountSummary.innerHTML = `
    <article class="account-card">
      <span>Profile</span>
      <strong>${escapeHtml(session?.email || "Guest Mode")}</strong>
      <p class="ticker-mentions">${session ? "Signed in" : "Local guest workspace"}</p>
    </article>
    <article class="account-card">
      <span>Saved Signals</span>
      <strong>${bookmarkCount}</strong>
      <p class="ticker-mentions">Bookmarked feed entries</p>
    </article>
    <article class="account-card">
      <span>Watchlist</span>
      <strong>${watchCount}</strong>
      <p class="ticker-mentions">Tracked ticker symbols</p>
    </article>
    <article class="account-card">
      <span>Alert Rules</span>
      <strong>${alertCount}</strong>
      <p class="ticker-mentions">Sentiment threshold monitors</p>
    </article>
    <article class="account-card">
      <span>Current Section</span>
      <strong>${routeName}</strong>
      <p class="ticker-mentions">Use top nav to switch workspaces</p>
    </article>
    <article class="account-card">
      <span>API Mode</span>
      <strong>${state.staticFallbackNotified ? "Static Snapshot" : "Live API"}</strong>
      <p class="ticker-mentions">Set API base in header to switch backend</p>
    </article>
  `;
}

function drawTimeline(points) {
  const canvas = dom.timelineCanvas;
  if (!canvas) {
    return;
  }
  const palette = themePalette();

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
    ctx.fillStyle = palette.timelineText;
    ctx.font = "500 13px Manrope";
    ctx.fillText("No timeline points yet", 16, 22);
    dom.timelineLegends.innerHTML = "";
    return;
  }

  const pad = { top: 20, right: 15, bottom: 30, left: 36 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;

  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (chartHeight / 4) * i;
    ctx.strokeStyle = palette.timelineGrid;
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
  gradient.addColorStop(0, palette.timelineAreaTop);
  gradient.addColorStop(1, palette.timelineAreaBottom);

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
  ctx.strokeStyle = palette.timelineLine;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  coords.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = palette.timelineDot;
    ctx.fill();
  });

  ctx.fillStyle = palette.timelineText;
  ctx.font = "500 11px Manrope";
  const step = Math.max(1, Math.floor(points.length / 5));
  points.forEach((point, index) => {
    if (index % step !== 0 && index !== points.length - 1) {
      return;
    }
    const x = pad.left + (index / Math.max(points.length - 1, 1)) * chartWidth;
    ctx.fillText(formatTimelineLabel(point.label), x - 24, height - 10);
  });

  dom.timelineLegends.innerHTML = [...points]
    .sort((a, b) => Math.abs(b.sentiment) - Math.abs(a.sentiment))
    .slice(0, 4)
    .map((point) => `<span class="legend-pill">${escapeHtml(point.leadTicker || "Macro")}: ${formatSigned(point.sentiment)}</span>`)
    .join("");
}

function renderAdvancedCharts(dashboard) {
  const canvases = [
    dom.chartSentimentVelocity,
    dom.chartSourceMix,
    dom.chartTickerRadar,
    dom.chartThemePressure,
  ];
  if (canvases.some((canvas) => !canvas)) {
    return;
  }

  const ChartLib = window.Chart;
  if (!ChartLib) {
    clearAdvancedCharts("Chart engine not available");
    return;
  }
  const palette = themePalette();

  const timeline = dashboard?.timeline || [];
  const trending = dashboard?.trending || [];
  const themes = dashboard?.themes || [];
  const sources = dashboard?.sources || {};

  const labels = timeline.map((point, index) => formatTimelineLabel(point.label || `T${index + 1}`));
  const sentimentSeries = timeline.map((point) => Number(point.sentiment || 0));
  const velocitySeries = sentimentSeries.map((value, index, arr) => {
    if (index === 0) {
      return 0;
    }
    return value - arr[index - 1];
  });

  const sourceEntries = Object.entries(sources).filter((entry) => Number(entry[1] || 0) > 0);
  const radarRows = trending.slice(0, 3);
  const mentionMax = Math.max(...radarRows.map((row) => Number(row.mentions || 0)), 1);
  const hypeMax = Math.max(...radarRows.map((row) => Number(row.hypeScore || 0)), 1);
  const topThemes = themes.slice(0, 8);

  upsertChart("sentimentVelocity", dom.chartSentimentVelocity, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Sentiment",
          data: sentimentSeries,
          borderColor: palette.chartPrimary,
          backgroundColor: palette.chartPrimaryFill,
          borderWidth: 2.2,
          fill: true,
          tension: 0.35,
          pointRadius: 2,
        },
        {
          label: "Velocity",
          data: velocitySeries,
          borderColor: palette.chartSecondary,
          borderWidth: 1.8,
          fill: false,
          tension: 0.25,
          pointRadius: 1.8,
        },
      ],
    },
    options: buildChartOptions({
      y: { min: -100, max: 100, title: { display: true, text: "Signal" } },
    }),
  });

  upsertChart("sourceMix", dom.chartSourceMix, {
    type: "doughnut",
    data: {
      labels: sourceEntries.length ? sourceEntries.map(([name]) => toTitleCase(name)) : ["No data"],
      datasets: [
        {
          data: sourceEntries.length ? sourceEntries.map(([, count]) => Number(count || 0)) : [1],
          backgroundColor: sourceEntries.length
            ? [palette.chartPrimary, palette.chartTertiary, palette.chartPositive, palette.chartSecondary, palette.chartWarning]
            : [palette.chartFallback],
          borderWidth: 1,
          borderColor: palette.chartBorder,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      ...buildChartOptions(),
      cutout: "68%",
      plugins: {
        ...buildChartOptions().plugins,
          legend: {
            position: "bottom",
            labels: {
              color: palette.chartText,
              boxWidth: 10,
            },
          },
      },
    },
  });

  upsertChart("tickerRadar", dom.chartTickerRadar, {
    type: "radar",
    data: {
      labels: ["Sentiment", "Momentum", "Mentions", "Bullish Ratio", "Hype"],
      datasets: radarRows.map((row, index) => {
        const datasetPalette = [
          [palette.chartPrimary, palette.chartPrimaryFill],
          [palette.chartTertiary, palette.chartTertiaryFill],
          [palette.chartPositive, palette.chartPositiveFill],
        ][index % 3];
        return {
          label: row.ticker,
          data: [
            clamp((Number(row.averageSentiment || 0) + 100) / 2, 0, 100),
            clamp((Number(row.momentum || 0) + 100) / 2, 0, 100),
            clamp((Number(row.mentions || 0) / mentionMax) * 100, 0, 100),
            clamp((Number(row.bullish || 0) / Math.max(Number(row.mentions || 0), 1)) * 100, 0, 100),
            clamp((Number(row.hypeScore || 0) / hypeMax) * 100, 0, 100),
          ],
          borderColor: datasetPalette[0],
          backgroundColor: datasetPalette[1],
          borderWidth: 1.8,
          pointRadius: 2,
        };
      }),
    },
    options: {
      ...buildChartOptions(),
      scales: {
        r: {
          min: 0,
          max: 100,
          angleLines: { color: palette.chartGridStrong },
          grid: { color: palette.chartGrid },
          pointLabels: {
            color: palette.chartText,
            font: { size: 10, weight: "600" },
          },
          ticks: { display: false, stepSize: 20 },
        },
      },
      plugins: {
        ...buildChartOptions().plugins,
        legend: {
          position: "bottom",
          labels: { color: palette.chartText, boxWidth: 10 },
        },
      },
    },
  });

  upsertChart("themePressure", dom.chartThemePressure, {
    type: "bar",
    data: {
      labels: topThemes.map((row) => row.theme),
      datasets: [
        {
          type: "bar",
          label: "Mentions",
          data: topThemes.map((row) => Number(row.mentions || 0)),
          backgroundColor: topThemes.map((row) => (Number(row.averageSentiment || 0) >= 0 ? palette.chartPositiveFill : palette.chartSecondaryFill)),
          borderColor: topThemes.map((row) => (Number(row.averageSentiment || 0) >= 0 ? palette.chartPositive : palette.chartSecondary)),
          borderWidth: 1.2,
          borderRadius: 6,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Sentiment",
          data: topThemes.map((row) => Number(row.averageSentiment || 0)),
          borderColor: palette.chartWarning,
          backgroundColor: palette.chartWarningFill,
          borderWidth: 1.8,
          tension: 0.3,
          pointRadius: 2,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      ...buildChartOptions(),
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: palette.chartGrid },
          ticks: { color: palette.chartText },
          title: { display: true, text: "Mentions", color: palette.chartAxisTitle },
        },
        y1: {
          position: "right",
          min: -100,
          max: 100,
          grid: { drawOnChartArea: false },
          ticks: { color: palette.chartText },
          title: { display: true, text: "Sentiment", color: palette.chartAxisTitle },
        },
        x: {
          grid: { display: false },
          ticks: { color: palette.chartText, maxRotation: 20, minRotation: 0 },
        },
      },
    },
  });
}

function buildChartOptions(overrides = {}) {
  const palette = themePalette();
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    animation: { duration: 420, easing: "easeOutQuart" },
    plugins: {
      legend: {
        labels: {
          color: palette.chartText,
          usePointStyle: true,
          boxWidth: 9,
          boxHeight: 9,
        },
      },
      tooltip: {
        backgroundColor: palette.chartTooltipBg,
        borderColor: palette.chartTooltipBorder,
        borderWidth: 1,
        titleColor: palette.chartTooltipTitle,
        bodyColor: palette.chartTooltipBody,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { color: palette.chartGridSoft },
        ticks: { color: palette.chartText },
      },
      y: {
        grid: { color: palette.chartGrid },
        ticks: { color: palette.chartText },
      },
    },
    ...overrides,
  };
}

function upsertChart(key, canvas, config) {
  if (!canvas) {
    return;
  }

  const prior = state.charts[key];
  if (prior) {
    prior.destroy();
  }

  const ctx = canvas.getContext("2d");
  if (!ctx || !window.Chart) {
    return;
  }

  if (!config?.data?.datasets?.length || config.data.datasets.every((dataset) => !Array.isArray(dataset.data) || dataset.data.length === 0)) {
    drawChartFallback(canvas, "No chart data yet");
    state.charts[key] = null;
    return;
  }

  state.charts[key] = new window.Chart(ctx, config);
}

function clearAdvancedCharts(message = "No chart data yet") {
  for (const [key, chart] of Object.entries(state.charts)) {
    if (chart) {
      chart.destroy();
      state.charts[key] = null;
    }
  }
  [dom.chartSentimentVelocity, dom.chartSourceMix, dom.chartTickerRadar, dom.chartThemePressure].forEach((canvas) => {
    drawChartFallback(canvas, message);
  });
}

function drawChartFallback(canvas, message) {
  if (!canvas) {
    return;
  }
  const palette = themePalette();
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const width = canvas.clientWidth || 320;
  const height = canvas.clientHeight || 180;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = palette.chartFallback;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = palette.timelineText;
  ctx.font = "600 12px Manrope";
  ctx.fillText(message, 14, 22);
}

function showFeedSkeleton() {
  if (!dom.loadingFeedTemplate) {
    return;
  }

  dom.feedList.innerHTML = "";
  for (let i = 0; i < 4; i += 1) {
    dom.feedList.appendChild(dom.loadingFeedTemplate.content.cloneNode(true));
  }
  applyFeedDensity();
}

function renderEmptyStates() {
  dom.trendingTickers.innerHTML = `<div class="empty-state">No market data available.</div>`;
  dom.themesList.innerHTML = `<div class="empty-state">No theme data available.</div>`;
  dom.narrativesList.innerHTML = `<div class="empty-state">No narrative data available.</div>`;
  dom.feedList.innerHTML = `<div class="empty-state">No feed data available.</div>`;
  renderFeedMetrics([]);
  dom.watchlistGrid.innerHTML = `<div class="empty-state">No watchlist data available.</div>`;
  dom.bookmarkList.innerHTML = `<div class="empty-state">No saved signals available.</div>`;
  dom.alertsList.innerHTML = `<div class="empty-state">No alerts data available.</div>`;
  renderWatchtowerInsights();
  renderHomeInsights({ trending: [], sources: {} });
  renderRegimePanel({ overview: {} });
  clearAdvancedCharts("No chart data available");
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
    setRoute("feed");
    await refreshFeed(false);
    return;
  }

  state.watchlist = [...state.watchlist, symbol].slice(-25);
  dom.watchlistInput.value = "";
  saveWatchlist(state.watchlist);
  renderWatchlistTags();
  await refreshWatchlistData(false);
  renderAccountSummary();
}

function addAlertRule() {
  const ticker = sanitizeTicker(dom.alertTickerInput.value);
  const direction = dom.alertDirectionSelect.value === "below" ? "below" : "above";
  const threshold = Number(dom.alertThresholdInput.value);

  if (!ticker) {
    toast("Enter a valid ticker for alert", "warn");
    return;
  }

  if (!Number.isFinite(threshold) || threshold < -100 || threshold > 100) {
    toast("Threshold must be between -100 and 100", "warn");
    return;
  }

  state.alerts = [
    ...state.alerts,
    {
      id: `alert_${Date.now()}_${ticker}`,
      ticker,
      direction,
      threshold: Math.round(threshold * 10) / 10,
      createdAt: new Date().toISOString(),
    },
  ];
  saveAlerts(state.alerts);
  renderAlerts();
  renderWatchtowerInsights();
  renderAccountSummary();

  dom.alertTickerInput.value = "";
  dom.alertThresholdInput.value = "20";
}

function toggleBookmarkById(itemId) {
  const existing = state.bookmarks.find((row) => row.id === itemId);
  if (existing) {
    state.bookmarks = state.bookmarks.filter((row) => row.id !== itemId);
    saveBookmarks(state.bookmarks);
    return;
  }

  const item = state.feed.find((row) => row.id === itemId);
  if (!item) {
    return;
  }

  state.bookmarks = [...state.bookmarks, item].slice(-120);
  saveBookmarks(state.bookmarks);
}

function removeBookmark(itemId) {
  state.bookmarks = state.bookmarks.filter((row) => row.id !== itemId);
  saveBookmarks(state.bookmarks);
}

function tickerUniverse() {
  const tickers = new Set();
  (state.dashboard?.trending || []).forEach((row) => tickers.add(row.ticker));
  (state.watchlistData || []).forEach((row) => tickers.add(row.ticker));
  state.watchlist.forEach((ticker) => tickers.add(ticker));
  return [...tickers].filter(Boolean).sort();
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

function setRefreshing(isRefreshing) {
  dom.refreshBtn.disabled = isRefreshing;
  dom.refreshBtn.textContent = isRefreshing ? "Refreshing..." : "Refresh";
}

function toast(message, level = "info") {
  const el = document.createElement("div");
  el.className = `toast ${level}`;
  el.textContent = message;
  dom.toastStack.appendChild(el);
  window.setTimeout(() => el.remove(), 3200);
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
  state.watchlist = loadWatchlist();
  state.watchlistData = [];
  state.bookmarks = loadBookmarks();
  state.alerts = loadAlerts();
  state.firedAlertIds = new Set();
  renderAuthState();
  renderWatchlistTags();
  renderBookmarks();
  renderAlerts();
  renderWatchtowerInsights();
  renderAccountSummary();
  toast("Signed out");
}

async function fetchJson(path) {
  const url = `${state.apiBase}${path}`;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
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
      renderAccountSummary();
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
    if (ticker && (!Array.isArray(item.tickers) || !item.tickers.includes(ticker))) {
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
  const sessionEmail = loadAuthSession()?.email;
  return sessionEmail ? `ssd_watchlist_${sessionEmail}` : WATCHLIST_KEY_GUEST;
}

function bookmarksStorageKey() {
  const sessionEmail = loadAuthSession()?.email;
  return sessionEmail ? `ssd_bookmarks_${sessionEmail}` : BOOKMARKS_KEY_GUEST;
}

function alertsStorageKey() {
  const sessionEmail = loadAuthSession()?.email;
  return sessionEmail ? `ssd_alerts_${sessionEmail}` : ALERTS_KEY_GUEST;
}

function loadWatchlist() {
  const legacy = localStorage.getItem("ssd_watchlist");
  const namespaced = localStorage.getItem(watchlistStorageKey());
  const source = namespaced ?? legacy;
  if (!source) {
    return DEFAULT_WATCHLIST;
  }

  try {
    const parsed = JSON.parse(source);
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

function loadBookmarks() {
  const raw = localStorage.getItem(bookmarksStorageKey());
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.slice(-120);
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks) {
  localStorage.setItem(bookmarksStorageKey(), JSON.stringify(bookmarks));
}

function loadAlerts() {
  const raw = localStorage.getItem(alertsStorageKey());
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
        id: String(row?.id || ""),
        ticker: sanitizeTicker(row?.ticker || ""),
        direction: row?.direction === "below" ? "below" : "above",
        threshold: Number(row?.threshold || 0),
        createdAt: String(row?.createdAt || ""),
      }))
      .filter((row) => row.id && row.ticker && Number.isFinite(row.threshold));
  } catch {
    return [];
  }
}

function saveAlerts(alerts) {
  localStorage.setItem(alertsStorageKey(), JSON.stringify(alerts));
}

function loadFeedSort() {
  const raw = String(localStorage.getItem(FEED_SORT_KEY) || "").trim();
  const allowed = new Set(["recent", "sentiment_high", "sentiment_low", "confidence", "ticker_density"]);
  return allowed.has(raw) ? raw : "recent";
}

function persistFeedSort(value) {
  localStorage.setItem(FEED_SORT_KEY, value);
}

function loadFeedDensity() {
  return localStorage.getItem(FEED_DENSITY_KEY) === "compact";
}

function persistFeedDensity(isCompact) {
  localStorage.setItem(FEED_DENSITY_KEY, isCompact ? "compact" : "cozy");
}

function loadTheme() {
  return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
}

function applyTheme(theme) {
  state.theme = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", state.theme);
  localStorage.setItem(THEME_KEY, state.theme);
  if (dom.themeToggleBtn) {
    const isDark = state.theme === "dark";
    dom.themeToggleBtn.textContent = `Theme: ${isDark ? "Dark" : "Light"}`;
    dom.themeToggleBtn.setAttribute("aria-pressed", String(isDark));
  }
}

function themePalette() {
  if (state.theme === "light") {
    return {
      timelineGrid: "rgba(120, 142, 192, 0.22)",
      timelineLine: "#0b7db0",
      timelineDot: "#0b7db0",
      timelineAreaTop: "rgba(14, 126, 184, 0.28)",
      timelineAreaBottom: "rgba(14, 126, 184, 0.04)",
      timelineText: "#5e7396",

      chartPrimary: "#0f8ecf",
      chartPrimaryFill: "rgba(15, 142, 207, 0.2)",
      chartSecondary: "#cc4a8c",
      chartSecondaryFill: "rgba(204, 74, 140, 0.24)",
      chartTertiary: "#6953dd",
      chartTertiaryFill: "rgba(105, 83, 221, 0.2)",
      chartPositive: "#1eaa75",
      chartPositiveFill: "rgba(30, 170, 117, 0.24)",
      chartWarning: "#cf8b1f",
      chartWarningFill: "rgba(207, 139, 31, 0.24)",
      chartFallback: "rgba(132, 150, 194, 0.2)",
      chartBorder: "rgba(18, 30, 58, 0.22)",
      chartGrid: "rgba(116, 139, 190, 0.2)",
      chartGridSoft: "rgba(116, 139, 190, 0.14)",
      chartGridStrong: "rgba(116, 139, 190, 0.28)",
      chartText: "#556f99",
      chartAxisTitle: "#5c78a8",
      chartTooltipBg: "rgba(245, 250, 255, 0.96)",
      chartTooltipBorder: "rgba(92, 123, 188, 0.35)",
      chartTooltipTitle: "#153258",
      chartTooltipBody: "#2d4e77",
    };
  }

  return {
    timelineGrid: "rgba(125, 146, 212, 0.2)",
    timelineLine: "#22d3ee",
    timelineDot: "#38bdf8",
    timelineAreaTop: "rgba(34, 211, 238, 0.36)",
    timelineAreaBottom: "rgba(34, 211, 238, 0.04)",
    timelineText: "#9fb0d4",

    chartPrimary: "#22d3ee",
    chartPrimaryFill: "rgba(34, 211, 238, 0.2)",
    chartSecondary: "#f472b6",
    chartSecondaryFill: "rgba(244, 114, 182, 0.26)",
    chartTertiary: "#a78bfa",
    chartTertiaryFill: "rgba(167, 139, 250, 0.22)",
    chartPositive: "#34d399",
    chartPositiveFill: "rgba(52, 211, 153, 0.24)",
    chartWarning: "#fbbf24",
    chartWarningFill: "rgba(251, 191, 36, 0.2)",
    chartFallback: "rgba(148, 166, 213, 0.25)",
    chartBorder: "rgba(13, 18, 35, 0.65)",
    chartGrid: "rgba(128, 148, 202, 0.18)",
    chartGridSoft: "rgba(128, 148, 202, 0.14)",
    chartGridStrong: "rgba(154, 173, 219, 0.2)",
    chartText: "#b9c9ee",
    chartAxisTitle: "#96addc",
    chartTooltipBg: "rgba(8, 13, 28, 0.94)",
    chartTooltipBorder: "rgba(95, 122, 196, 0.55)",
    chartTooltipTitle: "#e3ecff",
    chartTooltipBody: "#d3def7",
  };
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

function initialRoute() {
  const hash = String(window.location.hash || "").replace(/^#\/?/, "").trim().toLowerCase();
  if (ROUTES.includes(hash)) {
    return hash;
  }
  return "home";
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
