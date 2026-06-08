export function formatBytes(n: number): string {
  if (n === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(n) / Math.log(k));
  const v = n / Math.pow(k, i);
  return `${i === 0 ? v : v.toFixed(i === 1 ? 1 : 2)} ${sizes[i]}`;
}

export function savingsPercent(original: number, optimized: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - optimized) / original) * 100);
}
