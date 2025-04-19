# CSV Table Viewer VS Code Extension

This extension lets you open and view CSV files as interactive tables in a VS Code webview, similar to Excel or Google Sheets.

## Features
- Command: **CSV: Open as Table**
- Select a CSV file and view it as a scrollable, sortable table
- Spreadsheet-like appearance

## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Compile the extension:**
   ```sh
   npm run compile
   ```
3. **Launch in VS Code:**
   - Press `F5` to open a new Extension Development Host
   - Run the command **CSV: Open as Table** from the Command Palette

## Development
- Main entry: `src/extension.ts`
- Uses [PapaParse](https://www.papaparse.com/) for fast CSV parsing
- Table is rendered in a webview with sticky headers and row highlighting

## Requirements
- VS Code 1.70+
- Node.js 16+

---

MIT License
