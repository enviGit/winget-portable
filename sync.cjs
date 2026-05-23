const fs = require("fs");
const path = require("path");

const pkgPath = path.join(__dirname, "package.json");
const lockPath = path.join(__dirname, "package-lock.json");
const tauriConfPath = path.join(__dirname, "src-tauri", "tauri.conf.json");
const cargoPath = path.join(__dirname, "src-tauri", "Cargo.toml");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const version = pkg.version;

console.log(`Syncing version ${version} to other files...`);

if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  lock.version = version;
  if (lock.packages && lock.packages[""]) {
    lock.packages[""].version = version;
  }
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
  console.log("* Updated package-lock.json");
}

let tauriConf = fs.readFileSync(tauriConfPath, "utf8");
tauriConf = tauriConf.replace(/"version": ".*?"/, `"version": "${version}"`);
fs.writeFileSync(tauriConfPath, tauriConf);
console.log("* Updated tauri.conf.json");

let cargo = fs.readFileSync(cargoPath, "utf8");
cargo = cargo.replace(/^version = ".*?"/m, `version = "${version}"`);
fs.writeFileSync(cargoPath, cargo);
console.log("* Updated Cargo.toml");

console.log("Done!");
