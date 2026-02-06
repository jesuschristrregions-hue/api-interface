const elements = {
  username: document.getElementById("username"),
  apikey: document.getElementById("apikey"),
  command: document.getElementById("command"),

  extra: document.getElementById("extra"),
  extraField: document.getElementById("extra-field"),
  extraLabel: document.getElementById("extra-label"),
  fetchData: document.getElementById("fetch-data"),
  clearData: document.getElementById("clear-data"),
  status: document.getElementById("status"),
  dataPreview: document.getElementById("data-preview"),
  recordCount: document.getElementById("record-count"),
  lastUpdated: document.getElementById("last-updated"),
  importFile: document.getElementById("import-file"),
  exportData: document.getElementById("export-data"),

  jsonSection: document.getElementById("json-section"),
  tableSection: document.getElementById("table-section"),
  toggleView: document.getElementById("toggle-view"),
  toggleDetails: document.getElementById("toggle-details"),
  exportCsv: document.getElementById("export-csv"),
  tableContainer: document.getElementById("table-container"),
  tableRecordCount: document.getElementById("table-record-count"),
  tableLastUpdated: document.getElementById("table-last-updated"),
};

const commandConfig = {
  profile: null,
  full: null,
  stories: null,
  domain: null,
  account_info: null,
  following: {
    paramName: "limit",
    label: "Limit (optional)",
    placeholder: "e.g. 100 or full",
  },
  comments: {
    paramName: "video_url",
    label: "Video URL",
    placeholder: "Enter full video URL",
  },
};

const DIRECT_API_BASE = "https://api.omar-thing.site/";
const PROXY_PATH = "/api-proxy";
const LIFETIME_COMMANDS = new Set(["stories", "domain", "following", "comments", "account_info"]);


function escapeHtml(text) {
  if (typeof text !== "string") {
    return text;
  }
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function sanitizeUrl(url) {
  if (typeof url !== "string" || !url.trim()) {
    return "";
  }
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch (error) {
    return "";
  }
  return "";
}


function countryCodeToEmoji(code) {
  if (!code || typeof code !== "string" || code.length !== 2) {
    return "";
  }
  const upper = code.toUpperCase();
  const codePoints = [];
  for (let i = 0; i < 2; i++) {
    const cp = upper.charCodeAt(i);


    codePoints.push(127397 + cp);
  }
  return String.fromCodePoint(...codePoints);
}


function formatNumber(val) {
  const num = Number(val);
  return Number.isNaN(num) ? String(val) : num.toLocaleString();
}


function formatTimestamp(ts) {
  const num = Number(ts);
  if (!num || Number.isNaN(num)) {
    return '';
  }

  let date;
  if (String(num).length <= 10) {
    date = new Date(num * 1000);
  } else {
    date = new Date(num);
  }
  return date.toLocaleString();
}

const monospaceKeys = new Set([
  'aweme_count',
  'commerce_user_level',
  'enterprise_verify_reason',
  'sec_uid',
  'uid',
  'secret'
]);


function renderTable(followings) {
  let html = "";
  followings.forEach((user) => {

    const avatar = sanitizeUrl(user.avatar_thumb || user.avatar_larger || "");

    const userName = user.username || user.uid || "";
    const nickName = user.nickname || userName;

    const signature = user.signature || "";

    const truncated = signature;

    const region = user.region || "";
    const flag = countryCodeToEmoji(region);
    const regionHtml = region
      ? `<span class="region">${flag ? flag + " " : ""}${escapeHtml(region)}</span>`
      : "";

    const followerCount = formatNumber(user.follower_count ?? "");
    const followingCount = formatNumber(user.following_count ?? "");
    const favoritesCount = formatNumber(user.total_favorited ?? "");
    const editedTime = user.unique_id_modify_time ? formatTimestamp(user.unique_id_modify_time) : "";
    const isPrivate = user.is_private ? true : false;
    const profileLink = sanitizeUrl(user.profile_deep_link || "");

    let detailsLines = "";
    Object.entries(user).forEach(([key, value]) => {

      if (key === 'avatar_thumb' || key === 'avatar_larger' || key === 'profile_deep_link') {
        return;
      }
      let display = value;
      if (display === null || display === undefined) {
        display = "";
      }

      if (typeof display === 'object') {
        try {
          display = JSON.stringify(display);
        } catch (e) {
          display = String(display);
        }
      }

      const valueHtml = monospaceKeys.has(key)
        ? `<code>${escapeHtml(String(display))}</code>`
        : escapeHtml(String(display));
      detailsLines += `<p><strong>${escapeHtml(key)}:</strong> ${valueHtml}</p>`;
    });

    html += `<details class="follower-item">
      <summary>
        <img src="${avatar}" alt="${escapeHtml(nickName)}" class="avatar" />
        <div class="summary-content">
          <div class="summary-top">
            <span class="nickname">${escapeHtml(nickName)}</span>
            ${isPrivate ? `<span class="private-tag">PRIVATE</span>` : ''}
          </div>
          <div class="summary-second">
            <a href="${escapeHtml(profileLink || "#")}" class="username-link" target="_blank" rel="noopener">@${escapeHtml(userName)}</a>
            ${regionHtml}
          </div>
          <div class="summary-stats">
            <div class="stat">
              <span class="stat-label">Followers</span>
              <span class="stat-value">${followerCount}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Following</span>
              <span class="stat-value">${followingCount}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Favorites</span>
              <span class="stat-value">${favoritesCount}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Username edited</span>
              <span class="stat-value">${escapeHtml(editedTime)}</span>
            </div>
          </div>
          <div class="summary-bio">${escapeHtml(truncated)}</div>
        </div>
      </summary>
      <div class="details">
        ${detailsLines}
      </div>
    </details>`;
  });
  elements.tableContainer.innerHTML = `<div class="follower-list">${html}</div>`;
}


function showTableView() {
  const followings = state.data && state.data.followings;
  if (!followings || !followings.length) {
    setStatus("No following data to display. Try fetching the following list first.", "error");
    return;
  }
  renderTable(followings);
  elements.tableRecordCount.textContent = `Records: ${followings.length}`;
  elements.tableLastUpdated.textContent = state.updatedAt
    ? `Last updated: ${new Date(state.updatedAt).toLocaleString()}`
    : "";

  elements.jsonSection.style.display = "none";
  elements.tableSection.style.display = "block";

  if (elements.toggleView) {
    elements.toggleView.textContent = "Back to JSON View";
  }
  if (elements.toggleDetails) {
    elements.toggleDetails.style.display = "inline-block";
    elements.toggleDetails.textContent = detailsExpanded ? "Collapse All" : "Expand All";
  }
}


function showJsonView() {
  elements.tableSection.style.display = "none";
  elements.jsonSection.style.display = "block";

  if (elements.toggleView) {
    elements.toggleView.textContent = "Show Following List";
  }
  if (elements.toggleDetails) {
    elements.toggleDetails.style.display = "none";
  }
}


function exportCSV() {
  const followings = state.data && state.data.followings;
  if (!followings || !followings.length) {
    setStatus("No following data to export.", "error");
    return;
  }
  const header = [
    "username",
    "nickname",
    "follower_count",
    "following_count",
    "total_likes",
    "region",
    "verified",
    "signature",
    "avatar_thumb",
    "profile_link",
  ];
  const rows = followings.map((u) => [
    u.username || u.uid || "",
    u.nickname || "",
    u.follower_count ?? "",
    u.following_count ?? "",
    u.total_favorited ?? "",
    u.region || "",
    u.verified ? "Yes" : "No",
    (u.signature || "").replace(/\n/g, " "),
    u.avatar_thumb || u.avatar_larger || "",
    u.profile_deep_link || "",
  ]);
  const csvLines = [];

  csvLines.push(header.map((h) => `"${h}"`).join(","));
  rows.forEach((row) => {
    const line = row
      .map((val) => {
        const v = val != null ? String(val) : "";

        const escaped = v.replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(",");
    csvLines.push(line);
  });
  const csvContent = csvLines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `followings-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  setStatus("CSV export ready.", "success");
}


function toggleDetails() {
  const items = elements.tableContainer.querySelectorAll('.follower-item');
  if (!items.length) {
    return;
  }
  if (!detailsExpanded) {
    items.forEach((d) => {
      d.setAttribute('open', '');
    });
    detailsExpanded = true;
    elements.toggleDetails.textContent = 'Collapse All';
  } else {
    items.forEach((d) => {
      d.removeAttribute('open');
    });
    detailsExpanded = false;
    elements.toggleDetails.textContent = 'Expand All';
  }
}


function toggleView() {
  const jsonVisible = elements.jsonSection.style.display !== 'none';
  if (jsonVisible) {
    showTableView();
  } else {
    showJsonView();
  }
}

const state = { data: null, updatedAt: null };

let detailsExpanded = false;

function setStatus(message, tone = "") {
  elements.status.textContent = message;
  elements.status.dataset.tone = tone;
}

function updatePreview() {
  if (!state.data) {
    elements.dataPreview.textContent = "";
    elements.recordCount.textContent = "No data loaded.";
    elements.lastUpdated.textContent = "";
    elements.exportData.disabled = true;
    return;
  }
  const pretty = JSON.stringify(state.data, null, 2);
  elements.dataPreview.textContent = pretty;
  const recordCount = Array.isArray(state.data)
    ? state.data.length
    : Object.keys(state.data || {}).length;
  elements.recordCount.textContent = `Records: ${recordCount}`;
  elements.lastUpdated.textContent = state.updatedAt
    ? `Last updated: ${new Date(state.updatedAt).toLocaleString()}`
    : "";
  elements.exportData.disabled = false;
}

function getCookie(name) {
  const v = `; ${document.cookie}`;
  const parts = v.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop().split(";").shift());
  }
  return null;
}

function setCookie(name, value, days = 365) {
  const date = new Date(Date.now() + days * 86400000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/; Secure; SameSite=Strict`;
}

function getApiBaseUrl() {
  if (window.location.protocol === "file:") {
    return DIRECT_API_BASE;
  }
  return new URL(PROXY_PATH, window.location.origin).toString();
}

function getApiErrorMessage(status, payload, rawText, cmd) {
  const parts = [];
  if (payload && typeof payload === "object") {
    if (payload.error) {
      parts.push(String(payload.error));
    } else if (payload.message) {
      parts.push(String(payload.message));
    }
    if (payload.note) {
      parts.push(String(payload.note));
    }
  }

  let message = parts.join(" - ").trim();
  if (!message && rawText && rawText.trim()) {
    message = rawText.trim().slice(0, 220);
  }
  if (!message) {
    message = `Request failed with status ${status}`;
  }

  if (status === 403 && LIFETIME_COMMANDS.has(cmd) && !/lifetime/i.test(message)) {
    message += " This endpoint may require a lifetime API key.";
  }
  if (status === 429) {
    message += " Rate limit hit. Wait and retry.";
  }
  return message;
}

function getNetworkHint() {
  if (window.location.protocol === "file:") {
    return "Direct file mode can be blocked by CORS for non-profile commands. Run with `wrangler dev` and use that URL.";
  }
  return "Network or CORS issue. If this is a local dev host, run through `wrangler dev` so `/api-proxy` can relay requests.";
}

async function fetchData() {
  const username = elements.username.value.trim();
  const apikey = elements.apikey.value.trim();
  const cmd = elements.command.value.trim();

  if (!username && cmd !== "comments") {
    setStatus("Please enter a username first.", "error");
    return;
  }
  if (!apikey) {
    setStatus("Please provide your API key.", "error");
    return;
  }
  if (!cmd) {
    setStatus("Please select a command.", "error");
    return;
  }

  setCookie("omar_key", apikey);

  const config = commandConfig[cmd] || null;
  const extraVal = elements.extra.value.trim();
  if (cmd === "comments" && !extraVal) {
    setStatus("Please provide a Video URL for comments.", "error");
    return;
  }

  const requestUrl = new URL(getApiBaseUrl());
  requestUrl.searchParams.set("key", apikey);
  if (cmd !== "profile") {
    requestUrl.searchParams.set("type", cmd);
  }
  if (username) {
    requestUrl.searchParams.set("username", username);
  }
  if (config && extraVal) {
    requestUrl.searchParams.set(config.paramName, extraVal);
  }

  setStatus("Fetching data…");
  elements.fetchData.disabled = true;
  try {
    const response = await fetch(requestUrl.toString(), { cache: "no-store" });
    const rawText = await response.text();
    let data = null;
    if (rawText && rawText.trim()) {
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response from API (status ${response.status}).`);
      }
    }

    if (!response.ok) {
      throw new Error(getApiErrorMessage(response.status, data, rawText, cmd));
    }
    if (data && typeof data === "object" && data.error) {
      throw new Error(getApiErrorMessage(response.status, data, rawText, cmd));
    }
    if (!data || typeof data !== "object") {
      throw new Error("API returned an empty response.");
    }

    state.data = data;
    state.updatedAt = new Date().toISOString();
    updatePreview();

    if (state.data && Array.isArray(state.data.followings) && state.data.followings.length) {
      elements.toggleView.style.display = "inline-block";

      elements.toggleView.textContent = 'Show Following List';

      elements.toggleDetails.style.display = 'none';
    } else {
      elements.toggleView.style.display = 'none';
      elements.toggleDetails.style.display = 'none';
    }
    detailsExpanded = false;
    setStatus("Data fetched successfully.", "success");
  } catch (error) {
    const message = error && error.message ? error.message : getNetworkHint();
    if (/failed to fetch/i.test(message) || /networkerror/i.test(message)) {
      setStatus(`Fetch failed: ${getNetworkHint()}`, "error");
      return;
    }
    setStatus(`Fetch failed: ${message}`, "error");
  } finally {
    elements.fetchData.disabled = false;
  }
}

function clearData() {
  state.data = null;
  state.updatedAt = null;
  detailsExpanded = false;
  updatePreview();

  elements.tableSection.style.display = "none";
  elements.jsonSection.style.display = "block";
  elements.toggleView.style.display = "none";
  elements.toggleDetails.style.display = "none";
  setStatus("Data cleared.", "success");
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  event.target.value = "";
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      state.data = parsed;
      state.updatedAt = new Date().toISOString();
      updatePreview();

      if (state.data && Array.isArray(state.data.followings) && state.data.followings.length) {
        elements.toggleView.style.display = "inline-block";
        elements.toggleView.textContent = 'Show Following List';
        elements.toggleDetails.style.display = 'none';
      } else {
        elements.toggleView.style.display = "none";
        elements.toggleDetails.style.display = 'none';
      }

      elements.tableSection.style.display = "none";
      elements.jsonSection.style.display = "block";

      detailsExpanded = false;
      setStatus("Import complete.", "success");
    } catch (error) {
      setStatus("Import failed. Please upload valid JSON.", "error");
    }
  };
  reader.readAsText(file);
}

function handleExport() {
  if (!state.data) {
    setStatus("No data to export.", "error");
    return;
  }
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `omar-api-data-export.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  setStatus("Export ready.", "success");
}

function init() {
  const savedKey = getCookie("omar_key");
  if (savedKey) {
    elements.apikey.value = savedKey;
  }
  elements.fetchData.addEventListener("click", fetchData);
  elements.clearData.addEventListener("click", clearData);
  elements.importFile.addEventListener("change", handleImport);
  elements.exportData.addEventListener("click", handleExport);

  function updateExtraField() {
    const cmd = elements.command.value;
    const cfg = commandConfig[cmd] || null;
    if (!cfg) {

      elements.extraField.style.display = "none";
      elements.extra.value = "";
    } else {

      elements.extraField.style.display = "grid";
      elements.extraLabel.textContent = cfg.label;
      elements.extra.placeholder = cfg.placeholder;
    }
  }
  elements.command.addEventListener("change", updateExtraField);

  updateExtraField();
  setStatus("Ready. Fetch data or import a saved JSON file.");

  elements.exportCsv.addEventListener("click", exportCSV);
  elements.toggleView.addEventListener("click", toggleView);
  elements.toggleDetails.addEventListener("click", toggleDetails);
}

init();
