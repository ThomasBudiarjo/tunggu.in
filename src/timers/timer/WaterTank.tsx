import { useShader, hexToRgb } from "../../core/canvas";
import { position } from "../../core/engine";
import { getRun } from "../../core/runs";
import { isDark } from "../../core/settings";

/**
 * A tank of water that drains as time runs out. Waves calm down while
 * paused; the tank flashes when it hits empty.
 */
const FRAG = /* glsl */ `
uniform float u_level;
uniform float u_calm;
uniform float u_alarm;
uniform float u_dpr;
uniform vec3 u_water;
uniform vec3 u_bg;
uniform vec3 u_ink;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  float t = u_time;

  // Dotted paper background.
  vec2 g = fract(gl_FragCoord.xy / (22.0 * u_dpr)) - 0.5;
  vec3 col = mix(u_bg, u_ink, smoothstep(0.09, 0.05, length(g)) * 0.08);

  float amp = mix(0.022, 0.005, u_calm);
  float wave = sin(uv.x * 7.0 + t * 1.9) * amp
             + sin(uv.x * 15.0 - t * 2.7) * amp * 0.45
             + sin(uv.x * 3.0 + t * 0.6) * amp * 0.9;
  float surf = u_level * 1.02 - 0.01 + wave;

  if (uv.y < surf) {
    float depth = surf - uv.y;
    vec3 w = mix(u_water * 1.08, u_water * 0.62, clamp(depth * 1.4, 0.0, 1.0));

    // Caustic shimmer.
    vec2 c = vec2(uv.x * aspect, uv.y) * 7.0;
    float ca = sin(c.x + sin(c.y * 1.3 + t) * 1.4 + t * 0.7) * sin(c.y * 1.1 + sin(c.x * 0.8 - t * 0.5) * 1.2);
    w += smoothstep(0.55, 1.0, ca) * 0.13;

    // Foam band right under the surface.
    w = mix(w, vec3(1.0), smoothstep(0.035, 0.0, depth) * 0.35);

    // Rising bubbles.
    vec2 p = vec2(uv.x * aspect, uv.y);
    for (int i = 0; i < 14; i++) {
      float fi = float(i);
      float speed = 0.04 + hash(fi * 2.1) * 0.09;
      float y = fract(hash(fi * 3.7) + t * speed * (1.0 - u_calm * 0.8)) * max(surf, 0.0);
      vec2 bp = vec2(hash(fi * 1.3) * aspect + sin(t * 1.7 + fi) * 0.015, y);
      float r = 0.007 + hash(fi * 5.9) * 0.014;
      float d = length(p - bp);
      float ring = smoothstep(r, r * 0.7, d) - smoothstep(r * 0.6, r * 0.3, d) * 0.6;
      w = mix(w, vec3(1.0), ring * 0.55);
    }
    col = w;
  }

  // Inky waterline.
  float line = 1.0 - smoothstep(1.5 * u_dpr, 2.5 * u_dpr, abs(gl_FragCoord.y - surf * u_res.y));
  col = mix(col, u_ink, line * step(0.001, u_level));

  // Empty! flash.
  col = mix(col, u_water, u_alarm * (0.35 + 0.35 * sin(t * 12.0)));
  gl_FragColor = vec4(col, 1.0);
}
`;

export function WaterTank({ timerId, color }: { timerId: string; color: string }) {
  const water = hexToRgb(color);
  const { ref } = useShader(FRAG, () => {
    const run = getRun(timerId);
    const dark = isDark();
    let level = 1;
    let calm = 1;
    let alarm = 0;
    if (run) {
      const pos = position(run);
      level = pos.totalDuration > 0 ? pos.totalRemaining / pos.totalDuration : 0;
      calm = pos.paused ? 1 : 0;
      alarm = run.finished ? 1 : 0;
    }
    return {
      u_level: level,
      u_calm: calm,
      u_alarm: alarm,
      u_dpr: Math.min(2, window.devicePixelRatio || 1),
      u_water: water,
      u_bg: dark ? hexToRgb("#2a2236") : hexToRgb("#fbecd5"),
      u_ink: dark ? hexToRgb("#fbf1e1") : hexToRgb("#1b1424"),
    };
  });
  return <canvas ref={ref} aria-hidden />;
}
