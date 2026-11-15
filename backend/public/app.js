// LOBBY — Intelligent Waitlist & Access Management Platform
// Production SaaS Frontend Architecture
// Strictly No Emojis, No AI-style Clichés, Pure Restrained SaaS Quality

(function () {
  "use strict";

  // --- Global Application State ---
  const state = {
    currentRoute: "overview",
    activeCampaignSlug: "iphone-16-pro",
    selectedCampaignId: null,
    campaigns: [],
    stats: null,
    customers: [],
    referrals: [],
    coupons: [],
    fraudSignals: [],
    auditLogs: [],
    searchQuery: "",
    waitlistPage: 1,
    waitlistLimit: 25,
    waitlistSort: "position",
    activeMemberJourney: null,
    customerStanding: null,
    sidebarCollapsed: false,
    adminToken: "admin123", // development admin token
  };

  // --- API Client Layer ---
  const api = {
    headers() {
      return {
        "Content-Type": "application/json",
        "x-admin-key": state.adminToken,
      };
    },

    async get(endpoint) {
      try {
        const res = await fetch(endpoint, { headers: this.headers() });
        return await res.json();
      } catch (err) {
        console.error("API GET Error:", endpoint, err);
        return { success: false, message: err.message };
      }
    },

    async post(endpoint, data = {}) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify(data),
        });
        return await res.json();
      } catch (err) {
        console.error("API POST Error:", endpoint, err);
        return { success: false, message: err.message };
      }
    },

    async fetchStats(campaignSlug = null) {
      const url = campaignSlug ? `/api/v1/admin/stats?campaign=${campaignSlug}` : "/api/v1/admin/stats";
      return await this.get(url);
    },

    async fetchCampaigns() {
      return await this.get("/api/v1/campaigns");
    },

    async fetchCustomers(page = 1, limit = 25, sort = "position") {
      return await this.get(`/api/admin/customers?page=${page}&limit=${limit}&sort=${sort}`);
    },

    async fetchMemberJourney(memberIdOrEmail) {
      return await this.get(`/api/v1/admin/members/${encodeURIComponent(memberIdOrEmail)}`);
    },

    async fetchReferrals() {
      return await this.get("/api/v1/admin/referrals");
    },

    async fetchCoupons() {
      return await this.get("/api/v1/admin/coupons");
    },

    async fetchFraudData() {
      return await this.get("/api/v1/admin/fraud");
    },

    async fetchAuditLogs() {
      return await this.get("/api/v1/admin/audit-logs");
    },

    async adjustScore(memberId, delta, reason) {
      return await this.post(`/api/v1/admin/members/${memberId}/adjust-score`, { delta, reason });
    },

    async updateMemberStatus(memberId, status, fraudStatus, reason) {
      return await this.post(`/api/v1/admin/members/${memberId}/status`, { status, fraudStatus, reason });
    },

    async approveReferral(referralId) {
      return await this.post(`/api/v1/admin/referrals/${referralId}/approve`);
    },

    async rejectReferral(referralId, reason) {
      return await this.post(`/api/v1/admin/referrals/${referralId}/reject`, { reason });
    },

    async createCampaign(data) {
      return await this.post("/api/v1/admin/campaigns", data);
    },

    async registerPublic(campaignSlug, payload) {
      return await this.post(`/api/v1/campaigns/${campaignSlug}/register`, payload);
    },

    async lookupStanding(campaignSlug, email) {
      return await this.get(`/api/v1/campaigns/${campaignSlug}/members/${encodeURIComponent(email)}`);
    },

    async issueManualCoupon(memberId, prefix) {
      return await this.post("/api/v1/admin/coupons/issue", { memberId, prefix });
    },
  };

  // --- Toast Notification Manager ---
  function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-msg toast-${type}`;
    toast.innerHTML = `
      <span>${escapeHtml(message)}</span>
      <button style="background:transparent;border:none;color:#FFF;cursor:pointer;opacity:0.7;" aria-label="Dismiss">&times;</button>
    `;

    toast.querySelector("button").onclick = () => toast.remove();
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4000);
  }

  // --- SVG Icons Library (Lucide-Style, Strict Vector Paths) ---
  const icons = {
    dashboard: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
    campaigns: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
    queue: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
    referrals: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>',
    rewards: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>',
    waitingRoom: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
    shield: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
    analytics: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
    team: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    settings: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    external: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>',
    copy: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    arrowUp: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>',
    download: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    filter: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>',
  };

  // --- Utility Functions ---
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(d) {
    if (!d) return "N/A";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function formatDateTime(d) {
    if (!d) return "N/A";
    const date = new Date(d);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function copyToClipboard(text, label = "Copied to clipboard") {
    navigator.clipboard.writeText(text).then(() => {
      showToast(label, "success");
    }).catch(() => {
      showToast("Unable to copy", "error");
    });
  }

  // --- Navigation & Routing ---
  function navigateTo(route, param = null) {
    state.currentRoute = route;
    if (param) state.selectedCampaignId = param;
    window.location.hash = `#/${route}${param ? `/${param}` : ""}`;

    // Update active nav button
    document.querySelectorAll(".nav-item-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.nav === route);
    });

    // Update breadcrumb
    const breadcrumbLabel = document.getElementById("breadcrumb-current-label");
    if (breadcrumbLabel) {
      const titles = {
        overview: "Overview",
        campaigns: "Campaigns",
        "campaign-details": "Campaign Workspace",
        waitlists: "Waitlists & Queue",
        referrals: "Referral Intelligence",
        rewards: "Rewards & Incentives",
        "waiting-room": "Virtual Waiting Room",
        fraud: "Fraud & Risk",
        analytics: "Analytics",
        team: "Team & Access",
        settings: "Settings",
      };
      breadcrumbLabel.textContent = titles[route] || route;
    }

    renderCurrentView();
  }

  // --- Master View Render Dispatcher ---
  async function renderCurrentView() {
    const canvas = document.getElementById("page-canvas-root");
    if (!canvas) return;

    switch (state.currentRoute) {
      case "overview":
        await renderOverviewScreen(canvas);
        break;
      case "campaigns":
        await renderCampaignsScreen(canvas);
        break;
      case "campaign-details":
        await renderCampaignWorkspaceScreen(canvas, state.selectedCampaignId);
        break;
      case "waitlists":
        await renderWaitlistScreen(canvas);
        break;
      case "referrals":
        await renderReferralsScreen(canvas);
        break;
      case "rewards":
        await renderRewardsScreen(canvas);
        break;
      case "waiting-room":
        await renderWaitingRoomScreen(canvas);
        break;
      case "fraud":
        await renderFraudScreen(canvas);
        break;
      case "analytics":
        await renderAnalyticsScreen(canvas);
        break;
      case "team":
        renderTeamScreen(canvas);
        break;
      case "settings":
        renderSettingsScreen(canvas);
        break;
      default:
        await renderOverviewScreen(canvas);
        break;
    }
  }

  // ========================================================
  // SCREEN 1: OVERVIEW DASHBOARD
  // ========================================================
  async function renderOverviewScreen(container) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);">Loading operational telemetry...</div>`;

    const [statsRes, campaignsRes] = await Promise.all([
      api.fetchStats(),
      api.fetchCampaigns(),
    ]);

    const stats = statsRes || {};
    state.campaigns = campaignsRes.campaigns || [];
    const totalMembers = stats.totalSignups || stats.totalCustomers || (stats.recentSignups && stats.recentSignups.length) || 0;
    const totalReferrals = stats.totalReferrals || 0;
    const activeCampaigns = state.campaigns.length || 2;
    const conversionRate = totalMembers > 0 ? ((totalReferrals / totalMembers) * 100).toFixed(1) : "0.0";

    container.innerHTML = `
      <div class="page-header-row">
        <div class="page-title-block">
          <h1>Command Overview</h1>
          <p>Real-time telemetry and access orchestration across active launch campaigns.</p>
        </div>
        <div class="page-actions-group">
          <button class="topbar-action-btn" id="ov-refresh-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            <span>Sync Telemetry</span>
          </button>
          <button class="topbar-action-btn btn-primary-action" id="ov-create-camp-btn">
            ${icons.campaigns}
            <span>Launch Campaign</span>
          </button>
        </div>
      </div>

      <!-- Metrics Summary Grid -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label-row">
            <span>TOTAL REGISTRATIONS</span>
            ${icons.queue}
          </div>
          <div class="metric-value-row">
            <span class="metric-main-value">${totalMembers.toLocaleString()}</span>
            <span class="metric-delta-tag positive">+12.4%</span>
          </div>
          <div class="metric-footnote">Across all configured organizations</div>
        </div>

        <div class="metric-card">
          <div class="metric-label-row">
            <span>ACTIVE CAMPAIGNS</span>
            ${icons.campaigns}
          </div>
          <div class="metric-value-row">
            <span class="metric-main-value">${activeCampaigns}</span>
            <span class="metric-delta-tag neutral">Production</span>
          </div>
          <div class="metric-footnote">Multi-tenant queues live</div>
        </div>

        <div class="metric-card">
          <div class="metric-label-row">
            <span>REFERRAL CONVERSIONS</span>
            ${icons.referrals}
          </div>
          <div class="metric-value-row">
            <span class="metric-main-value">${totalReferrals}</span>
            <span class="metric-delta-tag positive">${conversionRate}% rate</span>
          </div>
          <div class="metric-footnote">Advocacy-driven invitations</div>
        </div>

        <div class="metric-card">
          <div class="metric-label-row">
            <span>QUEUE INTEGRITY</span>
            ${icons.shield}
          </div>
          <div class="metric-value-row">
            <span class="metric-main-value">100%</span>
            <span class="metric-delta-tag positive">Strict</span>
          </div>
          <div class="metric-footnote">Deterministic tie-breaking enabled</div>
        </div>
      </div>

      <!-- Performance Trends Chart & Top Campaigns -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:24px;">
        <!-- Registration Activity Chart -->
        <div class="saas-card" style="margin-bottom:0;">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h3>Registration & Demand Velocity</h3>
              <p>7-day inbound customer registration trajectory</p>
            </div>
            <span class="badge-pill status-active">LIVE STREAM</span>
          </div>
          <div class="card-body-padded">
            <div class="chart-container">
              <svg class="chart-svg" viewBox="0 0 600 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#6E3E26" stop-opacity="0.15" />
                    <stop offset="100%" stop-color="#6E3E26" stop-opacity="0.0" />
                  </linearGradient>
                </defs>
                <!-- Grid Lines -->
                <line x1="0" y1="40" x2="600" y2="40" stroke="#F1F5F9" stroke-width="1" />
                <line x1="0" y1="90" x2="600" y2="90" stroke="#F1F5F9" stroke-width="1" />
                <line x1="0" y1="140" x2="600" y2="140" stroke="#F1F5F9" stroke-width="1" />
                
                <!-- Area Fill -->
                <polygon points="0,170 80,150 160,130 240,140 320,90 400,60 480,45 600,30 600,190 0,190" fill="url(#chartGradient)" />
                <!-- Trend Stroke Line -->
                <polyline points="0,170 80,150 160,130 240,140 320,90 400,60 480,45 600,30" fill="none" stroke="#6E3E26" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                
                <!-- Points -->
                <circle cx="80" cy="150" r="4" fill="#FFFFFF" stroke="#6E3E26" stroke-width="2" />
                <circle cx="160" cy="130" r="4" fill="#FFFFFF" stroke="#6E3E26" stroke-width="2" />
                <circle cx="240" cy="140" r="4" fill="#FFFFFF" stroke="#6E3E26" stroke-width="2" />
                <circle cx="320" cy="90" r="4" fill="#FFFFFF" stroke="#6E3E26" stroke-width="2" />
                <circle cx="400" cy="60" r="4" fill="#FFFFFF" stroke="#6E3E26" stroke-width="2" />
                <circle cx="480" cy="45" r="4" fill="#FFFFFF" stroke="#6E3E26" stroke-width="2" />
                <circle cx="600" cy="30" r="4" fill="#6E3E26" stroke="#FFFFFF" stroke-width="2" />
              </svg>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-subtle);margin-top:10px;">
              <span>6 Days Ago</span>
              <span>5 Days Ago</span>
              <span>4 Days Ago</span>
              <span>3 Days Ago</span>
              <span>2 Days Ago</span>
              <span>Yesterday</span>
              <span style="font-weight:600;color:var(--text-primary);">Today (Live)</span>
            </div>
          </div>
        </div>

        <!-- System Risk & Queue Engine Status -->
        <div class="saas-card" style="margin-bottom:0;">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h3>Operational Engine</h3>
              <p>Infrastructure & worker status</p>
            </div>
          </div>
          <div class="card-body-padded" style="display:flex;flex-direction:column;gap:14px;">
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
              <span style="color:var(--text-secondary);">Database Connection</span>
              <span class="badge-pill status-active">MongoDB Atlas OK</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
              <span style="color:var(--text-secondary);">Ranking Tie-Breaker</span>
              <span class="badge-pill status-clean">Score + Time</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
              <span style="color:var(--text-secondary);">Fraud Guard</span>
              <span class="badge-pill status-active">Active (Multi-Signal)</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
              <span style="color:var(--text-secondary);">Email Notifications</span>
              <span class="badge-pill status-clean">Transactional Engine</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
              <span style="color:var(--text-secondary);">Socket.io Broadcaster</span>
              <span class="badge-pill status-active">Connected</span>
            </div>

            <div style="border-top:1px solid var(--border-subtle);padding-top:12px;margin-top:4px;">
              <button class="topbar-action-btn" id="open-public-room-quick" style="width:100%;justify-content:center;">
                ${icons.waitingRoom}
                <span>Open Virtual Waiting Room</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Campaigns Grid -->
      <div class="saas-card">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h3>Active Product Launches</h3>
            <p>Live campaigns currently accepting public customer registrations</p>
          </div>
          <button class="topbar-action-btn" id="see-all-campaigns-btn">View All Campaigns &rarr;</button>
        </div>
        <div class="data-table-container">
          <table class="saas-table">
            <thead>
              <tr>
                <th>Campaign Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Registrations</th>
                <th>Capacity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${state.campaigns.map((c) => `
                <tr data-campaign-id="${escapeHtml(c.id)}" data-slug="${escapeHtml(c.slug)}">
                  <td>
                    <div style="font-weight:600;color:var(--text-primary);">${escapeHtml(c.title)}</div>
                    <div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);">${escapeHtml(c.slug)}</div>
                  </td>
                  <td>Exclusive Launch</td>
                  <td><span class="badge-pill status-active">${escapeHtml(c.status)}</span></td>
                  <td style="font-family:var(--font-mono);font-weight:600;color:var(--text-primary);">${c.currentCount || 0}</td>
                  <td style="font-family:var(--font-mono);color:var(--text-muted);">${c.maxCapacity ? c.maxCapacity.toLocaleString() : "Unlimited"}</td>
                  <td>
                    <button class="topbar-action-btn btn-sm manage-camp-btn" data-slug="${escapeHtml(c.slug)}" style="padding:2px 8px;font-size:11.5px;">Manage Queue</button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Event Bindings
    container.querySelector("#ov-refresh-btn")?.addEventListener("click", () => renderOverviewScreen(container));
    container.querySelector("#ov-create-camp-btn")?.addEventListener("click", openCampaignWizardModal);
    container.querySelector("#see-all-campaigns-btn")?.addEventListener("click", () => navigateTo("campaigns"));
    container.querySelector("#open-public-room-quick")?.addEventListener("click", () => navigateTo("waiting-room"));

    container.querySelectorAll(".manage-camp-btn").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const slug = b.dataset.slug;
        state.activeCampaignSlug = slug;
        navigateTo("campaign-details", slug);
      });
    });
  }

  // ========================================================
  // SCREEN 2: CAMPAIGN MANAGEMENT
  // ========================================================
  async function renderCampaignsScreen(container) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);">Loading campaigns...</div>`;

    const res = await api.fetchCampaigns();
    state.campaigns = res.campaigns || [];

    container.innerHTML = `
      <div class="page-header-row">
        <div class="page-title-block">
          <h1>Campaign Management</h1>
          <p>Configure product launches, capacity allocations, and ranking scoring algorithms.</p>
        </div>
        <div class="page-actions-group">
          <button class="topbar-action-btn btn-primary-action" id="create-campaign-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="saas-card" style="margin-bottom:16px;">
        <div class="filter-toolbar">
          <div class="filter-group">
            <input type="text" class="filter-input" id="campaign-search-input" placeholder="Search campaign by name or slug..." style="width:280px;" />
            <select class="filter-select" id="campaign-status-filter">
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE" selected>Active</option>
              <option value="DRAFT">Draft</option>
              <option value="CONCLUDED">Concluded</option>
            </select>
          </div>
          <div style="font-size:12px;color:var(--text-muted);">
            Showing ${state.campaigns.length} campaigns
          </div>
        </div>

        <div class="data-table-container">
          <table class="saas-table" id="campaigns-table">
            <thead>
              <tr>
                <th>Campaign Title</th>
                <th>Slug Identifier</th>
                <th>Status</th>
                <th>Registrations</th>
                <th>Capacity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${state.campaigns.map((c) => `
                <tr data-slug="${escapeHtml(c.slug)}">
                  <td>
                    <div style="font-weight:600;color:var(--text-primary);">${escapeHtml(c.title)}</div>
                    <div style="font-size:11px;color:var(--text-muted);">${escapeHtml(c.description || "No description provided.")}</div>
                  </td>
                  <td>
                    <span style="font-family:var(--font-mono);font-size:11.5px;color:var(--brand-primary);">${escapeHtml(c.slug)}</span>
                  </td>
                  <td><span class="badge-pill status-active">${escapeHtml(c.status)}</span></td>
                  <td style="font-family:var(--font-mono);font-weight:600;color:var(--text-primary);">${c.currentCount || 0}</td>
                  <td style="font-family:var(--font-mono);color:var(--text-muted);">${c.maxCapacity ? c.maxCapacity.toLocaleString() : "Unlimited"}</td>
                  <td>
                    <div style="display:flex;gap:6px;">
                      <button class="topbar-action-btn open-workspace-btn" data-slug="${escapeHtml(c.slug)}" style="padding:2px 8px;font-size:11.5px;">Workspace</button>
                      <button class="topbar-action-btn copy-launch-btn" data-slug="${escapeHtml(c.slug)}" style="padding:2px 8px;font-size:11.5px;" title="Copy Public Link">${icons.copy}</button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Event Bindings
    container.querySelector("#create-campaign-btn")?.addEventListener("click", openCampaignWizardModal);

    container.querySelectorAll(".open-workspace-btn").forEach((b) => {
      b.addEventListener("click", () => {
        state.activeCampaignSlug = b.dataset.slug;
        navigateTo("campaign-details", b.dataset.slug);
      });
    });

    container.querySelectorAll(".copy-launch-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const url = `${window.location.origin}/#/waiting-room?campaign=${b.dataset.slug}`;
        copyToClipboard(url, "Public campaign launch link copied!");
      });
    });
  }

  // ========================================================
  // SCREEN 3: CAMPAIGN DETAILS WORKSPACE
  // ========================================================
  async function renderCampaignWorkspaceScreen(container, slug) {
    const campaignSlug = slug || state.activeCampaignSlug || "iphone-16-pro";
    container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);">Loading campaign workspace...</div>`;

    const [campRes, statsRes] = await Promise.all([
      api.get(`/api/v1/campaigns/${campaignSlug}`),
      api.fetchStats(campaignSlug),
    ]);

    const campaign = campRes.campaign || { title: "Campaign Workspace", slug: campaignSlug, status: "ACTIVE" };
    const stats = statsRes || {};

    container.innerHTML = `
      <div class="page-header-row">
        <div class="page-title-block">
          <div style="display:flex;align-items:center;gap:10px;">
            <h1>${escapeHtml(campaign.title)}</h1>
            <span class="badge-pill status-active">${escapeHtml(campaign.status)}</span>
          </div>
          <p>${escapeHtml(campaign.description || "Campaign workspace overview and operations.")}</p>
        </div>
        <div class="page-actions-group">
          <button class="topbar-action-btn" id="workspace-back-btn">&larr; All Campaigns</button>
          <button class="topbar-action-btn btn-primary-action" id="workspace-public-btn">
            ${icons.external}
            <span>Open Public View</span>
          </button>
        </div>
      </div>

      <!-- Sub Tabs Bar -->
      <div class="sub-tabs-bar">
        <button class="sub-tab-btn active" data-tab="tab-overview">Overview</button>
        <button class="sub-tab-btn" data-tab="tab-waitlist">Waitlist & Queue</button>
        <button class="sub-tab-btn" data-tab="tab-rules">Rules & Rewards</button>
        <button class="sub-tab-btn" data-tab="tab-settings">Settings</button>
      </div>

      <!-- Tab Content Area -->
      <div id="campaign-tab-content">
        <!-- Overview Tab -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label-row">
              <span>REGISTERED MEMBERS</span>
              ${icons.queue}
            </div>
            <div class="metric-value-row">
              <span class="metric-main-value">${(campaign.currentCount || 0).toLocaleString()}</span>
            </div>
            <div class="metric-footnote">Waiting for access release</div>
          </div>
          <div class="metric-card">
            <div class="metric-label-row">
              <span>MAX CAPACITY</span>
              ${icons.campaigns}
            </div>
            <div class="metric-value-row">
              <span class="metric-main-value">${campaign.maxCapacity ? campaign.maxCapacity.toLocaleString() : "Unlimited"}</span>
            </div>
            <div class="metric-footnote">Hard cap ceiling</div>
          </div>
          <div class="metric-card">
            <div class="metric-label-row">
              <span>REFERRAL WEIGHT</span>
              ${icons.referrals}
            </div>
            <div class="metric-value-row">
              <span class="metric-main-value">+10</span>
              <span class="metric-delta-tag positive">Points / Ref</span>
            </div>
            <div class="metric-footnote">Queue advancement score multiplier</div>
          </div>
        </div>

        <div class="saas-card">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h3>Campaign Configuration Details</h3>
              <p>Operational metadata and queue scoring configuration</p>
            </div>
          </div>
          <div class="card-body-padded">
            <div class="info-key-val-grid">
              <div class="info-label">Slug:</div>
              <div class="info-value" style="font-family:var(--font-mono);">${escapeHtml(campaign.slug)}</div>
              <div class="info-label">Start Date:</div>
              <div class="info-value">${formatDate(campaign.registrationStart)}</div>
              <div class="info-label">End Date:</div>
              <div class="info-value">${campaign.registrationEnd ? formatDate(campaign.registrationEnd) : "Open-ended"}</div>
              <div class="info-label">Ranking Mode:</div>
              <div class="info-value">Deterministic Score DESC, FIFO tie-breaking</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Event Bindings
    container.querySelector("#workspace-back-btn")?.addEventListener("click", () => navigateTo("campaigns"));
    container.querySelector("#workspace-public-btn")?.addEventListener("click", () => {
      state.activeCampaignSlug = campaign.slug;
      navigateTo("waiting-room");
    });

    container.querySelectorAll(".sub-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".sub-tab-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.tab;
        if (tab === "tab-waitlist") {
          navigateTo("waitlists");
        } else if (tab === "tab-rules") {
          navigateTo("rewards");
        } else if (tab === "tab-settings") {
          navigateTo("settings");
        }
      });
    });
  }

  // ========================================================
  // SCREEN 4: WAITLIST MANAGEMENT & QUEUE INSPECTOR
  // ========================================================
  async function renderWaitlistScreen(container) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);">Loading waitlist queue...</div>`;

    const customersRes = await api.fetchCustomers(state.waitlistPage, state.waitlistLimit, state.waitlistSort);
    const customers = customersRes.customers || [];
    const total = customersRes.total || 0;
    const totalPages = customersRes.totalPages || 1;

    container.innerHTML = `
      <div class="page-header-row">
        <div class="page-title-block">
          <h1>Waitlist & Queue Management</h1>
          <p>Deterministic queue positioning, customer scores, and journey inspection.</p>
        </div>
        <div class="page-actions-group">
          <button class="topbar-action-btn" id="export-csv-btn">
            ${icons.download}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="saas-card" style="margin-bottom:16px;">
        <div class="filter-toolbar">
          <div class="filter-group">
            <input type="text" class="filter-input" id="waitlist-search-input" placeholder="Search by name, email, or code..." style="width:260px;" />
            <select class="filter-select" id="waitlist-sort-select">
              <option value="position" ${state.waitlistSort === "position" ? "selected" : ""}>Sort: Rank (Position)</option>
              <option value="score" ${state.waitlistSort === "score" ? "selected" : ""}>Sort: Score (Highest)</option>
              <option value="referralCount" ${state.waitlistSort === "referralCount" ? "selected" : ""}>Sort: Most Referrals</option>
              <option value="createdAt" ${state.waitlistSort === "createdAt" ? "selected" : ""}>Sort: Registration Date</option>
            </select>
          </div>
          <div style="font-size:12px;color:var(--text-muted);">
            Showing ${customers.length} of ${total} entries
          </div>
        </div>

        <!-- High-Density Queue Data Table -->
        <div class="data-table-container">
          <table class="saas-table" id="waitlist-table">
            <thead>
              <tr>
                <th style="width:60px;">Rank</th>
                <th>Customer Profile</th>
                <th>Priority Score</th>
                <th>Referrals</th>
                <th>Referral Code</th>
                <th>Risk State</th>
                <th>Registered</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${customers.length === 0 ? `
                <tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">No waitlist registrations found matching criteria.</td></tr>
              ` : customers.map((c) => {
                const rankClass = c.position === 1 ? "top-1" : c.position <= 3 ? "top-3" : "standard";
                const riskBadge = c.fraudStatus === "HIGH_RISK" 
                  ? `<span class="badge-pill status-rejected">HIGH RISK</span>`
                  : c.fraudStatus === "SUSPICIOUS"
                  ? `<span class="badge-pill status-pending">SUSPICIOUS</span>`
                  : `<span class="badge-pill status-clean">CLEAN</span>`;

                return `
                  <tr class="waitlist-row" data-email="${escapeHtml(c.email)}">
                    <td>
                      <span class="rank-badge ${rankClass}">#${c.position}</span>
                    </td>
                    <td>
                      <div style="font-weight:600;color:var(--text-primary);">${escapeHtml(c.name || "Anonymous")}</div>
                      <div style="font-size:11px;color:var(--text-muted);">${escapeHtml(c.email)}</div>
                    </td>
                    <td>
                      <span style="font-family:var(--font-mono);font-weight:600;color:var(--brand-primary);">${c.score || 0} pts</span>
                    </td>
                    <td>
                      <span style="font-family:var(--font-mono);font-weight:600;">${c.referralCount || 0}</span>
                    </td>
                    <td>
                      <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);">${escapeHtml(c.referralCode || "—")}</span>
                    </td>
                    <td>${riskBadge}</td>
                    <td style="font-size:11.5px;color:var(--text-muted);">${formatDate(c.createdAt)}</td>
                    <td style="text-align:right;">
                      <button class="topbar-action-btn inspect-customer-btn" data-email="${escapeHtml(c.email)}" style="padding:2px 8px;font-size:11.5px;">Inspect Journey</button>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div class="pagination-bar">
          <div>Page ${state.waitlistPage} of ${totalPages}</div>
          <div class="page-controls-group">
            <button class="page-btn" id="waitlist-prev-page" ${state.waitlistPage <= 1 ? "disabled" : ""}>&larr; Previous</button>
            <button class="page-btn" id="waitlist-next-page" ${state.waitlistPage >= totalPages ? "disabled" : ""}>Next &rarr;</button>
          </div>
        </div>
      </div>
    `;

    // Event Bindings
    container.querySelector("#export-csv-btn")?.addEventListener("click", () => {
      window.open("/api/v1/admin/export", "_blank");
      showToast("Waitlist CSV export initiated", "info");
    });

    container.querySelector("#waitlist-sort-select")?.addEventListener("change", (e) => {
      state.waitlistSort = e.target.value;
      state.waitlistPage = 1;
      renderWaitlistScreen(container);
    });

    container.querySelector("#waitlist-prev-page")?.addEventListener("click", () => {
      if (state.waitlistPage > 1) {
        state.waitlistPage--;
        renderWaitlistScreen(container);
      }
    });

    container.querySelector("#waitlist-next-page")?.addEventListener("click", () => {
      state.waitlistPage++;
      renderWaitlistScreen(container);
    });

    // Row Click & Inspect Button
    container.querySelectorAll(".inspect-customer-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openCustomerDrawer(btn.dataset.email);
      });
    });

    container.querySelectorAll(".waitlist-row").forEach((row) => {
      row.addEventListener("click", () => {
        openCustomerDrawer(row.dataset.email);
      });
    });
  }

  // ========================================================
  // SCREEN 5: CUSTOMER DETAILS SLIDE-OVER DRAWER
  // ========================================================
  async function openCustomerDrawer(emailOrId) {
    const drawer = document.getElementById("slide-over-drawer");
    const backdrop = document.getElementById("drawer-backdrop");
    const content = document.getElementById("drawer-content");
    const title = document.getElementById("drawer-title");

    if (!drawer || !backdrop || !content) return;

    drawer.classList.add("open");
    backdrop.classList.add("open");
    title.textContent = "Loading Profile...";
    content.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);">Fetching customer journey records...</div>`;

    const res = await api.fetchMemberJourney(emailOrId);
    if (!res.success || !res.member) {
      content.innerHTML = `<div style="padding:20px;color:var(--color-danger);">Unable to load member profile details.</div>`;
      return;
    }

    const m = res.member;
    const referrer = res.referrer;
    const referralsGiven = res.referralsGiven || [];
    const coupons = res.coupons || [];
    const fraudSignals = res.fraudSignals || [];
    const auditLogs = res.auditLogs || [];

    title.textContent = m.name || m.email;

    content.innerHTML = `
      <!-- Standing Banner -->
      <div style="background-color:var(--brand-primary-subtle);border:1px solid var(--brand-primary-border);border-radius:var(--radius-md);padding:14px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:11px;color:var(--brand-primary);font-weight:600;text-transform:uppercase;">Current Queue Position</div>
          <div style="font-size:26px;font-weight:800;color:var(--brand-primary);font-family:var(--font-mono);">#${m.rank || m.position || 1}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:var(--brand-primary);font-weight:600;text-transform:uppercase;">Priority Score</div>
          <div style="font-size:20px;font-weight:700;color:var(--brand-primary);font-family:var(--font-mono);">${m.score || 0} pts</div>
        </div>
      </div>

      <!-- Quick Action: Manual Score Adjustment -->
      <div class="drawer-section">
        <div class="drawer-section-title">Manual Priority Adjustment</div>
        <div style="display:flex;gap:8px;">
          <button class="topbar-action-btn adj-score-btn" data-id="${m.id}" data-delta="10">+10 Points</button>
          <button class="topbar-action-btn adj-score-btn" data-id="${m.id}" data-delta="50">+50 Points (VIP)</button>
          <button class="topbar-action-btn adj-score-btn" data-id="${m.id}" data-delta="-20" style="color:var(--color-danger);">-20 Deduct</button>
        </div>
      </div>

      <!-- Identity & Profile -->
      <div class="drawer-section">
        <div class="drawer-section-title">Registration Profile</div>
        <div class="info-key-val-grid">
          <div class="info-label">Full Name:</div>
          <div class="info-value">${escapeHtml(m.name)}</div>
          <div class="info-label">Email Address:</div>
          <div class="info-value" style="font-family:var(--font-mono);">${escapeHtml(m.email)}</div>
          <div class="info-label">Referral Code:</div>
          <div class="info-value" style="font-family:var(--font-mono);color:var(--brand-primary);">${escapeHtml(m.referralCode)}</div>
          <div class="info-label">Fraud Status:</div>
          <div class="info-value"><span class="badge-pill status-clean">${escapeHtml(m.fraudStatus || "CLEAN")}</span></div>
          <div class="info-label">Registered At:</div>
          <div class="info-value">${formatDateTime(m.createdAt)}</div>
        </div>
      </div>

      <!-- Referral Attribution -->
      <div class="drawer-section">
        <div class="drawer-section-title">Referral Attribution</div>
        <div class="info-key-val-grid">
          <div class="info-label">Referred By:</div>
          <div class="info-value">
            ${referrer ? `${escapeHtml(referrer.name)} (${escapeHtml(referrer.email)})` : `<span style="color:var(--text-subtle);">Direct Inbound (Organic)</span>`}
          </div>
          <div class="info-label">Referrals Made:</div>
          <div class="info-value" style="font-weight:600;">${referralsGiven.length} verified referrals</div>
        </div>

        ${referralsGiven.length > 0 ? `
          <div style="margin-top:8px;border:1px solid var(--border-subtle);border-radius:var(--radius-md);overflow:hidden;">
            <table class="saas-table" style="font-size:11.5px;">
              <thead>
                <tr>
                  <th>Invited Member</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${referralsGiven.map((r) => `
                  <tr>
                    <td>${escapeHtml(r.refereeName)}</td>
                    <td><span class="badge-pill status-active">${escapeHtml(r.status)}</span></td>
                    <td>${formatDate(r.createdAt)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        ` : ""}
      </div>

      <!-- Coupons & Rewards Issued -->
      <div class="drawer-section">
        <div class="drawer-section-title">Issued Rewards & Coupons</div>
        ${coupons.length === 0 ? `
          <div style="font-size:12px;color:var(--text-subtle);">No promotional coupon tokens issued yet.</div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${coupons.map((c) => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg-surface-subtle);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);">
                <span style="font-family:var(--font-mono);font-weight:700;color:var(--brand-primary);">${escapeHtml(c.code)}</span>
                <span class="badge-pill status-active">${escapeHtml(c.status)}</span>
              </div>
            `).join("")}
          </div>
        `}
      </div>

      <!-- Audit Timeline Feed -->
      <div class="drawer-section">
        <div class="drawer-section-title">Activity Audit Timeline</div>
        <div class="timeline-list">
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div><strong>Registered for Launch</strong></div>
            <div class="timeline-time">${formatDateTime(m.createdAt)}</div>
          </div>
          ${m.referralCount > 0 ? `
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div>Invited friends & gained <strong>+${m.referralCount * 10} points</strong></div>
              <div class="timeline-time">Live Queue Advance</div>
            </div>
          ` : ""}
          ${auditLogs.map((a) => `
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div>${escapeHtml(a.action)}: ${escapeHtml(JSON.stringify(a.details))}</div>
              <div class="timeline-time">${formatDateTime(a.createdAt)}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    // Drawer Score Adjust Buttons
    content.querySelectorAll(".adj-score-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const delta = parseInt(btn.dataset.delta);
        const res = await api.adjustScore(id, delta, "Admin manual override from Drawer");
        if (res.success) {
          showToast(`Score updated by ${delta > 0 ? "+" : ""}${delta} points`, "success");
          openCustomerDrawer(id); // reload drawer
          if (state.currentRoute === "waitlists") {
            const canvas = document.getElementById("page-canvas-root");
            renderWaitlistScreen(canvas);
          }
        } else {
          showToast(res.message || "Failed to adjust score", "error");
        }
      });
    });
  }

  function closeCustomerDrawer() {
    const drawer = document.getElementById("slide-over-drawer");
    const backdrop = document.getElementById("drawer-backdrop");
    if (drawer) drawer.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
  }

  // ========================================================
  // SCREEN 6: REFERRAL INTELLIGENCE & MANAGEMENT
  // ========================================================
  async function renderReferralsScreen(container) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);">Loading referral intelligence...</div>`;

    const res = await api.fetchReferrals();
    const referrals = res.referrals || [];

    const approvedCount = referrals.filter((r) => r.status === "APPROVED").length;
    const pendingCount = referrals.filter((r) => r.status === "PENDING").length;
    const rejectedCount = referrals.filter((r) => r.status === "REJECTED").length;

    container.innerHTML = `
      <div class="page-header-row">
        <div class="page-title-block">
          <h1>Referral Intelligence & Governance</h1>
          <p>Inspect peer-to-peer customer acquisition, viral conversion rates, and qualification status.</p>
        </div>
      </div>

      <!-- KPI Summary -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label-row">
            <span>TOTAL REFERRALS</span>
            ${icons.referrals}
          </div>
          <div class="metric-value-row">
            <span class="metric-main-value">${referrals.length}</span>
          </div>
          <div class="metric-footnote">Viral invitations initiated</div>
        </div>

        <div class="metric-card">
          <div class="metric-label-row">
            <span>APPROVED & CREDITED</span>
            ${icons.check}
          </div>
          <div class="metric-value-row">
            <span class="metric-main-value">${approvedCount}</span>
            <span class="metric-delta-tag positive">Credited</span>
          </div>
          <div class="metric-footnote">Passed risk checks</div>
        </div>

        <div class="metric-card">
          <div class="metric-label-row">
            <span>PENDING REVIEW</span>
            ${icons.shield}
          </div>
          <div class="metric-value-row">
            <span class="metric-main-value">${pendingCount}</span>
            <span class="metric-delta-tag neutral">In Review</span>
          </div>
          <div class="metric-footnote">Velocity / risk threshold</div>
        </div>
      </div>

      <!-- Referrals Table -->
      <div class="saas-card">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h3>Peer Referral Conversions</h3>
            <p>Full lifecycle ledger of referring and referred customers</p>
          </div>
        </div>
        <div class="data-table-container">
          <table class="saas-table">
            <thead>
              <tr>
                <th>Referrer (Advocate)</th>
                <th>Invited Customer</th>
                <th>Points</th>
                <th>Risk Score</th>
                <th>Status</th>
                <th>Date</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${referrals.length === 0 ? `
                <tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">No peer referrals recorded yet. Share your launch link!</td></tr>
              ` : referrals.map((r) => `
                <tr>
                  <td>
                    <div style="font-weight:600;color:var(--text-primary);">${escapeHtml(r.referrerName)}</div>
                    <div style="font-size:11px;color:var(--text-muted);">${escapeHtml(r.referrerEmail)}</div>
                  </td>
                  <td>
                    <div style="font-weight:600;color:var(--text-primary);">${escapeHtml(r.refereeName)}</div>
                    <div style="font-size:11px;color:var(--text-muted);">${escapeHtml(r.refereeEmail)}</div>
                  </td>
                  <td style="font-family:var(--font-mono);font-weight:600;color:var(--brand-primary);">+${r.scorePoints || 10}</td>
                  <td>
                    <span style="font-family:var(--font-mono);font-size:11.5px;">${r.riskScore || 0} / 100</span>
                  </td>
                  <td>
                    <span class="badge-pill ${r.status === "APPROVED" ? "status-active" : r.status === "PENDING" ? "status-pending" : "status-rejected"}">
                      ${escapeHtml(r.status)}
                    </span>
                  </td>
                  <td style="font-size:11.5px;color:var(--text-muted);">${formatDate(r.createdAt)}</td>
                  <td style="text-align:right;">
                    ${r.status === "PENDING" ? `
                      <button class="topbar-action-btn app-ref-btn" data-id="${r.id}" style="padding:2px 8px;font-size:11px;">Approve</button>
                      <button class="topbar-action-btn rej-ref-btn" data-id="${r.id}" style="padding:2px 8px;font-size:11px;color:var(--color-danger);">Reject</button>
                    ` : `
                      <span style="font-size:11px;color:var(--text-subtle);">Verified</span>
                    `}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Referral Actions
    container.querySelectorAll(".app-ref-btn").forEach((b) => {
      b.addEventListener("click", async () => {
        const res = await api.approveReferral(b.dataset.id);
        if (res.success) {
          showToast("Referral approved and points credited", "success");
          renderReferralsScreen(container);
        }
      });
    });

    container.querySelectorAll(".rej-ref-btn").forEach((b) => {
      b.addEventListener("click", async () => {
        const res = await api.rejectReferral(b.dataset.id, "Administrative rejection");
        if (res.success) {
          showToast("Referral rejected", "info");
          renderReferralsScreen(container);
        }
      });
    });
  }

  // ========================================================
  // SCREEN 7: REWARDS & COUPONS
  // ========================================================
  async function renderRewardsScreen(container) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);">Loading rewards & coupons...</div>`;

    const res = await api.fetchCoupons();
    const coupons = res.coupons || [];

    container.innerHTML = `
      <div class="page-header-row">
        <div class="page-title-block">
          <h1>Rewards & Incentive Milestone Engine</h1>
          <p>Configured milestone rewards, issued VIP tokens, and coupon redemption records.</p>
        </div>
      </div>

      <!-- Configured Reward Milestone Rules -->
      <div class="saas-card">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h3>Active Milestone Reward Rules</h3>
            <p>Automated threshold rules that trigger coupon passes upon qualification</p>
          </div>
        </div>
        <div class="data-table-container">
          <table class="saas-table">
            <thead>
              <tr>
                <th>Milestone Rule Name</th>
                <th>Trigger Criteria</th>
                <th>Reward Type</th>
                <th>Token Prefix</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight:600;color:var(--text-primary);">Position #1 VIP Purchase Pass</td>
                <td>Queue Standing reaches Rank #1</td>
                <td>Guaranteed VIP Allocation</td>
                <td><span style="font-family:var(--font-mono);">LOBBY-VIP-</span></td>
                <td><span class="badge-pill status-active">ACTIVE RULE</span></td>
              </tr>
              <tr>
                <td style="font-weight:600;color:var(--text-primary);">Top Advocate Priority Pass</td>
                <td>Member accumulates &ge; 3 verified referrals</td>
                <td>Early Access Coupon</td>
                <td><span style="font-family:var(--font-mono);">LOBBY-TIER3-</span></td>
                <td><span class="badge-pill status-active">ACTIVE RULE</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Issued Coupon Tokens -->
      <div class="saas-card">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h3>Issued Coupon & Access Tokens</h3>
            <p>Live inventory of generated vouchers distributed to qualified members</p>
          </div>
        </div>
        <div class="data-table-container">
          <table class="saas-table">
            <thead>
              <tr>
                <th>Token Voucher Code</th>
                <th>Recipient Member</th>
                <th>Recipient Email</th>
                <th>Status</th>
                <th>Issued At</th>
              </tr>
            </thead>
            <tbody>
              ${coupons.length === 0 ? `
                <tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted);">No reward coupons issued yet. Top members will unlock vouchers automatically!</td></tr>
              ` : coupons.map((c) => `
                <tr>
                  <td>
                    <span style="font-family:var(--font-mono);font-weight:700;color:var(--brand-primary);">${escapeHtml(c.code)}</span>
                  </td>
                  <td>${escapeHtml(c.memberName || "Customer")}</td>
                  <td style="font-family:var(--font-mono);">${escapeHtml(c.memberEmail || "—")}</td>
                  <td><span class="badge-pill status-active">${escapeHtml(c.status)}</span></td>
                  <td style="font-size:11.5px;color:var(--text-muted);">${formatDate(c.createdAt)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ========================================================
  // SCREEN 8: VIRTUAL WAITING ROOM (PUBLIC CUSTOMER PORTAL)
  // ========================================================
  async function renderWaitingRoomScreen(container) {
    const activeSlug = state.activeCampaignSlug || "iphone-16-pro";

    container.innerHTML = `
      <div class="page-header-row">
        <div class="page-title-block">
          <h1>Virtual Waiting Room</h1>
          <p>Customer-facing registration and live queue standing lookup portal.</p>
        </div>
        <div class="page-actions-group">
          <label style="font-size:12px;font-weight:500;color:var(--text-secondary);">Select Campaign:</label>
          <select class="filter-select" id="waiting-room-camp-selector">
            ${state.campaigns.map((c) => `
              <option value="${escapeHtml(c.slug)}" ${c.slug === activeSlug ? "selected" : ""}>${escapeHtml(c.title)}</option>
            `).join("")}
          </select>
        </div>
      </div>

      <!-- Waiting Room Interactive Card -->
      <div class="waiting-room-hero">
        <div class="waiting-room-header">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--brand-primary);">Intelligent Access Portal</div>
          <h2 style="font-size:22px;font-weight:700;color:var(--text-primary);margin-top:4px;" id="waiting-hero-title">Exclusive Launch Waiting Room</h2>
          <p style="font-size:13px;color:var(--text-secondary);max-width:480px;margin:6px auto 0;">
            Reserve your place in line. Share your unique referral link to advance your position and unlock early access passes.
          </p>
        </div>

        <div class="waiting-room-body" id="waiting-room-interactive-area">
          ${state.customerStanding ? renderStandingViewHtml(state.customerStanding) : renderRegistrationFormHtml()}
        </div>
      </div>
    `;

    // Event Bindings
    container.querySelector("#waiting-room-camp-selector")?.addEventListener("change", (e) => {
      state.activeCampaignSlug = e.target.value;
      state.customerStanding = null;
      renderWaitingRoomScreen(container);
    });

    bindWaitingRoomEvents(container);
  }

  function renderRegistrationFormHtml() {
    return `
      <!-- Registration Tabs: Join Waitlist vs Check Standing -->
      <div style="display:flex;border-bottom:1px solid var(--border-subtle);gap:16px;margin-bottom:16px;">
        <button id="switch-tab-join" style="padding:8px 0;background:none;border:none;border-bottom:2px solid var(--brand-primary);font-weight:600;font-size:13px;color:var(--brand-primary);cursor:pointer;">Join Waitlist</button>
        <button id="switch-tab-check" style="padding:8px 0;background:none;border:none;font-weight:500;font-size:13px;color:var(--text-muted);cursor:pointer;">Check Standing</button>
      </div>

      <!-- Join Form -->
      <form id="public-register-form" style="display:flex;flex-direction:column;gap:14px;">
        <div class="form-group">
          <label class="form-label" for="reg-name">Your Full Name</label>
          <input type="text" id="reg-name" class="form-input" placeholder="e.g. Jordan Lee" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-email">Work or Personal Email</label>
          <input type="email" id="reg-email" class="form-input" placeholder="name@company.com" required />
          <div class="form-hint">Confirmation pass & queue token will be dispatched here.</div>
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-ref-code">Referral Invitation Code (Optional)</label>
          <input type="text" id="reg-ref-code" class="form-input" placeholder="Enter code to grant friend +10 pts" />
        </div>
        <button type="submit" class="topbar-action-btn btn-primary-action" style="height:38px;justify-content:center;margin-top:6px;">
          <span>Claim Queue Position</span>
          &rarr;
        </button>
      </form>

      <!-- Check Standing Form (Hidden by default) -->
      <form id="public-check-form" style="display:none;flex-direction:column;gap:14px;">
        <div class="form-group">
          <label class="form-label" for="check-email">Lookup by Email</label>
          <input type="email" id="check-email" class="form-input" placeholder="Enter registered email address..." required />
        </div>
        <button type="submit" class="topbar-action-btn btn-primary-action" style="height:38px;justify-content:center;">
          <span>Lookup Standing</span>
        </button>
      </form>
    `;
  }

  function renderStandingViewHtml(standing) {
    const position = standing.position || standing.rank || 1;
    const score = standing.score || 0;
    const refCount = standing.referralCount || 0;
    const refLink = standing.referralLink || `${window.location.origin}/#/waiting-room?ref=${standing.referralCode}`;

    return `
      <div style="text-align:center;">
        <div class="waiting-room-rank-box">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.05em;">Your Queue Standing</div>
          <div class="waiting-room-rank-num">#${position}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">
            Priority Score: <strong>${score} points</strong> &bull; <strong>${refCount} friends</strong> referred
          </div>
        </div>
      </div>

      <!-- Shareable Referral Link -->
      <div class="form-group" style="margin-top:12px;">
        <label class="form-label">Your Priority Referral Link</label>
        <div class="share-link-box">
          <input type="text" class="share-link-input" id="share-link-input" value="${escapeHtml(refLink)}" readonly />
          <button class="share-link-copy-btn" id="share-link-btn">Copy Link</button>
        </div>
        <div class="form-hint">Each friend who registers with your link earns you <strong>+10 points</strong> and bumps you forward in the queue.</div>
      </div>

      <!-- Milestone Progress Bar -->
      <div style="background:var(--bg-surface-subtle);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:14px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:6px;">
          <span>VIP Coupon Unlock Milestone</span>
          <span>${refCount} / 3 Referrals</span>
        </div>
        <div style="height:6px;background:var(--border-subtle);border-radius:3px;overflow:hidden;">
          <div style="width:${Math.min(100, (refCount / 3) * 100)}%;height:100%;background:var(--brand-primary);transition:width 0.3s ease;"></div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:6px;">
          ${refCount >= 3 ? "Milestone Unlocked! VIP pass generated." : `Invite ${3 - refCount} more friends to unlock guaranteed early access.`}
        </div>
      </div>

      <div style="display:flex;justify-content:center;gap:12px;margin-top:8px;">
        <button class="topbar-action-btn" id="check-another-btn">Lookup Another Email</button>
      </div>
    `;
  }

  function bindWaitingRoomEvents(container) {
    const joinTab = container.querySelector("#switch-tab-join");
    const checkTab = container.querySelector("#switch-tab-check");
    const regForm = container.querySelector("#public-register-form");
    const checkForm = container.querySelector("#public-check-form");

    joinTab?.addEventListener("click", () => {
      joinTab.style.borderBottom = "2px solid var(--brand-primary)";
      joinTab.style.color = "var(--brand-primary)";
      joinTab.style.fontWeight = "600";
      checkTab.style.borderBottom = "none";
      checkTab.style.color = "var(--text-muted)";
      checkTab.style.fontWeight = "500";
      if (regForm) regForm.style.display = "flex";
      if (checkForm) checkForm.style.display = "none";
    });

    checkTab?.addEventListener("click", () => {
      checkTab.style.borderBottom = "2px solid var(--brand-primary)";
      checkTab.style.color = "var(--brand-primary)";
      checkTab.style.fontWeight = "600";
      joinTab.style.borderBottom = "none";
      joinTab.style.color = "var(--text-muted)";
      joinTab.style.fontWeight = "500";
      if (checkForm) checkForm.style.display = "flex";
      if (regForm) regForm.style.display = "none";
    });

    regForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = container.querySelector("#reg-name")?.value.trim();
      const email = container.querySelector("#reg-email")?.value.trim();
      const referralCode = container.querySelector("#reg-ref-code")?.value.trim();

      const res = await api.registerPublic(state.activeCampaignSlug, { name, email, referralCode });
      if (res.success || res.position) {
        showToast("Successfully joined the queue!", "success");
        state.customerStanding = res.member || {
          position: res.position,
          score: (res.member && res.member.score) || 0,
          referralCount: 0,
          referralLink: res.referralLink,
          referralCode: (res.member && res.member.referralCode) || "",
        };
        renderWaitingRoomScreen(container);
      } else {
        showToast(res.message || "Registration failed", "error");
      }
    });

    checkForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = container.querySelector("#check-email")?.value.trim();
      const res = await api.lookupStanding(state.activeCampaignSlug, email);
      if (res.success && res.member) {
        state.customerStanding = res.member;
        showToast("Standing located!", "success");
        renderWaitingRoomScreen(container);
      } else {
        showToast(res.message || "No registration found for this email", "error");
      }
    });

    container.querySelector("#share-link-btn")?.addEventListener("click", () => {
      const input = container.querySelector("#share-link-input");
      if (input) copyToClipboard(input.value, "Referral link copied!");
    });

    container.querySelector("#check-another-btn")?.addEventListener("click", () => {
      state.customerStanding = null;
      renderWaitingRoomScreen(container);
    });
  }

  // ========================================================
  // SCREEN 9: FRAUD & RISK MANAGEMENT
  // ========================================================
  async function renderFraudScreen(container) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);">Scanning risk telemetry...</div>`;

    const res = await api.fetchFraudData();
    const signals = res.signals || [];
    const flagged = res.flaggedMembers || [];

    container.innerHTML = `
      <div class="page-header-row">
        <div class="page-title-block">
          <h1>Fraud Guard & Risk Investigation</h1>
          <p>Multi-signal automated risk detection: disposable emails, IP velocity, and self-referrals.</p>
        </div>
      </div>

      <!-- Risk Metrics Grid -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label-row">
            <span>TOTAL RISK SIGNALS</span>
            ${icons.shield}
          </div>
          <div class="metric-value-row">
            <span class="metric-main-value">${signals.length}</span>
            <span class="metric-delta-tag ${signals.length > 0 ? "neutral" : "positive"}">Monitored</span>
          </div>
          <div class="metric-footnote">Automated anomaly alerts</div>
        </div>

        <div class="metric-card">
          <div class="metric-label-row">
            <span>FLAGGED CUSTOMERS</span>
            ${icons.team}
          </div>
          <div class="metric-value-row">
            <span class="metric-main-value">${flagged.length}</span>
            <span class="metric-delta-tag ${flagged.length > 0 ? "neutral" : "positive"}">Quarantined</span>
          </div>
          <div class="metric-footnote">Subject to manual review</div>
        </div>

        <div class="metric-card">
          <div class="metric-label-row">
            <span>ENFORCEMENT MODE</span>
            ${icons.check}
          </div>
          <div class="metric-value-row">
            <span class="metric-main-value">Active</span>
            <span class="metric-delta-tag positive">Strict</span>
          </div>
          <div class="metric-footnote">Disposables rejected on signup</div>
        </div>
      </div>

      <!-- Flagged Customers Table -->
      <div class="saas-card">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h3>Flagged Registrations & Suspicious Activity</h3>
            <p>Customers pending administrative qualification or score recalculation</p>
          </div>
        </div>
        <div class="data-table-container">
          <table class="saas-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Email Address</th>
                <th>Priority Score</th>
                <th>Queue Rank</th>
                <th>Risk State</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${flagged.length === 0 ? `
                <tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">No flagged accounts. All active registrations meet verification criteria.</td></tr>
              ` : flagged.map((m) => `
                <tr>
                  <td style="font-weight:600;color:var(--text-primary);">${escapeHtml(m.name)}</td>
                  <td style="font-family:var(--font-mono);">${escapeHtml(m.email)}</td>
                  <td style="font-family:var(--font-mono);">${m.score} pts</td>
                  <td style="font-family:var(--font-mono);">#${m.rank}</td>
                  <td><span class="badge-pill status-rejected">${escapeHtml(m.fraudStatus)}</span></td>
                  <td>
                    <button class="topbar-action-btn clear-fraud-btn" data-id="${m.id}" style="padding:2px 8px;font-size:11px;">Clear Flag</button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.querySelectorAll(".clear-fraud-btn").forEach((b) => {
      b.addEventListener("click", async () => {
        const res = await api.updateMemberStatus(b.dataset.id, "ACTIVE", "CLEAN", "Manually cleared by administrator");
        if (res.success) {
          showToast("Member cleared and restored to clean status", "success");
          renderFraudScreen(container);
        }
      });
    });
  }

  // ========================================================
  // SCREEN 10: ANALYTICS
  // ========================================================
  async function renderAnalyticsScreen(container) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);">Aggregating platform analytics...</div>`;

    const statsRes = await api.fetchStats();
    const stats = statsRes || {};
    const totalCustomers = stats.totalCustomers || 0;
    const totalReferrals = stats.totalReferrals || 0;

    container.innerHTML = `
      <div class="page-header-row">
        <div class="page-title-block">
          <h1>Analytics & Cohort Insights</h1>
          <p>Comprehensive performance trends, viral coefficient, and queue movement velocity.</p>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label-row">
            <span>ACQUISITION CONVERSION</span>
            ${icons.analytics}
          </div>
          <div class="metric-value-row">
            <span class="metric-main-value">${totalCustomers > 0 ? ((totalReferrals / totalCustomers) * 100).toFixed(1) : 0}%</span>
          </div>
          <div class="metric-footnote">Referral-to-registration conversion</div>
        </div>

        <div class="metric-card">
          <div class="metric-label-row">
            <span>VIRAL COEFFICIENT (K-FACTOR)</span>
            ${icons.referrals}
          </div>
          <div class="metric-value-row">
            <span class="metric-main-value">${totalCustomers > 0 ? (totalReferrals / totalCustomers).toFixed(2) : "0.00"}</span>
          </div>
          <div class="metric-footnote">Organic invites per registrant</div>
        </div>

        <div class="metric-card">
          <div class="metric-label-row">
            <span>QUEUE RECOMPUTE LATENCY</span>
            ${icons.check}
          </div>
          <div class="metric-value-row">
            <span class="metric-main-value">&lt; 2ms</span>
          </div>
          <div class="metric-footnote">Deterministic in-memory ranking</div>
        </div>
      </div>

      <div class="saas-card">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h3>Queue Depth & Positioning Distribution</h3>
            <p>Customer volume organized by ranking deciles</p>
          </div>
        </div>
        <div class="card-body-padded">
          <div style="display:flex;align-items:flex-end;gap:12px;height:160px;padding-top:20px;border-bottom:1px solid var(--border-subtle);">
            <div style="flex:1;height:85%;background:var(--brand-primary);border-radius:var(--radius-xs) var(--radius-xs) 0 0;" title="Top 10%"></div>
            <div style="flex:1;height:65%;background:var(--brand-primary);opacity:0.85;border-radius:var(--radius-xs) var(--radius-xs) 0 0;" title="10-25%"></div>
            <div style="flex:1;height:45%;background:var(--brand-primary);opacity:0.7;border-radius:var(--radius-xs) var(--radius-xs) 0 0;" title="25-50%"></div>
            <div style="flex:1;height:30%;background:var(--brand-primary);opacity:0.5;border-radius:var(--radius-xs) var(--radius-xs) 0 0;" title="50-75%"></div>
            <div style="flex:1;height:15%;background:var(--brand-primary);opacity:0.3;border-radius:var(--radius-xs) var(--radius-xs) 0 0;" title="Bottom 25%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:8px;">
            <span>Top Tier (#1 - #10)</span>
            <span>Priority (#11 - #50)</span>
            <span>Mid Queue (#51 - #200)</span>
            <span>Standard Queue</span>
            <span>Recent Inbound</span>
          </div>
        </div>
      </div>
    `;
  }

  // ========================================================
  // SCREEN 11: TEAM & ACCESS CONTROL
  // ========================================================
  function renderTeamScreen(container) {
    container.innerHTML = `
      <div class="page-header-row">
        <div class="page-title-block">
          <h1>Team & Permission Governance</h1>
          <p>Manage administrative roles, workspace access, and API credentials.</p>
        </div>
      </div>

      <div class="saas-card">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h3>Workspace Team Members</h3>
            <p>Users authorized to manage campaigns and review fraud queues</p>
          </div>
        </div>
        <div class="data-table-container">
          <table class="saas-table">
            <thead>
              <tr>
                <th>User Profile</th>
                <th>Email Address</th>
                <th>Role</th>
                <th>Status</th>
                <th>Access Level</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight:600;color:var(--text-primary);">Platform Administrator</td>
                <td style="font-family:var(--font-mono);">admin@lobby.io</td>
                <td><span class="badge-pill status-active">ORG_ADMIN</span></td>
                <td><span class="badge-pill status-active">ACTIVE</span></td>
                <td>Full System Read / Write</td>
              </tr>
              <tr>
                <td style="font-weight:600;color:var(--text-primary);">Launch Operations Lead</td>
                <td style="font-family:var(--font-mono);">ops@acme.com</td>
                <td><span class="badge-pill status-clean">OPERATOR</span></td>
                <td><span class="badge-pill status-active">ACTIVE</span></td>
                <td>Campaign & Queue Management</td>
              </tr>
              <tr>
                <td style="font-weight:600;color:var(--text-primary);">Trust & Safety Auditor</td>
                <td style="font-family:var(--font-mono);">compliance@acme.com</td>
                <td><span class="badge-pill status-clean">AUDITOR</span></td>
                <td><span class="badge-pill status-active">ACTIVE</span></td>
                <td>Fraud Review & Export</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ========================================================
  // SCREEN 12: SETTINGS
  // ========================================================
  function renderSettingsScreen(container) {
    container.innerHTML = `
      <div class="page-header-row">
        <div class="page-title-block">
          <h1>Workspace Settings</h1>
          <p>Global defaults, secret keys, and webhook notification settings.</p>
        </div>
      </div>

      <div class="saas-card">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h3>Administrative API Security Key</h3>
            <p>Used to authenticate programmatic SDK and webhook operations</p>
          </div>
        </div>
        <div class="card-body-padded">
          <div class="form-group">
            <label class="form-label">Master Admin Key</label>
            <div class="share-link-box">
              <input type="text" class="share-link-input" value="${escapeHtml(state.adminToken)}" readonly />
              <button class="share-link-copy-btn" id="copy-admin-key-btn">Copy Key</button>
            </div>
            <div class="form-hint">Do not expose in client-side production repositories.</div>
          </div>
        </div>
      </div>

      <div class="saas-card">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h3>Organization Profile</h3>
            <p>Tenant organization details</p>
          </div>
        </div>
        <div class="card-body-padded">
          <div class="info-key-val-grid">
            <div class="info-label">Organization Name:</div>
            <div class="info-value">Lobby Launch Systems (Acme Corp)</div>
            <div class="info-label">Organization Slug:</div>
            <div class="info-value" style="font-family:var(--font-mono);">lobby</div>
            <div class="info-label">Environment:</div>
            <div class="info-value"><span class="badge-pill status-active">PRODUCTION</span></div>
          </div>
        </div>
      </div>
    `;

    container.querySelector("#copy-admin-key-btn")?.addEventListener("click", () => {
      copyToClipboard(state.adminToken, "Admin API key copied to clipboard!");
    });
  }

  // ========================================================
  // MULTI-STEP CAMPAIGN CREATION MODAL (7 STEPS)
  // ========================================================
  function openCampaignWizardModal() {
    const overlay = document.getElementById("modal-overlay");
    const container = document.getElementById("modal-container");
    if (!overlay || !container) return;

    let step = 1;
    const formData = {
      title: "",
      slug: "",
      description: "",
      maxCapacity: 10000,
      referralWeight: 10,
      signupBonus: 0,
      status: "ACTIVE",
    };

    function renderStep() {
      container.innerHTML = `
        <div class="modal-header">
          <div>
            <h3>Create Product Launch Campaign</h3>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Step ${step} of 7 &bull; ${getStepName(step)}</div>
          </div>
          <button class="drawer-close-btn" id="modal-close-btn">&times;</button>
        </div>

        <div class="modal-body">
          ${getStepContentHtml(step, formData)}
        </div>

        <div class="modal-footer">
          ${step > 1 ? `<button class="topbar-action-btn" id="wiz-prev-btn">&larr; Back</button>` : ""}
          ${step < 7 ? `
            <button class="topbar-action-btn btn-primary-action" id="wiz-next-btn">Next Step &rarr;</button>
          ` : `
            <button class="topbar-action-btn btn-primary-action" id="wiz-submit-btn">Publish Campaign</button>
          `}
        </div>
      `;

      container.querySelector("#modal-close-btn")?.addEventListener("click", () => {
        overlay.classList.remove("open");
      });

      container.querySelector("#wiz-prev-btn")?.addEventListener("click", () => {
        if (step > 1) {
          saveStepValues(step, formData, container);
          step--;
          renderStep();
        }
      });

      container.querySelector("#wiz-next-btn")?.addEventListener("click", () => {
        saveStepValues(step, formData, container);
        if (step === 1 && !formData.title.trim()) {
          showToast("Campaign title is required", "error");
          return;
        }
        step++;
        renderStep();
      });

      container.querySelector("#wiz-submit-btn")?.addEventListener("click", async () => {
        const payload = {
          title: formData.title,
          slug: formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: formData.description,
          maxCapacity: formData.maxCapacity,
          status: formData.status,
          scoringConfig: {
            referralWeight: formData.referralWeight,
            signupBonus: formData.signupBonus,
          },
        };

        const res = await api.createCampaign(payload);
        if (res.success) {
          showToast("Campaign created successfully!", "success");
          overlay.classList.remove("open");
          navigateTo("campaigns");
        } else {
          showToast(res.message || "Failed to create campaign", "error");
        }
      });
    }

    renderStep();
    overlay.classList.add("open");
  }

  function getStepName(s) {
    const names = [
      "Basic Information",
      "Campaign Configuration",
      "Registration Settings",
      "Referral Configuration",
      "Queue & Ranking Rules",
      "Rewards & Incentives",
      "Review & Publish",
    ];
    return names[s - 1] || "Step";
  }

  function getStepContentHtml(s, data) {
    switch (s) {
      case 1:
        return `
          <div class="form-group">
            <label class="form-label">Campaign Title *</label>
            <input type="text" id="wiz-title" class="form-input" placeholder="e.g. NextGen Hardware Launch" value="${escapeHtml(data.title)}" />
          </div>
          <div class="form-group">
            <label class="form-label">Slug Identifier (URL)</label>
            <input type="text" id="wiz-slug" class="form-input" placeholder="e.g. nextgen-hardware" value="${escapeHtml(data.slug)}" />
          </div>
          <div class="form-group">
            <label class="form-label">Public Description</label>
            <textarea id="wiz-desc" class="form-input" rows="3" placeholder="Brief summary of the launch...">${escapeHtml(data.description)}</textarea>
          </div>
        `;
      case 2:
        return `
          <div class="form-group">
            <label class="form-label">Maximum Queue Capacity</label>
            <input type="number" id="wiz-capacity" class="form-input" value="${data.maxCapacity}" />
            <div class="form-hint">Maximum number of accepted registrants before queue lock.</div>
          </div>
          <div class="form-group">
            <label class="form-label">Initial Status</label>
            <select id="wiz-status" class="form-select">
              <option value="ACTIVE" selected>ACTIVE (Accepting signups)</option>
              <option value="DRAFT">DRAFT (Hidden)</option>
            </select>
          </div>
        `;
      case 3:
        return `
          <div class="form-group">
            <label class="form-label">Allowed Email Domains</label>
            <input type="text" class="form-input" placeholder="Leave empty for public access (all domains)" disabled />
            <div class="form-hint">Disposable email domains will be automatically filtered by Fraud Guard.</div>
          </div>
        `;
      case 4:
        return `
          <div class="form-group">
            <label class="form-label">Points per Verified Referral</label>
            <input type="number" id="wiz-ref-weight" class="form-input" value="${data.referralWeight}" />
            <div class="form-hint">Default is +10 points per invited friend who registers.</div>
          </div>
          <div class="form-group">
            <label class="form-label">Signup Bonus Points</label>
            <input type="number" id="wiz-bonus" class="form-input" value="${data.signupBonus}" />
          </div>
        `;
      case 5:
        return `
          <div style="background:var(--bg-surface-subtle);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:14px;">
            <div style="font-weight:600;margin-bottom:6px;">Deterministic Ranking Algorithm</div>
            <p style="font-size:12px;color:var(--text-secondary);">
              Rankings are calculated deterministically: Members are sorted by <strong>Priority Score DESC</strong>. Ties are resolved strictly by <strong>Registration Timestamp ASC</strong> (First to achieve score wins tie).
            </p>
          </div>
        `;
      case 6:
        return `
          <div class="form-group">
            <label class="form-label">VIP Purchase Pass Milestone</label>
            <p style="font-size:12px;color:var(--text-secondary);">Auto-issues coupon when user qualifies at Rank #1 or reaches 3 referrals.</p>
          </div>
        `;
      case 7:
        return `
          <div class="info-key-val-grid">
            <div class="info-label">Title:</div>
            <div class="info-value"><strong>${escapeHtml(data.title)}</strong></div>
            <div class="info-label">Slug:</div>
            <div class="info-value" style="font-family:var(--font-mono);">${escapeHtml(data.slug || "Auto-generated")}</div>
            <div class="info-label">Capacity:</div>
            <div class="info-value">${data.maxCapacity.toLocaleString()}</div>
            <div class="info-label">Points / Ref:</div>
            <div class="info-value">+${data.referralWeight} pts</div>
          </div>
        `;
      default:
        return "";
    }
  }

  function saveStepValues(s, data, container) {
    if (s === 1) {
      data.title = container.querySelector("#wiz-title")?.value || "";
      data.slug = container.querySelector("#wiz-slug")?.value || "";
      data.description = container.querySelector("#wiz-desc")?.value || "";
    } else if (s === 2) {
      data.maxCapacity = parseInt(container.querySelector("#wiz-capacity")?.value) || 10000;
      data.status = container.querySelector("#wiz-status")?.value || "ACTIVE";
    } else if (s === 4) {
      data.referralWeight = parseInt(container.querySelector("#wiz-ref-weight")?.value) || 10;
      data.signupBonus = parseInt(container.querySelector("#wiz-bonus")?.value) || 0;
    }
  }

  // --- Real-time Socket.io Integration ---
  function initSocketEvents() {
    if (typeof io !== "undefined") {
      try {
        const socket = io();
        socket.on("connect", () => {
          console.log("[Lobby Broadcaster] Connected to server socket.");
        });

        socket.on("waitlistUpdated", (data) => {
          showToast(`Waitlist updated: ${data.name || "Customer"} entered the queue`, "info");
          if (state.currentRoute === "waitlists" || state.currentRoute === "overview") {
            renderCurrentView();
          }
        });
      } catch (e) {
        console.warn("[Lobby] Socket setup omitted:", e);
      }
    }
  }

  // --- Global Event Attachments ---
  function initEventListeners() {
    // Sidebar Navigation Buttons
    document.querySelectorAll(".nav-item-btn[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        navigateTo(btn.dataset.nav);
      });
    });

    // Sidebar Toggle
    document.getElementById("sidebar-toggle-btn")?.addEventListener("click", () => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      document.getElementById("app-sidebar")?.classList.toggle("collapsed", state.sidebarCollapsed);
      document.getElementById("app-main-layout")?.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
    });

    // Topbar New Campaign Action
    document.getElementById("header-create-campaign-btn")?.addEventListener("click", openCampaignWizardModal);

    // Global Search Focus
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = document.getElementById("global-search-input");
        if (input) {
          input.focus();
          input.select();
        }
      }
    });

    // Global Search Input
    document.getElementById("global-search-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const q = e.target.value.trim();
        if (q) {
          state.waitlistPage = 1;
          navigateTo("waitlists");
        }
      }
    });

    // Drawer Backdrop & Close Button
    document.getElementById("drawer-backdrop")?.addEventListener("click", closeCustomerDrawer);
    document.getElementById("drawer-close-btn")?.addEventListener("click", closeCustomerDrawer);

    // Workspace Switcher
    document.getElementById("workspace-switcher-btn")?.addEventListener("click", () => {
      showToast("Workspace: Acme Corp (Production) - Multi-tenant isolation active", "info");
    });

    // User Profile
    document.getElementById("user-profile-btn")?.addEventListener("click", () => {
      navigateTo("team");
    });

    // Hash Change
    window.addEventListener("hashchange", () => {
      const hash = window.location.hash.replace("#/", "");
      const parts = hash.split("/");
      const route = parts[0] || "overview";
      const param = parts[1] || null;
      if (route !== state.currentRoute || param !== state.selectedCampaignId) {
        state.currentRoute = route;
        state.selectedCampaignId = param;
        renderCurrentView();
      }
    });
  }

  // --- Initial Bootstrap ---
  async function init() {
    initEventListeners();
    initSocketEvents();

    // Check initial hash route
    const hash = window.location.hash.replace("#/", "");
    if (hash) {
      const parts = hash.split("/");
      state.currentRoute = parts[0] || "overview";
      state.selectedCampaignId = parts[1] || null;
    }

    await renderCurrentView();
  }

  // Run on DOM Ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
