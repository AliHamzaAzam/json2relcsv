import { strToU8, zip } from 'fflate';

export function downloadBlob(filename: string, content: string, mimeType = 'text/csv'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadAllAsZip(tables: { name: string; csv: string }[]): void {
  const files: Record<string, Uint8Array> = {};
  for (const { name, csv } of tables) {
    files[`${name}.csv`] = strToU8(csv);
  }

  zip(files, (err, data) => {
    if (err) {
      console.error('zip error', err);
      return;
    }
    const blob = new Blob([data], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tables.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
