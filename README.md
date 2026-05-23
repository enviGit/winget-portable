# Winget Portable

A lightweight, portable Windows application that scans and updates your software using the system's built-in Winget package manager. Built with Tauri and Vanilla JS for maximum performance.

## Key Changes & Updates
* **Engine Hardening:** Switched from relying on exit codes to robust text-based validation. The application now correctly identifies failed updates (like "No applicable upgrade found") even when the installer returns a zero status code.
* **Smart Output Filtering:** Integrated a powerful regex-based cleaner to remove console artifacts, progress bars, and hidden control characters, ensuring a clean and readable user interface.
* **Dynamic UX:** Added automatic button state management. The "Update Selected" button is now context-aware and disables itself when no apps are selected or during ongoing operations.
* **Enhanced Reliability:** Added global error handling for GitHub API requests to respect rate limits and added visual truncation for long package names to keep the UI stable.

## Features
* **Portable:** Runs as a single `.exe` file with no installation required.
* **Intelligent Logic:** Reliably detects installation issues across different system locales.
* **Smart Scanning:** Fetches a list of available updates before making any changes.
* **Auto-Accept:** Bypasses tedious source and package agreements silently.
* **Modern UI:** Matches system themes with full Dark Mode support and a responsive design.
* **Multilingual:** Native support for English, Polish, Spanish, German, French, and Italian.

## Download
Grab the latest `.exe` file from the [Releases](../../releases) tab.

## Development
This project uses Tauri. To run it locally:
1. Install Node.js and Rust.
2. Run `npm install` to get frontend dependencies.
3. Run `npm run tauri dev` to start the development server.
