import seedrandom from "seedrandom";

/**
 * 시드 고정 RNG + 분포 샘플러.
 * 마스터 시드에서 이름별 하위 스트림을 파생해 재현성을 보장한다.
 * (04_데이터모델 §11.1 · 01_교수지표체계 §7)
 */
export class Rng {
  private prng: seedrandom.PRNG;
  private spare: number | null = null;

  constructor(seed: string) {
    this.prng = seedrandom(seed);
  }

  /** 이름으로 파생된 독립 스트림 생성 (생성 단계 격리용) */
  derive(name: string): Rng {
    return new Rng(`${this.prng().toString(36)}::${name}`);
  }

  next(): number {
    return this.prng();
  }

  int(min: number, max: number): number {
    return Math.floor(this.prng() * (max - min + 1)) + min;
  }

  float(min: number, max: number): number {
    return this.prng() * (max - min) + min;
  }

  bool(p: number): boolean {
    return this.prng() < p;
  }

  /** 배열에서 균등 추출 */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.prng() * arr.length)];
  }

  /** 비복원 추출 n개 */
  sample<T>(arr: readonly T[], n: number): T[] {
    const pool = [...arr];
    const out: T[] = [];
    for (let i = 0; i < n && pool.length; i++) {
      out.push(pool.splice(Math.floor(this.prng() * pool.length), 1)[0]);
    }
    return out;
  }

  /** 가중 범주 추출: [{value, w}] */
  weighted<T>(items: { value: T; w: number }[]): T {
    const total = items.reduce((s, it) => s + it.w, 0);
    let r = this.prng() * total;
    for (const it of items) {
      r -= it.w;
      if (r <= 0) return it.value;
    }
    return items[items.length - 1].value;
  }

  /** 표준정규 (Box-Muller, spare 캐시) */
  normal(): number {
    if (this.spare !== null) {
      const s = this.spare;
      this.spare = null;
      return s;
    }
    let u = 0,
      v = 0;
    while (u === 0) u = this.prng();
    while (v === 0) v = this.prng();
    const mag = Math.sqrt(-2.0 * Math.log(u));
    this.spare = mag * Math.sin(2.0 * Math.PI * v);
    return mag * Math.cos(2.0 * Math.PI * v);
  }

  /** 절단 정규 */
  normalTrunc(mean: number, sd: number, lo: number, hi: number): number {
    for (let i = 0; i < 50; i++) {
      const x = mean + sd * this.normal();
      if (x >= lo && x <= hi) return x;
    }
    return Math.min(hi, Math.max(lo, mean));
  }

  /** 로그정규 (median = exp(mu)) */
  lognormal(median: number, sigma: number): number {
    return Math.exp(Math.log(median) + sigma * this.normal());
  }

  /** 포아송 (Knuth) */
  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= this.prng();
    } while (p > L);
    return k - 1;
  }

  /** 감마 (Marsaglia-Tsang), shape k>0 */
  private gamma(k: number): number {
    if (k < 1) {
      const u = this.prng();
      return this.gamma(1 + k) * Math.pow(u, 1 / k);
    }
    const d = k - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x = this.normal();
      let v = 1 + c * x;
      if (v <= 0) continue;
      v = v * v * v;
      const u = this.prng();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }

  /** 베타분포 */
  beta(alpha: number, betaP: number): number {
    const ga = this.gamma(alpha);
    const gb = this.gamma(betaP);
    return ga / (ga + gb);
  }

  /** Zero-inflated 래퍼: p_zero 확률로 0, 아니면 sampler() */
  zeroInflated(pZero: number, sampler: () => number): number {
    return this.prng() < pZero ? 0 : sampler();
  }
}

/** dist_type + JSON 파라미터 → 샘플 (param_distribution 직접 소비) */
export function sampleDist(
  rng: Rng,
  distType: string,
  params: Record<string, number>
): number {
  switch (distType) {
    case "poisson":
      return rng.poisson(params.lambda);
    case "lognormal":
      return rng.lognormal(params.median ?? Math.exp(params.mu ?? 0), params.sigma);
    case "normal_trunc":
      return rng.normalTrunc(params.mean, params.sd ?? params.sigma, params.lo, params.hi);
    case "normal":
      return params.mean + (params.sd ?? params.sigma) * rng.normal();
    case "beta":
      return rng.beta(params.alpha, params.beta);
    case "zip": // zero-inflated poisson
      return rng.zeroInflated(params.zero, () => rng.poisson(params.lambda));
    case "ziln": // zero-inflated lognormal
      return rng.zeroInflated(params.zero, () => rng.lognormal(params.median, params.sigma));
    default:
      throw new Error(`알 수 없는 dist_type: ${distType}`);
  }
}
