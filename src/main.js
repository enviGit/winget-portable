const { invoke } = window.__TAURI__.core;
const { getCurrentWindow } = window.__TAURI__.window;
const { getVersion } = window.__TAURI__.app;

const scanBtn = document.getElementById("scanBtn");
const updateSelectedBtn = document.getElementById("updateSelectedBtn");
const searchInput = document.getElementById("searchInput");
const searchWrapper = document.getElementById("searchWrapper");
const nameHeader = document.getElementById("nameHeader");
const loadingBarContainer = document.getElementById("loadingBarContainer");
const autoAcceptCheckbox = document.getElementById("autoAccept");
const startupCheckCheckbox = document.getElementById("startupCheck");
const outputElement = document.getElementById("output");
const consoleContainer = document.getElementById("consoleContainer");
const macClose = document.getElementById("macClose");
const macMin = document.getElementById("macMin");
const macMax = document.getElementById("macMax");
const langSelect = document.getElementById("langSelect");
const tableContainer = document.getElementById("tableContainer");
const tableBody = document.getElementById("tableBody");
const selectAllCheckbox = document.getElementById("selectAll");
const openSettingsBtn = document.getElementById("openSettingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const settingsOverlay = document.getElementById("settingsOverlay");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const checkUpdateBtn = document.getElementById("checkUpdateBtn");
const appUpdateStatus = document.getElementById("appUpdateStatus");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let currentLang = localStorage.getItem("appLang") || "en";
autoAcceptCheckbox.checked = localStorage.getItem("autoAccept") !== "false";
startupCheckCheckbox.checked = localStorage.getItem("startupCheck") !== "false";

const openBlacklistBtn = document.getElementById("openBlacklistBtn");
const closeBlacklistBtn = document.getElementById("closeBlacklistBtn");
const blacklistOverlay = document.getElementById("blacklistOverlay");
const blacklistBody = document.getElementById("blacklistBody");
const contextMenu = document.getElementById("contextMenu");
const addToBlacklistBtn = document.getElementById("addToBlacklistBtn");
const toast = document.getElementById("toast");
let appToIgnore = null;
let blacklist = JSON.parse(localStorage.getItem("winget_blacklist")) || [];
const openStatsBtn = document.getElementById("openStatsBtn");
const closeStatsBtn = document.getElementById("closeStatsBtn");
const statsOverlay = document.getElementById("statsOverlay");

let appStats = JSON.parse(localStorage.getItem("winget_stats")) || {
  firstRunDate: Date.now(),
  runs: 0,
  scans: 0,
  totalUpdates: 0,
  appUpdateCounts: {},
};

function saveStats() {
  localStorage.setItem("winget_stats", JSON.stringify(appStats));
}
appStats.runs += 1;
saveStats();

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

if (openStatsBtn) {
  openStatsBtn.addEventListener("click", () => {
    renderStats();
    statsOverlay.classList.remove("hidden");
  });
}
if (closeStatsBtn) {
  closeStatsBtn.addEventListener("click", () => {
    statsOverlay.classList.add("hidden");
  });
}
if (statsOverlay) {
  statsOverlay.addEventListener("click", (e) => {
    if (e.target === statsOverlay) statsOverlay.classList.add("hidden");
  });
}

function saveBlacklist() {
  localStorage.setItem("winget_blacklist", JSON.stringify(blacklist));
}

let toastTimeout;
function showToast(message) {
  toast.innerHTML = `✅ ${message}`;
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

const sysLang = navigator.language.slice(0, 2);
if (!localStorage.getItem("appLang") && translations[sysLang]) {
  currentLang = sysLang;
}

langSelect.value = currentLang;
applyLanguage(currentLang);

langSelect.addEventListener("change", (e) => {
  currentLang = e.target.value;
  localStorage.setItem("appLang", currentLang);
  applyLanguage(currentLang);
});

autoAcceptCheckbox.addEventListener("change", (e) => {
  localStorage.setItem("autoAccept", e.target.checked);
});

startupCheckCheckbox.addEventListener("change", (e) => {
  localStorage.setItem("startupCheck", e.target.checked);
});

function autoScrollOutput() {
  requestAnimationFrame(() => {
    outputElement.scrollTop = outputElement.scrollHeight;
  });
}

function applyLanguage(lang) {
  const dict = translations[lang] || translations["en"];
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      el.textContent = dict[key];
    }
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

function updateOutput(stateKey, appendText = "") {
  const dict = translations[currentLang] || translations["en"];
  outputElement.setAttribute("data-state", stateKey);
  outputElement.textContent = dict[stateKey] + appendText;
  autoScrollOutput();
}

function cleanWingetOutput(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/.*[▒█].*\n?/g, "")
    .replace(/^[ \t]*[-/\\|][ \t]*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

openSettingsBtn.addEventListener("click", () => {
  settingsOverlay.classList.remove("hidden");
});

closeSettingsBtn.addEventListener("click", () => {
  settingsOverlay.classList.add("hidden");
});

settingsOverlay.addEventListener("click", (e) => {
  if (e.target === settingsOverlay) {
    settingsOverlay.classList.add("hidden");
  }
});

let isThemeToggling = false;
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

let newUpdateUrl = null;

function isNewerVersion(remote, local) {
  const v1 = remote.split(".").map(Number);
  const v2 = local.split(".").map(Number);

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;

    if (num1 > num2) return true;
    if (num1 < num2) return false;
  }

  return false;
}

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

    if (response.status === 403) {
      throw new Error("API rate limit exceeded. Try again later.");
    }
    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`,
      );
    }

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

if (startupCheckCheckbox.checked) {
  checkAppUpdates(true);
}

checkUpdateBtn.addEventListener("click", () => {
  if (!newUpdateUrl) {
    checkAppUpdates(false);
  }
});

function parseWingetOutput(text) {
  const lines = text.split("\n");
  const apps = [];
  let isTable = false;

  for (let line of lines) {
    const cleanLine = line.trim();

    if (cleanLine.match(/^[-—]{3,}/)) {
      isTable = true;
      continue;
    }
    if (!isTable || cleanLine === "") continue;

    const parts = cleanLine.split(/\s+/);

    if (parts.length >= 5) {
      const newVer = parts[parts.length - 2];
      const oldVer = parts[parts.length - 3];
      const id = parts[parts.length - 4];
      const name = parts.slice(0, parts.length - 4).join(" ");

      apps.push({
        name: name,
        id: id,
        oldVer: oldVer,
        newVer: newVer,
      });
    } else {
      isTable = false;
    }
  }
  return apps;
}

function toggleUpdateBtnState() {
  const checkedCount = document.querySelectorAll(".app-check:checked").length;
  updateSelectedBtn.disabled = checkedCount === 0;
}

tableBody.addEventListener("change", (e) => {
  if (e.target.classList.contains("app-check")) {
    const allBoxes = document.querySelectorAll(".app-check").length;
    const checkedBoxes = document.querySelectorAll(".app-check:checked").length;

    selectAllCheckbox.checked = allBoxes === checkedBoxes;

    toggleUpdateBtnState();
  }
});

scanBtn.addEventListener("click", async () => {
  updateOutput("scanning");
  appStats.scans += 1;
  saveStats();
  scanBtn.disabled = true;
  tableContainer.classList.add("hidden");
  tableBody.innerHTML = "";
  selectAllCheckbox.checked = true;
  loadingBarContainer.classList.remove("hidden");

  try {
    const response = await invoke("scan_updates");
    const apps = parseWingetOutput(response);
    const visibleApps = apps.filter((app) => !blacklist.includes(app.name));

    if (visibleApps.length === 0) {
      updateOutput("noUpdates");
      updateSelectedBtn.classList.add("hidden");
    } else {
      visibleApps.forEach((app, index) => {
        const row = document.createElement("tr");
        row.style.animationDelay = `${index * 0.04}s`;
        row.innerHTML = `
                <td><input type="checkbox" class="app-check" value="${app.id}" checked></td>
                <td>${app.name}</td>
                <td>${app.oldVer}</td>
                <td>${app.newVer}</td>
                <td class="action-col">
                    <button class="action-btn ignore-btn" title="Options">⋮</button>
                </td>
              `;

        const ignoreBtn = row.querySelector(".ignore-btn");
        ignoreBtn.addEventListener("click", (e) => {
          e.stopPropagation();

          if (
            !contextMenu.classList.contains("hidden") &&
            appToIgnore &&
            appToIgnore.name === app.name
          ) {
            contextMenu.classList.add("hidden");
            appToIgnore = null;
            return;
          }

          appToIgnore = { name: app.name, row: row };

          const rect = ignoreBtn.getBoundingClientRect();
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
  }
});

updateSelectedBtn.addEventListener("click", async () => {
  const selectedBoxes = document.querySelectorAll(".app-check:checked");
  if (selectedBoxes.length === 0) return;

  updateSelectedBtn.disabled = true;
  scanBtn.disabled = true;
  const isAutoAccept = autoAcceptCheckbox.checked;
  const dict = translations[currentLang] || translations["en"];

  outputElement.setAttribute("data-state", "updating");
  outputElement.textContent = dict.updating + "\n";
  loadingBarContainer.classList.remove("hidden");
  autoScrollOutput();

  for (let i = 0; i < selectedBoxes.length; i++) {
    const box = selectedBoxes[i];
    const appRow = box.closest("tr");
    const appName = appRow.cells[1].textContent;

    outputElement.textContent += `\n[${i + 1}/${selectedBoxes.length}] ${dict.updateProgress}: ${appName}... `;
    autoScrollOutput();

    await delay(50);

    try {
      const response = await invoke("update_app", {
        id: box.value,
        autoAccept: isAutoAccept,
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
        if (!appStats.appUpdateCounts[appName]) {
          appStats.appUpdateCounts[appName] = 0;
        }
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

document.addEventListener("mousedown", (e) => {
  const btn = e.target.closest("button:not(:disabled)");
  if (!btn) return;

  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement("span");

  ripple.classList.add("ripple");
  ripple.style.left = `${e.clientX - rect.left}px`;
  ripple.style.top = `${e.clientY - rect.top}px`;

  btn.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 600);
});

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
  consoleContainer.classList.toggle("maximized");
  consoleContainer.classList.remove("minimized");

  window.dispatchEvent(new Event("resize"));
  autoScrollOutput();
});

searchInput.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  const rows = tableBody.querySelectorAll("tr");

  rows.forEach((row) => {
    const name = row.cells[1].textContent.toLowerCase();
    if (name.includes(term)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });

  updateSelectAllState();
});

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

let sortAsc = true;
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

if (openBlacklistBtn) {
  openBlacklistBtn.addEventListener("click", () => {
    renderBlacklist();
    blacklistOverlay.classList.remove("hidden");
  });
}

if (closeBlacklistBtn) {
  closeBlacklistBtn.addEventListener("click", () => {
    blacklistOverlay.classList.add("hidden");
  });
}

if (blacklistOverlay) {
  blacklistOverlay.addEventListener("click", (e) => {
    if (e.target === blacklistOverlay) {
      blacklistOverlay.classList.add("hidden");
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
