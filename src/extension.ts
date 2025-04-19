import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import Papa from "papaparse";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "csvTableViewer.openCsvAsTable",
    async (fileUri?: vscode.Uri) => {
      let csvPath: string | undefined;

      // Robustly handle fileUri from context menu or command palette
      if (fileUri && (fileUri.fsPath || fileUri.path)) {
        csvPath = fileUri.fsPath || fileUri.path;
      } else {
        const picked = await vscode.window.showOpenDialog({
          filters: { "CSV Files": ["csv"] },
          canSelectMany: false,
        });
        if (!picked || picked.length === 0) {
          return;
        }
        csvPath = picked[0].fsPath;
      }

      if (!csvPath) {
        vscode.window.showErrorMessage("No CSV file selected.");
        return;
      }

      const csvContent = fs.readFileSync(csvPath, "utf-8");
      const parsed = Papa.parse(csvContent, { header: true });
      const html = getHtmlForTable(parsed.data, parsed.meta.fields);

      const panel = vscode.window.createWebviewPanel(
        "csvTableViewer",
        `CSV Table: ${path.basename(csvPath)}`,
        vscode.ViewColumn.One,
        { enableScripts: true }
      );
      panel.webview.html = html;
    }
  );
  context.subscriptions.push(disposable);
}

export function deactivate() {}

function getHtmlForTable(data: any[], fields: string[] = []) {
  const jsonData = JSON.stringify(data);
  const jsonFields = JSON.stringify(fields);

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: sans-serif; margin: 0; padding: 0; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 8px; }
      th { background: #f4f4f4; position: sticky; top: 0; cursor: pointer; }
      input.filter-input { width: 95%; padding: 2px; box-sizing: border-box; }
      tr:hover { background: #e2e2ff; }
      .sort-asc::after { content: ' ▲'; }
      .sort-desc::after { content: ' ▼'; }
    </style>
  </head>
  <body>
    <table id="csv-table">
      <thead>
        <tr>
          <th>#</th>
          ${fields.map((f, i) => `<th onclick="sortTable(${i})" id="header-${i}">${f}</th>`).join("")}
        </tr>
        <tr>
          <th></th>
          ${fields.map((_, i) => `<th><input class="filter-input" id="filter-${i}" oninput="onFilterInput()" placeholder="Filter..."></th>`).join("")}
        </tr>
      </thead>
      <tbody id="table-body">
        ${data
          .map(
            (row, idx) =>
              `<tr><td>${idx + 1}</td>${fields
                .map((f) => `<td>${row[f] ?? ""}</td>`)
                .join("")}</tr>`
          )
          .join("")}
      </tbody>
    </table>
    <script>
      const data = ${jsonData};
      const fields = ${jsonFields};
      let sortColumn = null;
      let sortDirection = 1; // 1 = asc, -1 = desc
      let filters = Array(fields.length).fill('');

      function renderTable(rows) {
        const tbody = document.getElementById('table-body');
        tbody.innerHTML = rows.map((row, idx) =>
          '<tr><td>' + (idx + 1) + '</td>' +
          fields.map(f => '<td>' + (row[f] ?? '') + '</td>').join('') +
          '</tr>'
        ).join('');
      }

      function getFilteredData() {
        return data.filter(row => {
          return fields.every((f, i) => {
            const filter = filters[i].toLowerCase();
            const value = (row[f] ?? '').toString().toLowerCase();
            return !filter || value.includes(filter);
          });
        });
      }

      function onFilterInput() {
        filters = fields.map((_, i) => document.getElementById('filter-' + i).value);
        let filtered = getFilteredData();
        if (sortColumn !== null) {
          filtered = sortData(filtered, sortColumn, sortDirection);
        }
        renderTable(filtered);
      }

      function sortTable(colIndex) {
        const field = fields[colIndex];
        if (sortColumn === colIndex) {
          sortDirection *= -1;
        } else {
          sortColumn = colIndex;
          sortDirection = 1;
        }
        // Remove sort indicators
        fields.forEach((_, i) => {
          document.getElementById('header-' + i).classList.remove('sort-asc', 'sort-desc');
        });
        document.getElementById('header-' + colIndex).classList.add(sortDirection === 1 ? 'sort-asc' : 'sort-desc');
        // Sort
        let filtered = getFilteredData();
        filtered = sortData(filtered, colIndex, sortDirection);
        renderTable(filtered);
      }

      function sortData(rows, colIndex, direction) {
        const field = fields[colIndex];
        return [...rows].sort((a, b) => {
          const aVal = a[field] ?? '';
          const bVal = b[field] ?? '';
          if (!isNaN(parseFloat(aVal)) && !isNaN(parseFloat(bVal))) {
            return (parseFloat(aVal) - parseFloat(bVal)) * direction;
          }
          return aVal.localeCompare(bVal, undefined, {numeric: true}) * direction;
        });
      }
    </script>
  </body>
  </html>`;
}