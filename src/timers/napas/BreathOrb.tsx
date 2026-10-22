import { useRef } from "react";
import { hexToRgb, useShader } from "../../core/canvas";
import { position } from "../../core/engine";
import { getRun } from "../../core/runs";
import { isDark } from "../../core/settings";
import { PHASE_COLORS, orbSize, previewAt, type Pattern, type PhaseKind } from "./plan";

/**
 * A soft, glowing blob that breathes with you: it inflates on "tarik",
 * shimmers while holding, deflates on "buang". Ripples and bokeh drift
 * inward on inhale and outward on exhale. Frozen + dimmed while paused,
 * blooms into a flower when the session is done.
 */
const FRAG = /* glsl */ `
uniform float u_t;
uniform float u_size;
uniform float u_hold;
uniform float u_flow;
uniform float u_dim;
uniform float u_bloom;
uniform float u_phase;
uniform float u_arc;
uniform float u_dark;
uniform float u_face;
uniform float u_dpr;
uniform vec3 u_col;
uniform vec3 u_col2;
uniform vec3 u_bg;
uniform vec3 u_ink;
uniform vec3 u_shadow;

float h11(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float h21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x),
             mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}

const float TAU = 6.2831853;

// Blob radius along angle a (shared by the body and its hard shadow).
float blobR(float R, float a, vec2 q, float t) {
  float w = sin(a * 3.0 + t * 0.9) * 0.5 + sin(a * 5.0 - t * 1.3) * 0.28 + sin(a * 2.0 - t * 0.55) * 0.4;
  w *= 0.02 * (1.0 - u_bloom * 0.6);
  w += (vnoise(q * 5.0 + vec2(t * 0.5, -t * 0.35)) - 0.5) * 0.07;
  w += u_hold * sin(a * 13.0 + t * 4.0) * 0.007;
  float petal = pow(abs(cos(a * 3.0 + t * 0.08)), 2.5);
  w += u_bloom * petal * 0.16;
  return R * (1.0 + w);
}

void main() {
  float m = min(u_res.x, u_res.y);
  float px = 1.0 / m;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / m;
  vec2 c = vec2(0.0, 0.085);
  vec2 q = p - c;
  float len = length(q);
  float a = atan(q.y, q.x);
  float t = u_t;

  // Paper + dots.
  vec3 col = u_bg;
  vec2 g = fract(gl_FragCoord.xy / (22.0 * u_dpr)) - 0.5;
  col = mix(col, u_ink, smoothstep(0.09, 0.05, length(g)) * 0.07);

  float R = mix(0.13, 0.255, u_size) * (1.0 + u_bloom * 0.05);
  float r = blobR(R, a, q, t);
  float d = len - r;
  vec3 glow = mix(u_col, u_col2, 0.5 + 0.5 * sin(a * 2.0 + t * 0.4));

  // Soft halo.
  float halo = exp(-max(d, 0.0) * mix(10.0, 6.0, u_bloom)) * (0.45 + 0.25 * u_size + 0.3 * u_bloom);
  col = mix(col, glow, clamp(halo, 0.0, 1.0) * mix(0.55, 0.7, u_dark));

  // Ripple rings — drift inward on inhale, outward on exhale.
  float rd = len - R;
  float ringX = rd * 6.5 - u_flow * 0.55;
  float ringD = abs(fract(ringX + 0.5) - 0.5) / 6.5 * m;
  float ring = smoothstep(1.8 * u_dpr, 0.4 * u_dpr, ringD);
  float ringFade = smoothstep(0.0, 0.05, rd) * exp(-rd * 3.2);
  col = mix(col, mix(glow, u_ink, 0.35 + 0.25 * (1.0 - u_dark)), ring * ringFade * 0.45);

  // Bokeh / drifting motes.
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float h1 = h11(fi + 1.0);
    float h2 = h11(fi * 3.1 + 7.0);
    float h3 = h11(fi * 5.7 + 2.0);
    float life = fract(h2 + u_flow * (0.06 + 0.05 * h3));
    float pa = h1 * TAU + t * 0.04 * (mod(fi, 2.0) * 2.0 - 1.0);
    float pr = R + 0.04 + life * 0.5;
    vec2 bp = c + vec2(cos(pa), sin(pa)) * pr;
    float sz = 0.007 + 0.015 * h3;
    float bd = length(p - bp);
    float fade = sin(3.14159 * life);
    float dot1 = smoothstep(sz, sz - 1.5 * px * u_dpr, bd);
    float rim = smoothstep(1.4 * u_dpr, 0.3 * u_dpr, abs(bd - sz) * m);
    col = mix(col, mix(glow, vec3(1.0), 0.35), dot1 * fade * 0.85);
    col = mix(col, u_ink, rim * fade * 0.6);
  }

  // Guide circle (full size) + phase progress arc.
  float gR = 0.318;
  float gd = abs(len - gR) * m;
  float a01 = fract(0.25 - a / TAU);
  float dash = step(0.5, fract(a01 * 60.0));
  col = mix(col, u_ink, smoothstep(1.4 * u_dpr, 0.4 * u_dpr, gd) * dash * 0.28 * (1.0 - u_bloom));
  float arc = step(a01, u_phase) * u_arc;
  col = mix(col, u_ink, smoothstep(3.2 * u_dpr, 2.0 * u_dpr, gd) * arc * 0.9);
  // Arc head knob.
  vec2 hp = c + vec2(sin(u_phase * TAU), cos(u_phase * TAU)) * gR;
  float hd = length(p - hp) * m;
  col = mix(col, u_ink, smoothstep(7.0 * u_dpr, 6.0 * u_dpr, hd) * u_arc);
  col = mix(col, u_col, smoothstep(4.5 * u_dpr, 3.5 * u_dpr, hd) * u_arc);

  // Hard offset shadow, like the rest of the UI.
  vec2 so = vec2(5.0, -5.0) * u_dpr * px;
  vec2 qs = q - so;
  float ds = length(qs) - r;
  col = mix(col, u_shadow, smoothstep(px * 1.5, -px * 1.5, ds) * 0.95);

  // Orb body.
  float inside = smoothstep(px * 1.5, -px * 1.5, d);
  float k = clamp(len / max(r, 1e-3), 0.0, 1.0);
  vec3 core = mix(vec3(1.0), u_col, 0.25);
  vec3 body = mix(core, u_col, smoothstep(0.05, 0.95, k));
  body = mix(body, u_col2, smoothstep(0.45, 1.0, k) * 0.55);
  // Slow liquid swirl inside (smooth sines, no blocky noise).
  vec2 sq = q / max(R, 1e-3) * 2.2;
  float sw = sin(sq.x * 2.3 + sin(sq.y * 1.9 + t * 0.7) * 1.6 + t * 0.45)
           * sin(sq.y * 2.1 + sin(sq.x * 1.7 - t * 0.6) * 1.6 - t * 0.35);
  body = mix(body, u_col2, smoothstep(0.2, 0.9, sw) * 0.35);
  body = mix(body, vec3(1.0), smoothstep(0.55, 1.0, -sw) * 0.18);
  // Twinkles: brighter while holding / blooming.
  float tw = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float ta = h11(fi + 20.0) * TAU + t * (0.15 + 0.1 * h11(fi + 9.0));
    vec2 tp = vec2(cos(ta), sin(ta)) * (0.2 + 0.55 * h11(fi + 31.0)) * r;
    float td = length(q - tp) * m / u_dpr;
    float blink = pow(0.5 + 0.5 * sin(t * (1.6 + h11(fi + 4.0)) + fi * 2.3), 3.0);
    vec2 dq = abs(q - tp) * m / u_dpr;
    float star = 1.0 / (1.0 + td * td * 0.25) + smoothstep(1.2, 0.0, min(dq.x, dq.y)) * smoothstep(9.0, 0.0, td) * 0.6;
    tw += star * blink;
  }
  body = mix(body, vec3(1.0), clamp(tw, 0.0, 1.0) * (0.25 + 0.6 * u_hold + 0.5 * u_bloom));
  vec2 hl = q / max(r, 1e-3) - vec2(-0.38, 0.42);
  body = mix(body, vec3(1.0), smoothstep(0.42, 0.0, length(hl * vec2(1.0, 1.4))) * 0.55);
  // Bloom: lighter heart with a pink centre.
  body = mix(body, mix(vec3(1.0), u_col2, 0.4), smoothstep(0.5, 0.0, k) * u_bloom * 0.6);
  col = mix(col, body, inside);

  // Sleepy, content little face (idle preview & finished).
  if (u_face > 0.01) {
    vec2 e = q / R;
    float lw = 2.3 * u_dpr * px / R;
    float face = 0.0;
    for (int s = 0; s < 2; s++) {
      vec2 de = e - vec2(s == 0 ? -0.33 : 0.33, 0.14);
      face = max(face, smoothstep(lw, lw * 0.35, abs(length(de) - 0.12)) * step(de.y, 0.0));
    }
    vec2 dm = e - vec2(0.0, 0.0);
    face = max(face, smoothstep(lw, lw * 0.35, abs(length(dm) - 0.18)) * step(dm.y, -0.09));
    float cheeks = smoothstep(0.12, 0.06, length((vec2(abs(e.x), e.y) - vec2(0.54, -0.05)) * vec2(1.0, 1.7)));
    col = mix(col, vec3(1.0, 0.55, 0.75), cheeks * 0.55 * u_face * inside);
    col = mix(col, vec3(0.106, 0.07, 0.21), face * u_face * inside);
  }

  // Inky outline.
  float ol = smoothstep(2.6 * u_dpr, 1.4 * u_dpr, abs(d) * m);
  col = mix(col, u_ink, ol * 0.92);

  // Paused: desaturate and sink into the paper.
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(lum), u_dim * 0.65);
  col = mix(col, u_bg, u_dim * 0.3);

  gl_FragColor = vec4(col, 1.0);
}
`;

type Pal = { main: number[]; glow: number[] };
const pal = (k: PhaseKind): Pal => ({ main: hexToRgb(PHASE_COLORS[k].main), glow: hexToRgb(PHASE_COLORS[k].glow) });
const COLORS: Record<PhaseKind, Pal> = {
  inhale: pal("inhale"),
  hold: pal("hold"),
  exhale: pal("exhale"),
  hold2: pal("hold2"),
};
const BLOOM = { main: hexToRgb("#c9a8ff"), glow: hexToRgb("#ff9fd0") };

/** Backing-store resolution: the glow doesn't need full DPR. */
const RES = 0.85;

interface Anim {
  last: number;
  t: number;
  size: number;
  hold: number;
  flow: number;
  dim: number;
  bloom: number;
  arc: number;
  face: number;
  col: number[];
  col2: number[];
}

export function BreathOrb({ timerId, preview }: { timerId: string; preview: Pattern }) {
  const anim = useRef<Anim | null>(null);

  const { ref } = useShader(
    FRAG,
    () => {
      const now = performance.now();
      const s = (anim.current ??= {
        last: now,
        t: 0,
        size: 0.3,
        hold: 0,
        flow: 0,
        dim: 0,
        bloom: 0,
        arc: 0,
        face: 1,
        col: [...COLORS.inhale.main],
        col2: [...COLORS.inhale.glow],
      });
      const dt = Math.min(0.1, (now - s.last) / 1000);
      s.last = now;

      const run = getRun(timerId);
      let kind: PhaseKind = "inhale";
      let progress = 0;
      let paused = false;
      let finished = false;
      if (run) {
        const pos = position(run);
        kind = (pos.segment.kind as PhaseKind) ?? "inhale";
        progress = pos.segProgress;
        paused = pos.paused && !run.finished;
        finished = run.finished;
      } else {
        // Idle: a slow, calm preview of the selected pattern.
        const pv = previewAt(preview, now / 1000 / 1.6);
        kind = pv.kind;
        progress = pv.progress;
      }

      const targetSize = finished ? 1 : orbSize(kind, progress);
      const holding = !finished && (kind === "hold" || kind === "hold2") ? 1 : 0;
      const flowDir = finished ? 0.25 : kind === "inhale" ? -1 : kind === "exhale" ? 1 : 0.12;
      const target = finished ? BLOOM : (COLORS[kind] ?? COLORS.inhale);

      const k = (rate: number) => 1 - Math.exp(-dt * rate);
      s.size += (targetSize - s.size) * k(finished ? 1.5 : 10);
      s.hold += (holding - s.hold) * k(4);
      s.dim += ((paused ? 1 : 0) - s.dim) * k(6);
      s.bloom += ((finished ? 1 : 0) - s.bloom) * k(1.2);
      s.arc += ((run && !finished ? 1 : 0) - s.arc) * k(8);
      s.face += ((run && !finished ? 0 : 1) - s.face) * k(8);
      for (let i = 0; i < 3; i++) {
        s.col[i] += (target.main[i] - s.col[i]) * k(2.5);
        s.col2[i] += (target.glow[i] - s.col2[i]) * k(2.5);
      }
      // The animation clock and particle flow freeze while paused.
      const live = 1 - s.dim;
      s.t += dt * live * (run ? 1 : 0.7);
      s.flow += dt * live * flowDir * (run ? 1 : 0.6);

      const dark = isDark();
      return {
        u_t: s.t,
        u_size: s.size,
        u_hold: s.hold,
        u_flow: s.flow,
        u_dim: s.dim,
        u_bloom: s.bloom,
        u_phase: run && !finished ? progress : 0,
        u_arc: s.arc > 0.5 ? 1 : 0,
        u_dark: dark ? 1 : 0,
        u_face: s.face,
        u_dpr: Math.min(2, window.devicePixelRatio || 1) * RES,
        u_col: s.col,
        u_col2: s.col2,
        u_bg: dark ? hexToRgb("#2a2236") : hexToRgb("#fbecd5"),
        u_ink: dark ? hexToRgb("#fbf1e1") : hexToRgb("#1b1424"),
        u_shadow: dark ? hexToRgb("#000000") : hexToRgb("#1b1424"),
      };
    },
    RES,
  );
  return <canvas ref={ref} aria-hidden />;
}
