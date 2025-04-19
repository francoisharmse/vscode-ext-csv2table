"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const papaparse_1 = __importDefault(require("papaparse"));
function activate(context) {
    let disposable = vscode.commands.registerCommand("csvTableViewer.openCsvAsTable", async (fileUri) => {
        let csvPath;
        // Robustly handle fileUri from context menu or command palette
        if (fileUri && (fileUri.fsPath || fileUri.path)) {
            csvPath = fileUri.fsPath || fileUri.path;
        }
        else {
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
        const parsed = papaparse_1.default.parse(csvContent, { header: true });
        const html = getHtmlForTable(parsed.data, parsed.meta.fields);
        const panel = vscode.window.createWebviewPanel("csvTableViewer", `CSV Table: ${path.basename(csvPath)}`, vscode.ViewColumn.One, { enableScripts: true });
        panel.webview.html = html;
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
function getHtmlForTable(data, fields = []) {
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
          <th></th>
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
        tbody.innerHTML = pagedRows.map((row, idx) =>
          '<tr><td>' + (startIdx + idx + 1) + '</td>' +
          fields.map(f => '<td>' + (row[f] ?? '') + '</td>').join('') +
          '</tr>'
        ).join('');
        renderPagination(rows.length);
      }

      function renderPagination(totalRows) {
        const pageButtons = document.getElementById('page-buttons');
        const pageInfo = document.getElementById('page-info');
        let totalPages = 1;
        if (pageSize === 'all') {
          totalPages = 1;
          currentPage = 1;
        } else {
          totalPages = Math.ceil(totalRows / pageSize);
          if (currentPage > totalPages) currentPage = totalPages;
        }
        let buttonsHtml = '';
        if (totalPages > 1) {
          buttonsHtml += '<button onclick="gotoPage(1)" ' + (currentPage === 1 ? 'disabled' : '') + '>|<</button>';
          buttonsHtml += '<button onclick="gotoPage(' + (currentPage - 1) + ')" ' + (currentPage === 1 ? 'disabled' : '') + '><</button>';
          for (let p = 1; p <= totalPages; ++p) {
            if (p === currentPage) {
              buttonsHtml += '<button disabled>' + p + '</button>';
            } else if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2) {
              buttonsHtml += '<button onclick="gotoPage(' + p + ')">' + p + '</button>';
            } else if (p === currentPage - 3 || p === currentPage + 3) {
              buttonsHtml += '...';
            }
          }
          buttonsHtml += '<button onclick="gotoPage(' + (currentPage + 1) + ')" ' + (currentPage === totalPages ? 'disabled' : '') + '>></button>';
          buttonsHtml += '<button onclick="gotoPage(' + totalPages + ')" ' + (currentPage === totalPages ? 'disabled' : '') + '>>|</button>';
        }
        pageButtons.innerHTML = buttonsHtml;
        pageInfo.textContent = totalRows === 0
          ? 'No records'
          : 'Showing ' + (pageSize === 'all' ? 1 : ((currentPage - 1) * pageSize + 1)) +
            '–' + (pageSize === 'all' ? totalRows : Math.min(currentPage * pageSize, totalRows)) +
            ' of ' + totalRows;
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
//# sourceMappingURL=extension.js.map