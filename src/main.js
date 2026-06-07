const { invoke } = window.__TAURI__.core;
const { getCurrentWindow } = window.__TAURI__.window;
const { getVersion } = window.__TAURI__.app;

// ==========================================================================
// 1. STATE & CONFIGURATION
// ==========================================================================
let currentLang = localStorage.getItem("appLang") || "en";
let blacklist = JSON.parse(localStorage.getItem("winget_blacklist")) || [];
let appStats = JSON.parse(localStorage.getItem("winget_stats")) || {
  firstRunDate: Date.now(),
  runs: 0,
  scans: 0,
  totalUpdates: 0,
  appUpdateCounts: {},
};
let appToIgnore = null;
let isMaximized = false;
let isThemeToggling = false;
let newUpdateUrl = null;
let sortAsc = true;
let toastTimeout;
const defaultAccent = "#4f46e5";
const savedAccent = localStorage.getItem("winget_accent") || defaultAccent;
const isReduceMotion = localStorage.getItem("winget_reduceMotion") === "true";

// ==========================================================================
// 2. DOM ELEMENTS
// ==========================================================================
// Core UI
const scanBtn = document.getElementById("scanBtn");
const updateSelectedBtn = document.getElementById("updateSelectedBtn");
const loadingBarContainer = document.getElementById("loadingBarContainer");
const toast = document.getElementById("toast");

// Table & Search
const tableContainer = document.getElementById("tableContainer");
const tableBody = document.getElementById("tableBody");
const nameHeader = document.getElementById("nameHeader");
const selectAllCheckbox = document.getElementById("selectAll");
const searchInput = document.getElementById("searchInput");
const searchWrapper = document.getElementById("searchWrapper");

// Console
const outputElement = document.getElementById("output");
const consoleContainer = document.getElementById("consoleContainer");
const macClose = document.getElementById("macClose");
const macMin = document.getElementById("macMin");
const macMax = document.getElementById("macMax");
const consoleSpacer = document.createElement("div");
consoleSpacer.className = "console-spacer";
consoleContainer.parentNode.insertBefore(consoleSpacer, consoleContainer);

// Settings
const openSettingsBtn = document.getElementById("openSettingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const settingsOverlay = document.getElementById("settingsOverlay");
const langSelect = document.getElementById("langSelect");
const autoAcceptCheckbox = document.getElementById("autoAccept");
const startupCheckCheckbox = document.getElementById("startupCheck");
const reduceMotionCheck = document.getElementById("reduceMotionCheck");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const accentColorPicker = document.getElementById("accentColorPicker");
const resetAccentBtn = document.getElementById("resetAccentBtn");
const checkUpdateBtn = document.getElementById("checkUpdateBtn");
const appUpdateStatus = document.getElementById("appUpdateStatus");
const includeUnknownCheckbox = document.getElementById(
  "includeUnknownCheckbox",
);
const includePinnedCheckbox = document.getElementById("includePinnedCheckbox");

// Dashboard & Tabs
const openDashboardBtn = document.getElementById("openDashboardBtn");
const closeDashboardBtn = document.getElementById("closeDashboardBtn");
const dashboardOverlay = document.getElementById("dashboardOverlay");
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

// Context Menu & Blacklist
const contextMenu = document.getElementById("contextMenu");
const addToBlacklistBtn = document.getElementById("addToBlacklistBtn");
const blacklistBody = document.getElementById("blacklistBody");

// ==========================================================================
// 3. UI & STATE MANAGEMENT
// ==========================================================================
function showToast(message) {
  toast.innerHTML = `✅ ${message}`;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function autoScrollOutput() {
  requestAnimationFrame(() => {
    outputElement.scrollTop = outputElement.scrollHeight;
  });
}

function updateOutput(stateKey, appendText = "") {
  const dict = translations[currentLang] || translations["en"];
  outputElement.setAttribute("data-state", stateKey);
  outputElement.textContent = dict[stateKey] + appendText;
  autoScrollOutput();
}

function applyLanguage(lang) {
  const dict = translations[lang] || translations["en"];

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (dict[key]) el.setAttribute("title", dict[key]);
  });

  const currentState = outputElement.getAttribute("data-state");
  if (currentState && dict[currentState]) {
    outputElement.textContent = dict[currentState];
  }

  const updateState = appUpdateStatus.getAttribute("data-state");
  if (updateState && dict[updateState]) {
    appUpdateStatus.textContent = dict[updateState];
  }
}

function toggleUpdateBtnState() {
  const checkedCount = document.querySelectorAll(".app-check:checked").length;
  updateSelectedBtn.disabled = checkedCount === 0;

  const dict = translations[currentLang] || translations["en"];
  let btnText = dict["updateSelectedBtn"] || "Update {count} selected";

  if (checkedCount > 0) {
    updateSelectedBtn.textContent = btnText.replace("{count}", checkedCount);
  } else {
    updateSelectedBtn.textContent = btnText
      .replace("{count}", "")
      .replace(/\(\s*\)/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}

function updateSelectAllState() {
  const visibleRows = Array.from(tableBody.querySelectorAll("tr")).filter(
    (r) => r.style.display !== "none",
  );
  const checkedVisible = visibleRows.filter(
    (r) => r.querySelector(".app-check").checked,
  );

  if (visibleRows.length === 0) {
    selectAllCheckbox.checked = false;
  } else {
    selectAllCheckbox.checked = visibleRows.length === checkedVisible.length;
  }
}

function saveStats() {
  localStorage.setItem("winget_stats", JSON.stringify(appStats));
}

function renderStats() {
  const daysActive = Math.floor(
    (Date.now() - appStats.firstRunDate) / (1000 * 60 * 60 * 24),
  );
  const uniqueApps = Object.keys(appStats.appUpdateCounts).length;

  let mostUpdatedApp = "-";
  let maxUpdates = 0;
  for (const [appName, count] of Object.entries(appStats.appUpdateCounts)) {
    if (count > maxUpdates) {
      maxUpdates = count;
      mostUpdatedApp = appName;
    }
  }

  document.getElementById("statTotalUpdates").textContent =
    appStats.totalUpdates;
  document.getElementById("statUniqueApps").textContent = uniqueApps;
  document.getElementById("statDays").textContent = daysActive;
  document.getElementById("statScans").textContent = appStats.scans;
  document.getElementById("statRuns").textContent = appStats.runs;

  const mostUpdatedEl = document.getElementById("statMostUpdated");
  mostUpdatedEl.textContent = maxUpdates > 0 ? mostUpdatedApp : "-";
  if (mostUpdatedApp.length > 12) {
    mostUpdatedEl.style.fontSize = "16px";
    mostUpdatedEl.style.marginTop = "10px";
    mostUpdatedEl.style.marginBottom = "8px";
  } else {
    mostUpdatedEl.style.fontSize = "26px";
    mostUpdatedEl.style.marginTop = "0";
    mostUpdatedEl.style.marginBottom = "4px";
  }
}

function saveBlacklist() {
  localStorage.setItem("winget_blacklist", JSON.stringify(blacklist));
}

function renderBlacklist() {
  if (!blacklistBody) return;
  blacklist = JSON.parse(localStorage.getItem("winget_blacklist")) || [];
  blacklistBody.innerHTML = "";

  if (blacklist.length === 0) {
    blacklistBody.innerHTML = `<tr><td style="text-align: center; color: var(--text-muted); padding: 20px;" colspan="2">List is empty</td></tr>`;
    return;
  }

  blacklist.forEach((appName) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 10px;" title="${appName}">
          ${appName}
      </td>
      <td class="action-col" style="width: 40px; text-align: center;">
          <button class="action-btn remove" title="Remove from blacklist">✕</button>
      </td>
    `;

    tr.querySelector("button").addEventListener("click", () => {
      blacklist = blacklist.filter((name) => name !== appName);
      saveBlacklist();
      renderBlacklist();
    });

    blacklistBody.appendChild(tr);
  });
}

function updatePinIcon(cell, id, isPinned) {
  const existing = cell.querySelector(".pin-icon-container");
  if (isPinned) {
    if (!existing) {
      const span = document.createElement("span");
      span.className = "pin-icon-container";
      span.title = "App is pinned";
      span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>`;
      cell.appendChild(span);
    }
  } else {
    if (existing) existing.remove();
  }
}

// ==========================================================================
// 4. CORE BUSINESS LOGIC
// ==========================================================================
async function checkAppUpdates(silent = false) {
  if (!silent) {
    appUpdateStatus.setAttribute("data-state", "checking");
    appUpdateStatus.textContent = (
      translations[currentLang] || translations["en"]
    ).checking;
    checkUpdateBtn.disabled = true;
  }

  try {
    const response = await fetch(
      "https://api.github.com/repos/enviGit/winget-portable/releases/latest",
    );
    if (response.status === 403)
      throw new Error("API rate limit exceeded. Try again later.");
    if (!response.ok)
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`,
      );

    const data = await response.json();
    const currentVersion = await getVersion();
    const tagVersion = data.tag_name ? data.tag_name.replace("v", "") : "";

    if (data.tag_name && isNewerVersion(tagVersion, currentVersion)) {
      newUpdateUrl = data.html_url;
      appUpdateStatus.setAttribute("data-state", "updateAvailable");
      appUpdateStatus.textContent = (
        translations[currentLang] || translations["en"]
      ).updateAvailable;

      checkUpdateBtn.setAttribute("data-i18n", "downloadUpdate");
      checkUpdateBtn.textContent = (
        translations[currentLang] || translations["en"]
      ).downloadUpdate;
      checkUpdateBtn.style.backgroundColor = "var(--accent-color)";
      checkUpdateBtn.onclick = async () => {
        await invoke("open_link", { url: newUpdateUrl });
      };
    } else if (!silent) {
      appUpdateStatus.setAttribute("data-state", "upToDate");
      appUpdateStatus.textContent = (
        translations[currentLang] || translations["en"]
      ).upToDate;
    }
  } catch (err) {
    console.error("Update error details:", err);
    if (!silent) {
      appUpdateStatus.setAttribute("data-state", "error");
      appUpdateStatus.textContent = (
        translations[currentLang] || translations["en"]
      ).error;
    }
  } finally {
    if (!silent) checkUpdateBtn.disabled = false;
  }
}

async function getPinnedIds() {
  try {
    const response = await invoke("get_pins");
    return response
      .split("\n")
      .filter(
        (line) =>
          line.includes(".") &&
          !line.includes("---") &&
          !line.startsWith("Name"),
      )
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        return parts.find((part) => part.includes(".") && part.length > 3);
      })
      .filter((id) => id !== undefined);
  } catch (e) {
    console.error("Failed to get pins:", e);
    return [];
  }
}

scanBtn.addEventListener("click", async () => {
  scanBtn.disabled = true;
  updateSelectedBtn.disabled = true;
  updateSelectedBtn.classList.add("hidden");
  updateOutput("scanning");
  appStats.scans += 1;
  saveStats();
  tableContainer.classList.add("hidden");
  tableBody.innerHTML = "";
  selectAllCheckbox.checked = true;
  loadingBarContainer.classList.remove("hidden");

  try {
    const pinnedIds = await getPinnedIds();
    const response = await invoke("scan_updates", {
      includeUnknown: includeUnknownCheckbox?.checked || false,
      includePinned: includePinnedCheckbox?.checked || false,
    });

    const apps = parseWingetOutput(response);
    const visibleApps = apps.filter((app) => !blacklist.includes(app.name));

    if (visibleApps.length === 0) {
      updateOutput("noUpdates");
      updateSelectedBtn.classList.add("hidden");
    } else {
      visibleApps.forEach((app, index) => {
        const isPinned = pinnedIds.includes(app.id);
        const row = renderRow(app, index, isPinned);

        row.querySelector(".ignore-btn").addEventListener("click", (e) => {
          e.stopPropagation();
          appToIgnore = {
            name: app.name,
            row: row,
            id: app.id,
            isPinned: isPinned,
          };
          const rect = e.target.getBoundingClientRect();
          contextMenu.style.top = `${rect.bottom + 5}px`;
          contextMenu.style.left = `${rect.left - 130}px`;
          contextMenu.classList.remove("hidden");
        });
        tableBody.appendChild(row);
      });

      tableContainer.classList.remove("hidden");
      updateSelectedBtn.classList.remove("hidden");
      searchWrapper.classList.remove("hidden");
      updateOutput("ready");
      toggleUpdateBtnState();
    }
  } catch (error) {
    updateOutput("error", error);
  } finally {
    loadingBarContainer.classList.add("hidden");
    scanBtn.disabled = false;
    toggleUpdateBtnState();
  }
});

updateSelectedBtn.addEventListener("click", async () => {
  const selectedBoxes = document.querySelectorAll(".app-check:checked");
  if (selectedBoxes.length === 0) return;

  updateSelectedBtn.disabled = true;
  scanBtn.disabled = true;
  const isAutoAccept = autoAcceptCheckbox.checked;
  const isUnknownChecked = includeUnknownCheckbox?.checked || false;
  const isPinnedChecked = includePinnedCheckbox?.checked || false;
  const pinnedIds = await getPinnedIds();
  const dict = translations[currentLang] || translations["en"];

  outputElement.setAttribute("data-state", "updating");
  outputElement.textContent = dict.updating + "\n";
  loadingBarContainer.classList.remove("hidden");
  autoScrollOutput();

  for (let i = 0; i < selectedBoxes.length; i++) {
    const box = selectedBoxes[i];
    const appId = box.value;
    const appRow = box.closest("tr");
    const appName = appRow.cells[1].textContent.trim();
    const isPinned = pinnedIds.includes(appId);

    outputElement.textContent += `\n[${i + 1}/${selectedBoxes.length}] ${dict.updateProgress}: ${appName}... `;
    autoScrollOutput();
    await delay(50);

    try {
      const response = await invoke("update_app", {
        id: appId,
        autoAccept: isAutoAccept,
        includeUnknown: isUnknownChecked,
        includePinned: isPinnedChecked,
        uninstallPrevious: !isPinned,
      });
      const cleanResponse = cleanWingetOutput(response.text);
      const lowerResp = cleanResponse.toLowerCase();
      const isTextError =
        lowerResp.includes("failed") ||
        lowerResp.includes("error") ||
        lowerResp.includes("no applicable upgrade found");

      if (!response.success || isTextError) {
        outputElement.textContent += `\n${dict.error} ${cleanResponse}\n`;
      } else {
        outputElement.textContent += `${dict.done}\n${cleanResponse}\n`;
        appStats.totalUpdates += 1;
        if (!appStats.appUpdateCounts[appName])
          appStats.appUpdateCounts[appName] = 0;
        appStats.appUpdateCounts[appName] += 1;
        saveStats();
      }
    } catch (error) {
      outputElement.textContent += `\n${dict.error} ${error}\n`;
    }
    autoScrollOutput();
    await delay(50);
  }

  outputElement.textContent += `\n${dict.finished}`;
  autoScrollOutput();
  await delay(2000);

  loadingBarContainer.classList.add("hidden");
  updateSelectedBtn.disabled = false;
  scanBtn.disabled = false;
});

async function renderPinned() {
  const pinnedBody = document.getElementById("pinnedBody");
  pinnedBody.innerHTML = "<tr><td colspan='2'>Loading...</td></tr>";

  try {
    const response = await invoke("get_pins");
    const lines = response.split("\n");
    pinnedBody.innerHTML = "";

    let isTable = false;
    lines.forEach((line) => {
      if (line.match(/^[-—]{3,}/)) {
        isTable = true;
        return;
      }
      if (!isTable || line.trim() === "" || line.startsWith("Name")) return;

      const parts = line.trim().split(/\s+/);
      const id = parts.find((p) => p.includes("."));

      if (id) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${id}</td><td class="action-col"><button class="action-btn remove-pin">✕</button></td>`;

        tr.querySelector(".remove-pin").addEventListener("click", async () => {
          await invoke("unpin_app", { id: id });
          renderPinned();
        });
        pinnedBody.appendChild(tr);
      }
    });

    if (pinnedBody.innerHTML === "") {
      pinnedBody.innerHTML = "<tr><td colspan='2'>No pinned apps</td></tr>";
    }
  } catch (e) {
    pinnedBody.innerHTML = "<tr><td colspan='2'>Error</td></tr>";
  }
}

// ==========================================================================
// 5. EVENT LISTENERS
// ==========================================================================
// Search & Sort
searchInput.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  const rows = tableBody.querySelectorAll("tr");
  rows.forEach((row) => {
    const name = row.cells[1].textContent.toLowerCase();
    row.style.display = name.includes(term) ? "" : "none";
  });
  updateSelectAllState();
});

nameHeader.addEventListener("click", () => {
  const rows = Array.from(tableBody.querySelectorAll("tr"));
  sortAsc = !sortAsc;
  const sortIcon = nameHeader.querySelector(".sort-icon");
  sortIcon.textContent = sortAsc ? "▲" : "▼";

  rows.sort((a, b) => {
    const nameA = a.cells[1].textContent.toLowerCase();
    const nameB = b.cells[1].textContent.toLowerCase();
    if (nameA < nameB) return sortAsc ? -1 : 1;
    if (nameA > nameB) return sortAsc ? 1 : -1;
    return 0;
  });
  rows.forEach((row) => tableBody.appendChild(row));
});

// Table checkboxes
tableBody.addEventListener("change", (e) => {
  if (e.target.classList.contains("app-check")) {
    const allBoxes = document.querySelectorAll(".app-check").length;
    const checkedBoxes = document.querySelectorAll(".app-check:checked").length;
    selectAllCheckbox.checked = allBoxes === checkedBoxes;
    toggleUpdateBtnState();
  }
});

selectAllCheckbox.addEventListener("change", (e) => {
  const visibleRows = Array.from(tableBody.querySelectorAll("tr")).filter(
    (r) => r.style.display !== "none",
  );
  visibleRows.forEach((row) => {
    const box = row.querySelector(".app-check");
    if (box) box.checked = e.target.checked;
  });
  toggleUpdateBtnState();
});

// Settings & Config Toggles
langSelect.addEventListener("change", (e) => {
  currentLang = e.target.value;
  localStorage.setItem("appLang", currentLang);
  applyLanguage(currentLang);
  toggleUpdateBtnState();
});

autoAcceptCheckbox.addEventListener("change", (e) => {
  localStorage.setItem("autoAccept", e.target.checked);
});

startupCheckCheckbox.addEventListener("change", (e) => {
  localStorage.setItem("startupCheck", e.target.checked);
});

if (includeUnknownCheckbox) {
  includeUnknownCheckbox.addEventListener("change", (e) => {
    localStorage.setItem("winget_includeUnknown", e.target.checked);
  });
}

if (includePinnedCheckbox) {
  includePinnedCheckbox.addEventListener("change", (e) => {
    localStorage.setItem("winget_includePinned", e.target.checked);
  });
}

if (reduceMotionCheck) {
  reduceMotionCheck.addEventListener("change", (e) => {
    const reduced = e.target.checked;
    localStorage.setItem("winget_reduceMotion", reduced);
    if (reduced) {
      document.body.classList.add("reduce-motion");
    } else {
      document.body.classList.remove("reduce-motion");
    }
  });
}

if (accentColorPicker) {
  accentColorPicker.addEventListener("input", (e) => {
    const color = e.target.value;
    document.documentElement.style.setProperty("--accent-color", color);
    localStorage.setItem("winget_accent", color);
  });
}

if (resetAccentBtn) {
  resetAccentBtn.addEventListener("click", () => {
    document.documentElement.style.setProperty("--accent-color", defaultAccent);
    localStorage.setItem("winget_accent", defaultAccent);
    accentColorPicker.value = defaultAccent;
  });
}

themeToggleBtn.addEventListener("click", () => {
  if (isThemeToggling) return;
  isThemeToggling = true;
  themeToggleBtn.disabled = true;

  const htmlEl = document.documentElement;
  let currentTheme = htmlEl.getAttribute("data-theme");

  if (currentTheme === "system") {
    const isSystemDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    currentTheme = isSystemDark ? "dark" : "light";
  }

  if (currentTheme === "light") {
    htmlEl.setAttribute("data-theme", "dark");
    getCurrentWindow().setTheme("dark");
  } else {
    htmlEl.setAttribute("data-theme", "light");
    getCurrentWindow().setTheme("light");
  }

  setTimeout(() => {
    isThemeToggling = false;
    themeToggleBtn.disabled = false;
  }, 450);
});

checkUpdateBtn.addEventListener("click", () => {
  if (!newUpdateUrl) checkAppUpdates(false);
});

// Modal Toggles
openSettingsBtn.addEventListener("click", () =>
  settingsOverlay.classList.remove("hidden"),
);
closeSettingsBtn.addEventListener("click", () =>
  settingsOverlay.classList.add("hidden"),
);
settingsOverlay.addEventListener("click", (e) => {
  if (e.target === settingsOverlay) settingsOverlay.classList.add("hidden");
});

if (openDashboardBtn) {
  openDashboardBtn.addEventListener("click", () => {
    renderStats();
    renderBlacklist();
    dashboardOverlay.classList.remove("hidden");
  });
}

if (closeDashboardBtn) {
  closeDashboardBtn.addEventListener("click", () => {
    dashboardOverlay.classList.add("hidden");
  });
}

if (dashboardOverlay) {
  dashboardOverlay.addEventListener("click", (e) => {
    if (e.target === dashboardOverlay) dashboardOverlay.classList.add("hidden");
  });
}

// Tabs
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    const targetId = btn.getAttribute("data-target");
    document.getElementById(targetId).classList.add("active");
  });
});

document
  .querySelector('[data-target="tab-pinned"]')
  .addEventListener("click", renderPinned);

// Context Menu Logic
if (toggleKeepPreviousBtn) {
  toggleKeepPreviousBtn.addEventListener("click", async () => {
    if (appToIgnore) {
      if (appToIgnore.isPinned) {
        await invoke("unpin_app", { id: appToIgnore.id });
      } else {
        await invoke("pin_app", { id: appToIgnore.id });
      }
      contextMenu.classList.add("hidden");
      scanBtn.click();
    }
  });
}

if (addToBlacklistBtn) {
  addToBlacklistBtn.addEventListener("click", () => {
    if (appToIgnore && !blacklist.includes(appToIgnore.name)) {
      const rowToRemove = appToIgnore.row;
      const nameToRemove = appToIgnore.name;

      blacklist.push(nameToRemove);
      saveBlacklist();
      showToast(`${nameToRemove} added to ignored apps.`);

      rowToRemove.style.transition = "opacity 0.3s ease";
      rowToRemove.style.opacity = "0";

      setTimeout(() => {
        rowToRemove.remove();
        const remainingRows = document.querySelectorAll("#tableBody tr").length;
        if (remainingRows === 0) {
          tableContainer.classList.add("hidden");
          searchWrapper.classList.add("hidden");
          updateSelectedBtn.classList.add("hidden");
          updateOutput("noUpdates");
        } else {
          updateSelectAllState();
          toggleUpdateBtnState();
        }
      }, 300);
    }
    contextMenu.classList.add("hidden");
    appToIgnore = null;
  });
}

document.addEventListener("click", (e) => {
  if (contextMenu && !contextMenu.classList.contains("hidden")) {
    if (
      !e.target.closest(".context-menu") &&
      !e.target.closest(".ignore-btn")
    ) {
      contextMenu.classList.add("hidden");
      appToIgnore = null;
    }
  }
});

// Console Controls
macClose.addEventListener("click", () => {
  outputElement.textContent = "";
  updateOutput("ready", "\n>_ Terminal cleared.");
});

macMin.addEventListener("click", () => {
  consoleContainer.classList.remove("maximized");
  consoleContainer.classList.toggle("minimized");
  if (consoleContainer.classList.contains("minimized")) {
    autoScrollOutput();
    setTimeout(autoScrollOutput, 450);
  }
});

macMax.addEventListener("click", () => {
  if (!isMaximized) {
    const rect = consoleContainer.getBoundingClientRect();
    consoleSpacer.style.height = `${rect.height}px`;
    consoleSpacer.classList.add("active");
    consoleContainer.style.transition = "none";
    consoleContainer.style.position = "fixed";
    consoleContainer.style.top = `${rect.top}px`;
    consoleContainer.style.left = `${rect.left}px`;
    consoleContainer.style.width = `${rect.width}px`;
    consoleContainer.style.height = `${rect.height}px`;
    consoleContainer.style.zIndex = "2000";

    void consoleContainer.offsetWidth;

    consoleContainer.style.transition =
      "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    consoleContainer.style.top = "0";
    consoleContainer.style.left = "0";
    consoleContainer.style.width = "100vw";
    consoleContainer.style.height = "100vh";
    consoleContainer.style.borderRadius = "0";
    isMaximized = true;
  } else {
    const rect = consoleSpacer.getBoundingClientRect();
    consoleContainer.style.top = `${rect.top}px`;
    consoleContainer.style.left = `${rect.left}px`;
    consoleContainer.style.width = `${rect.width}px`;
    consoleContainer.style.height = `${rect.height}px`;
    consoleContainer.style.borderRadius = "8px";

    setTimeout(() => {
      if (!isMaximized) {
        consoleContainer.style.transition = "";
        consoleContainer.style.position = "";
        consoleContainer.style.top = "";
        consoleContainer.style.left = "";
        consoleContainer.style.width = "";
        consoleContainer.style.height = "";
        consoleContainer.style.zIndex = "";
        consoleContainer.style.borderRadius = "";
        consoleSpacer.classList.remove("active");
        autoScrollOutput();
      }
    }, 400);
    isMaximized = false;
  }
  window.dispatchEvent(new Event("resize"));
});

// Ripple Effect
document.addEventListener("mousedown", (e) => {
  const btn = e.target.closest("button:not(:disabled)");
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement("span");
  ripple.classList.add("ripple");
  ripple.style.left = `${e.clientX - rect.left}px`;
  ripple.style.top = `${e.clientY - rect.top}px`;
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});

// ==========================================================================
// 6. INITIALIZATION
// ==========================================================================
// Check system language
const sysLang = navigator.language.slice(0, 2);
if (!localStorage.getItem("appLang") && translations[sysLang]) {
  currentLang = sysLang;
}

// Apply saved settings
langSelect.value = currentLang;
applyLanguage(currentLang);
autoAcceptCheckbox.checked = localStorage.getItem("autoAccept") !== "false";
startupCheckCheckbox.checked = localStorage.getItem("startupCheck") !== "false";

if (includeUnknownCheckbox) {
  includeUnknownCheckbox.checked =
    localStorage.getItem("winget_includeUnknown") !== "false";
}
if (includePinnedCheckbox) {
  includePinnedCheckbox.checked =
    localStorage.getItem("winget_includePinned") === "true";
}

document.documentElement.style.setProperty("--accent-color", savedAccent);
if (accentColorPicker) accentColorPicker.value = savedAccent;

// Apply reduce motion
if (isReduceMotion) {
  document.body.classList.add("reduce-motion");
  if (reduceMotionCheck) reduceMotionCheck.checked = true;
}

// App startup events
appStats.runs += 1;
saveStats();
if (startupCheckCheckbox.checked) checkAppUpdates(true);
