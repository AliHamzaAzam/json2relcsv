import type { ConvertResult } from '../runner.ts';
import { parseCsv } from '../csv.ts';
import { downloadBlob, downloadAllAsZip } from './download.ts';

export function renderTablesView(
  container: HTMLElement,
  result: ConvertResult,
): void {
  container.innerHTML = '';

  if (!result.ok || result.tables.length === 0) {
    const p = document.createElement('div');
    p.className = 'placeholder';
    p.textContent = result.ok ? 'No tables generated.' : 'Conversion failed — see error above.';
    container.appendChild(p);
    return;
  }

  // Download all button (shown for any successful conversion with tables)
  const downloadAllRow = document.createElement('div');
  downloadAllRow.className = 'tables-download-all';
  const downloadAllBtn = document.createElement('button');
  downloadAllBtn.className = 'btn btn--primary';
  downloadAllBtn.textContent = 'Download all (.zip)';
  downloadAllBtn.addEventListener('click', () => downloadAllAsZip(result.tables));
  downloadAllRow.appendChild(downloadAllBtn);
  container.appendChild(downloadAllRow);

  for (const { name, csv } of result.tables) {
    const section = document.createElement('div');
    section.className = 'table-section';

    // Heading row
    const heading = document.createElement('div');
    heading.className = 'table-heading';

    const title = document.createElement('span');
    title.className = 'table-name';
    title.textContent = name;

    const dlBtn = document.createElement('button');
    dlBtn.className = 'btn btn--download';
    dlBtn.textContent = `Download ${name}.csv`;
    dlBtn.addEventListener('click', () => downloadBlob(`${name}.csv`, csv));

    heading.appendChild(title);
    heading.appendChild(dlBtn);
    section.appendChild(heading);

    // CSV table
    const parsed = parseCsv(csv);
    const wrap = document.createElement('div');
    wrap.className = 'csv-table-wrap';

    if (parsed.headers.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'placeholder';
      empty.textContent = 'Empty table';
      wrap.appendChild(empty);
    } else {
      const table = document.createElement('table');
      table.className = 'csv-table';

      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      for (const h of parsed.headers) {
        const th = document.createElement('th');
        th.textContent = h;
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      for (const row of parsed.rows) {
        const tr = document.createElement('tr');
        for (let i = 0; i < parsed.headers.length; i++) {
          const td = document.createElement('td');
          td.textContent = row[i] ?? '';
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      wrap.appendChild(table);
    }

    section.appendChild(wrap);
    container.appendChild(section);
  }
}
