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

# TODO
1. Export Filtered/Sorted Data
Allow users to export the currently viewed table (after sorting/filtering) back to a CSV or JSON.

🛠 Button: "Export View as CSV"

2. Column Visibility Toggle
Let users hide/show columns dynamically via checkboxes or a dropdown.

Good for focusing on specific fields.

3. Inline Cell Editing
Allow editing cell values directly in the table.

Option to save changes back to the original CSV or export as new.

4. Search Across All Columns
Global search box that filters rows based on a term across all columns.

5. Data Type Detection
Infer and show the type (number, date, string) for each column.

Could enable smart sorting (e.g., dates sorted chronologically).

6. Highlighting / Conditional Formatting
Let users apply simple rules, e.g., highlight values above/below a threshold.

7. Column Reordering via Drag & Drop
Improve UX by letting users rearrange columns visually.

8. Summary Row / Stats
Add an optional footer row to show stats per column:

Count, Sum (for numeric), Min, Max, Avg

9. Copy Row or Cell to Clipboard
Right-click → Copy value / Copy row as CSV

10. Bookmark / Pin Rows
Let users mark rows for quick reference.

## Bonus features
- Chart Preview: Generate quick charts (bar, line, pie) from selected columns
- CSV Comparison Mode: Diff two CSVs side-by-side
- Dark Mode Theme Support: Adjust table style to match editor theme

## License
MIT License
