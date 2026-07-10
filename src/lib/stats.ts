/** 서버측 상관계수 계산 (피어슨 r) */
export function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; syy += y[i] * y[i]; sxy += x[i] * y[i]; }
  const cov = n * sxy - sx * sy;
  const dx = Math.sqrt(n * sxx - sx * sx), dy = Math.sqrt(n * syy - sy * sy);
  return dx && dy ? Math.max(-1, Math.min(1, cov / (dx * dy))) : 0;
}

export interface Metric { key: string; label: string; }
export interface Row { group: string; label: string; vals: number[]; }

/** metrics × metrics 상관행렬 */
export function corrMatrix(metrics: Metric[], rows: Row[]): number[][] {
  const cols = metrics.map((_, j) => rows.map((r) => r.vals[j]));
  return metrics.map((_, i) => metrics.map((__, j) => (i === j ? 1 : pearson(cols[i], cols[j]))));
}

/** 선형회귀 추세선 (y = a + b x) */
export function linreg(x: number[], y: number[]): { a: number; b: number } {
  const n = Math.min(x.length, y.length);
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; sxy += x[i] * y[i]; }
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1);
  const a = (sy - b * sx) / n;
  return { a, b };
}
