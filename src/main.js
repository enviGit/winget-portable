const translations = {
  en: {
    title: "Update Apps",
    description:
      "This tool will fetch and install the latest versions of your installed software.",
    scanBtn: "Scan for updates",
    autoAccept: "Automatically accept agreements",
    startupCheck: "Check app updates on startup",
    updateSelectedBtn: "Update Selected",
    colName: "Name",
    colCurrent: "Current",
    colNew: "New",
    ready: "Ready to go...",
    scanning: "Scanning system for updates...",
    updating: "Updating selected apps...",
    noUpdates: "No updates found.",
    error: "Error: \n",
    settingsTitle: "Settings",
    themeBtn: "Toggle Dark/Light Mode",
    closeBtn: "Close",
    checkAppUpdate: "Check for app updates",
    downloadUpdate: "Download update",
    checking: "Checking...",
    updateAvailable: "New version available!",
    upToDate: "You are on the latest version.",
  },
  pl: {
    title: "Menedżer Aktualizacji",
    description:
      "Narzędzie znajdzie i zainstaluje najnowsze wersje Twoich programów.",
    scanBtn: "Skanuj system",
    autoAccept: "Akceptuj regulaminy",
    startupCheck: "Sprawdzaj aktualizacje programu",
    updateSelectedBtn: "Aktualizuj zaznaczone",
    colName: "Nazwa",
    colCurrent: "Obecna",
    colNew: "Nowa",
    ready: "Gotowy do pracy...",
    scanning: "Szukam aktualizacji...",
    updating: "Aktualizowanie zaznaczonych programów...",
    noUpdates: "Wszystkie programy są aktualne.",
    error: "Błąd: \n",
    settingsTitle: "Ustawienia",
    themeBtn: "Zmień motyw",
    closeBtn: "Zamknij",
    checkAppUpdate: "Sprawdź aktualizacje",
    downloadUpdate: "Pobierz aktualizację",
    checking: "Sprawdzam...",
    updateAvailable: "Dostępna nowa wersja!",
    upToDate: "Posiadasz najnowszą wersję.",
  },
};

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
}

function updateOutput(stateKey, appendText = "") {
  const dict = translations[currentLang] || translations["en"];
  outputElement.setAttribute("data-state", stateKey);
  outputElement.textContent = dict[stateKey] + appendText;
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
  } else {
    htmlEl.setAttribute("data-theme", "light");
  }

  setTimeout(() => {
    isThemeToggling = false;
    themeToggleBtn.disabled = false;
  }, 450);
});

let newUpdateUrl = null;

async function checkAppUpdates(silent = false) {
  if (!silent) {
    appUpdateStatus.textContent = (
      translations[currentLang] || translations["en"]
    ).checking;
    checkUpdateBtn.disabled = true;
  }

  try {
    const response = await fetch(
      "https://api.github.com/repos/enviGit/winget-portable/releases/latest",
    );
    const data = await response.json();
    const currentVersion = "v1.0.0";

    if (data.tag_name && data.tag_name !== currentVersion) {
      newUpdateUrl = data.html_url;
      appUpdateStatus.textContent = (
        translations[currentLang] || translations["en"]
      ).updateAvailable;
      checkUpdateBtn.textContent = (
        translations[currentLang] || translations["en"]
      ).downloadUpdate;
      checkUpdateBtn.style.backgroundColor = "var(--accent-color)";

      checkUpdateBtn.onclick = async () => {
        await invoke("open_link", { url: newUpdateUrl });
      };
    } else if (!silent) {
      appUpdateStatus.textContent = (
        translations[currentLang] || translations["en"]
      ).upToDate;
    }
  } catch (err) {
    if (!silent)
      appUpdateStatus.textContent = (
        translations[currentLang] || translations["en"]
      ).error;
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
    if (line.includes("---")) {
      isTable = true;
      continue;
    }
    if (!isTable || line.trim() === "") continue;

    const parts = line.split(/\s{2,}/);
    if (parts.length >= 4) {
      apps.push({
        name: parts[0].trim(),
        id: parts[1].trim(),
        oldVer: parts[2].trim(),
        newVer: parts[3].trim(),
      });
    }
  }
  return apps;
}

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
});

updateSelectedBtn.addEventListener("click", async () => {
  const selectedBoxes = document.querySelectorAll(".app-check:checked");
  if (selectedBoxes.length === 0) return;

  updateSelectedBtn.disabled = true;
  const isAutoAccept = autoAcceptCheckbox.checked;
  updateOutput("updating", "\n");

  for (let box of selectedBoxes) {
    try {
      const response = await invoke("update_app", {
        id: box.value,
        autoAccept: isAutoAccept,
      });
      outputElement.textContent += `\n${response}`;
    } catch (error) {
      outputElement.textContent += `\n${translations[currentLang].error} ${error}`;
    }
  }
  updateSelectedBtn.disabled = false;
});
