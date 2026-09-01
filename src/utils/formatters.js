export function esc(str) {
  return (str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function fmtDate(val) {
  if (!val) return '—';
  try {
    if (val instanceof Date) return val.toLocaleString();
    const str = String(val);
    const hasTz = str.includes('Z') || str.includes('+') || str.includes('T');
    const d = new Date(hasTz ? str : str + 'Z');
    if (isNaN(d.getTime())) return str;
    return d.toLocaleString();
  } catch (e) {
    return String(val);
  }
}

export function fmtBytes(n) {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let val = Number(n);
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}
