const { invoke } = window.__TAURI__.core;
const { getCurrentWindow } = window.__TAURI__.window;
const { getVersion } = window.__TAURI__.app;

const scanBtn = document.getElementById("scanBtn");
const updateSelectedBtn = document.getElementById("updateSelectedBtn");
const autoAcceptCheckbox = document.getElementById("autoAccept");
const startupCheckCheckbox = document.getElementById("startupCheck");
const outputElement = document.getElementById("output");
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
    if (line.match(/^[-—]{3,}/)) {
      isTable = true;
      continue;
    }
    if (!isTable || line.trim() === "") continue;

    const parts = line.trim().split(/\s+/);

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
  scanBtn.disabled = true;
  tableContainer.classList.add("hidden");
  tableBody.innerHTML = "";
  selectAllCheckbox.checked = true;

  try {
    const response = await invoke("scan_updates");
    const apps = parseWingetOutput(response);

    if (apps.length === 0) {
      updateOutput("noUpdates");
    } else {
      apps.forEach((app, index) => {
        const row = document.createElement("tr");
        row.style.animationDelay = `${index * 0.04}s`;
        row.innerHTML = `
          <td><input type="checkbox" class="app-check" value="${app.id}" checked></td>
          <td>${app.name}</td>
          <td>${app.oldVer}</td>
          <td>${app.newVer}</td>
        `;
        tableBody.appendChild(row);
      });
      tableContainer.classList.remove("hidden");
      updateOutput("ready");
      toggleUpdateBtnState();
    }
  } catch (error) {
    updateOutput("error", error);
  } finally {
    scanBtn.disabled = false;
  }
});

selectAllCheckbox.addEventListener("change", (e) => {
  const checkboxes = document.querySelectorAll(".app-check");
  checkboxes.forEach((box) => (box.checked = e.target.checked));
  toggleUpdateBtnState();
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

  for (let i = 0; i < selectedBoxes.length; i++) {
    const box = selectedBoxes[i];
    const appRow = box.closest("tr");
    const appName = appRow.cells[1].textContent;

    outputElement.textContent += `\n[${i + 1}/${selectedBoxes.length}] ${dict.updateProgress}: ${appName}... `;

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
      }
    } catch (error) {
      outputElement.textContent += `\n${dict.error} ${error}\n`;
    }

    await delay(50);
  }

  outputElement.textContent += `\n${dict.finished}`;

  await delay(2000);

  updateSelectedBtn.disabled = false;
  scanBtn.disabled = false;
  scanBtn.click();
});
