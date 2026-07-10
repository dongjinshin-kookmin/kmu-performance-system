/**
 * param_* 테이블 → 타입 구조 로더. 생성기와 계산 엔진이 공통 소비한다.
 * (엔진은 코드, 값·식은 데이터 — 원칙 P1/P6)
 */
import type BetterSqlite3 from "better-sqlite3";

export interface TrackWeight {
  track_code: string;
  w_R: number;
  w_E: number;
  w_I: number;
  w_S: number;
}
export interface GradeCut {
  grade: string;
  cut_score: number | null;
}
export interface RelDist {
  grade: string;
  dist_ratio: number | null;
}
export interface DistDef {
  dist_type: string;
  dist_params: Record<string, number>;
}

export interface Params {
  version: number;
  coef: Map<string, Map<string, number>>; // group -> key -> value
  track: Map<string, TrackWeight>;
  absCut: GradeCut[]; // FACULTY
  relDist: RelDist[]; // FACULTY
  dist: Map<string, DistDef>; // "metric|series"
}

export function loadParams(db: BetterSqlite3.Database, version: number): Params {
  const coef = new Map<string, Map<string, number>>();
  for (const r of db
    .prepare(`SELECT coef_group,coef_key,coef_value FROM param_coefficient WHERE param_version_id=?`)
    .all(version) as { coef_group: string; coef_key: string; coef_value: number }[]) {
    if (!coef.has(r.coef_group)) coef.set(r.coef_group, new Map());
    coef.get(r.coef_group)!.set(r.coef_key, r.coef_value);
  }

  const track = new Map<string, TrackWeight>();
  for (const r of db
    .prepare(`SELECT track_code,w_R,w_E,w_I,w_S FROM param_track_weight WHERE param_version_id=?`)
    .all(version) as TrackWeight[]) {
    track.set(r.track_code, r);
  }

  const absCut = db
    .prepare(
      `SELECT grade,cut_score FROM param_grade_policy WHERE param_version_id=? AND target_type='FACULTY' AND mode='ABS_CUT'`
    )
    .all(version) as GradeCut[];
  const relDist = db
    .prepare(
      `SELECT grade,dist_ratio FROM param_grade_policy WHERE param_version_id=? AND target_type='FACULTY' AND mode='REL_DIST'`
    )
    .all(version) as RelDist[];

  const dist = new Map<string, DistDef>();
  for (const r of db
    .prepare(`SELECT metric_key,series,dist_type,dist_params FROM param_distribution WHERE param_version_id=?`)
    .all(version) as { metric_key: string; series: string; dist_type: string; dist_params: string }[]) {
    dist.set(`${r.metric_key}|${r.series}`, {
      dist_type: r.dist_type,
      dist_params: JSON.parse(r.dist_params),
    });
  }

  return { version, coef, track, absCut, relDist, dist };
}

/** metric+key(field/group/'ALL') 해석 (없으면 ALL 폴백) */
export function resolveDist(p: Params, metric: string, key: string): DistDef {
  const d = p.dist.get(`${metric}|${key}`) ?? p.dist.get(`${metric}|ALL`);
  if (!d) throw new Error(`분포 없음: ${metric}|${key}`);
  return d;
}

export function coefVal(p: Params, group: string, key: string, dflt = 0): number {
  return p.coef.get(group)?.get(key) ?? dflt;
}
