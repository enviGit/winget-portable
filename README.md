# Winget Portable Updater

A lightweight, portable Windows application that scans and updates your software using the system's built-in Winget package manager. Built with Tauri and Vanilla JS for maximum performance.

## Features
* **Portable:** Runs as a single `.exe` file with no installation required.
* **Admin Ready:** Automatically requests the necessary administrator privileges on launch.
* **Smart Scanning:** Fetches a list of available updates before making any changes.
* **Auto-Accept:** Bypasses tedious source and package agreements silently.
* **Modern UI:** Matches system themes including full Dark Mode support.
* **Multilingual:** Supports English and Polish out of the box.

## Download
Grab the latest `.exe` file from the [Releases](../../releases) tab.

## Development
This project uses Tauri. To run it locally:
1. Install Node.js and Rust.
2. Run `npm install` to get frontend dependencies.
3. Run `npm run tauri dev` to start the development server.
