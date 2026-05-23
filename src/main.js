const { invoke } = window.__TAURI__.tauri;

const translations = {
  en: {
    title: "Update Apps",
    description:
      "This tool will fetch and install the latest versions of your installed software.",
    scanBtn: "Scan for updates",
    autoAccept: "Automatically accept all agreements",
    updateSelectedBtn: "Update Selected",
    colName: "Name",
    colCurrent: "Current",
    colNew: "New",
    ready: "Ready to go...",
    scanning: "Scanning system for updates...",
    updating: "Updating selected apps...",
    noUpdates: "No updates found.",
    error: "Error: \n",
  },
  pl: {
    title: "Menedżer Aktualizacji",
    description:
      "Narzędzie znajdzie i zainstaluje najnowsze wersje Twoich programów.",
    scanBtn: "Skanuj system",
    autoAccept: "Akceptuj regulaminy automatycznie",
    updateSelectedBtn: "Aktualizuj zaznaczone",
    colName: "Nazwa",
    colCurrent: "Obecna",
    colNew: "Nowa",
    ready: "Gotowy do pracy...",
    scanning: "Szukam aktualizacji...",
    updating: "Aktualizowanie zaznaczonych programów...",
    noUpdates: "Wszystkie programy są aktualne.",
    error: "Błąd: \n",
  },
};

const scanBtn = document.getElementById("scanBtn");
const updateSelectedBtn = document.getElementById("updateSelectedBtn");
const autoAcceptCheckbox = document.getElementById("autoAccept");
const outputElement = document.getElementById("output");
const langSelect = document.getElementById("langSelect");
const tableContainer = document.getElementById("tableContainer");
const tableBody = document.getElementById("tableBody");
const selectAllCheckbox = document.getElementById("selectAll");

let currentLang = "en";
const sysLang = navigator.language.slice(0, 2);
if (translations[sysLang]) {
  currentLang = sysLang;
}
langSelect.value = currentLang;
applyLanguage(currentLang);

langSelect.addEventListener("change", (e) => {
  currentLang = e.target.value;
  applyLanguage(currentLang);
});

function applyLanguage(lang) {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });

  const currentState = outputElement.getAttribute("data-state");
  if (currentState && translations[lang][currentState]) {
    outputElement.textContent = translations[lang][currentState];
  }
}

function updateOutput(stateKey, appendText = "") {
  outputElement.setAttribute("data-state", stateKey);
  outputElement.textContent = translations[currentLang][stateKey] + appendText;
}

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
