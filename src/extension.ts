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
      .pagination { margin: 12px 0 0 0; display: flex; align-items: center; gap: 1em; }
      .pagination button { padding: 4px 10px; margin: 0 2px; }
      .pagination select { padding: 2px 6px; }
    </style>
  </head>
  <body>
    <table id="csv-table">
      <thead>
        <tr>
          <th>#</th>
          ${fields.map((f, i) => `<th onclick=\"sortTable(${i})\" id=\"header-${i}\">${f}</th>`).join("")}
        </tr>
        <tr>
          <th style="text-align: left;">
            <input type="checkbox" id="select-all" onclick="toggleSelectAll(this)" style="float: left;">
          </th>
          ${fields.map((_, i) => `<th><input class=\"filter-input\" id=\"filter-${i}\" oninput=\"onFilterInput()\" placeholder=\"Filter...\"></th>`).join("")}
        </tr>
      </thead>
      <tbody id="table-body">
        <!-- Table rows will be rendered by JS -->
      </tbody>
    </table>
    <div class="pagination" id="pagination-controls">
      <label>Rows per page:
        <select id="page-size" onchange="onPageSizeChange()">
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="all">All</option>
        </select>
      </label>
      <span id="page-buttons"></span>
      <span id="page-info"></span>
    </div>
    <script>
      const data = ${jsonData};
      const fields = ${jsonFields};
      let sortColumn = null;
      let sortDirection = 1; // 1 = asc, -1 = desc
      let filters = Array(fields.length).fill('');
      let currentPage = 1;
      let pageSize = 10;
      let selectedRows = new Set();

      function rowKey(row) {
        // Use a stable string representation as unique key
        return JSON.stringify(row);
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

      function renderTable(rows) {
        const tbody = document.getElementById('table-body');
        let pagedRows = rows;
        let startIdx = 0;
        if (pageSize !== 'all') {
          pageSize = parseInt(pageSize);
          startIdx = (currentPage - 1) * pageSize;
          pagedRows = rows.slice(startIdx, startIdx + pageSize);
        }
        tbody.innerHTML = pagedRows.map(function(row, idx) {
          var key = rowKey(row);
          var checked = selectedRows.has(key) ? 'checked' : '';
          return '<tr>' +
            '<td><input type="checkbox" class="row-checkbox" data-key="' + key.replace(/"/g, '&quot;') + '" onclick="onRowSelect(this)" ' + checked + '> ' + (startIdx + idx + 1) + '</td>' +
            fields.map(function(f) { return '<td>' + (row[f] ?? '') + '</td>'; }).join('') +
            '</tr>';
        }).join('');
        renderPagination(rows.length);
        updateSelectAllCheckbox();
      }

      function onRowSelect(checkbox) {
        const key = checkbox.getAttribute('data-key');
        if (checkbox.checked) {
          selectedRows.add(key);
        } else {
          selectedRows.delete(key);
        }
        updateSelectAllCheckbox();
      }

      function toggleSelectAll(headerCheckbox) {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        if (headerCheckbox.checked) {
          checkboxes.forEach(cb => {
            cb.checked = true;
            selectedRows.add(cb.getAttribute('data-key'));
          });
        } else {
          checkboxes.forEach(cb => {
            cb.checked = false;
            selectedRows.delete(cb.getAttribute('data-key'));
          });
        }
        updateSelectAllCheckbox();
      }

      function updateSelectAllCheckbox() {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        const selectAll = document.getElementById('select-all');
        if (checkboxes.length === 0) {
          selectAll.checked = false;
          selectAll.indeterminate = false;
          return;
        }
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        if (checkedCount === 0) {
          selectAll.checked = false;
          selectAll.indeterminate = false;
        } else if (checkedCount === checkboxes.length) {
          selectAll.checked = true;
          selectAll.indeterminate = false;
        } else {
          selectAll.checked = false;
          selectAll.indeterminate = true;
        }
      }

      function gotoPage(page) {
        currentPage = page;
        updateTable();
      }

      function onPageSizeChange() {
        const sel = document.getElementById('page-size');
        pageSize = sel.value === 'all' ? 'all' : parseInt(sel.value);
        currentPage = 1;
        updateTable();
      }

      function onFilterInput() {
        filters = fields.map((_, i) => document.getElementById('filter-' + i).value);
        currentPage = 1;
        updateTable();
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
        currentPage = 1;
        updateTable();
      }

      function updateTable() {
        let filtered = getFilteredData();
        if (sortColumn !== null) {
          filtered = sortData(filtered, sortColumn, sortDirection);
        }
        renderTable(filtered);
      }

      // Initial render
      document.addEventListener('DOMContentLoaded', function() {
        // Set default page size
        document.getElementById('page-size').value = '10';
        updateTable();
      });
    </script>
  </body>
  </html>`;
}