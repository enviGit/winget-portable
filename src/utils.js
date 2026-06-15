const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanWingetOutput(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/.*[▒█].*\n?/g, "")
    .replace(/^[ \t]*[-/\\|][ \t]*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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

      apps.push({ name, id, oldVer, newVer });
    } else {
      isTable = false;
    }
  }
  return apps;
}

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

function renderRow(app, index, isPinned) {
  const row = document.createElement("tr");
  row.style.animationDelay = `${index * 0.04}s`;
  row.innerHTML = `
          <td><input type="checkbox" class="app-check" value="${app.id}" checked></td>
          <td class="name-cell" style="position: relative; padding-right: 25px;">
              ${app.name}
              <span class="pin-icon-container" title="Pinned" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); color: var(--accent-color); display: ${isPinned ? "inline-flex" : "none"};">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
              </span>
          </td>
          <td>${app.oldVer}</td>
          <td>${app.newVer}</td>
          <td class="action-col"><button class="action-btn ignore-btn">⋮</button></td>
      `;
  return row;
}
