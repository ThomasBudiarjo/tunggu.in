import { useEffect, useRef } from "react";

export interface Frame {
  /** Backing-store size in device pixels (already scaled by dpr * resolution). */
  width: number;
  height: number;
  /** CSS size of the element. */
  cssWidth: number;
  cssHeight: number;
  /** Pixels per CSS pixel in the backing store. */
  scale: number;
  /** Seconds since the loop started. */
  time: number;
  /** Seconds since the previous frame (clamped to 0.1). */
  dt: number;
  frame: number;
}

export interface CanvasOptions {
  /**
   * Backing-store resolution relative to CSS pixels. 1 = crisp at device
   * pixel ratio; use e.g. `0.2` + `pixelated` for chunky pixel art.
   */
  resolution?: number;
  /** Upscale with nearest-neighbour (image-rendering: pixelated). */
  pixelated?: boolean;
  /** Fixed backing size, e.g. `{ width: 96, height: 64 }` for pixel sims. */
  fixed?: { width: number; height: number };
}

/**
 * Sets up a 2D canvas that fills its parent, handles DPR/resizing and runs
 * `draw` every animation frame. Pauses automatically when off-screen or when
 * the tab is hidden. `draw` may change between renders; the latest is used.
 *
 *   const ref = useCanvas((ctx, f) => { ctx.fillRect(0, 0, f.width, f.height) });
 *   return <canvas ref={ref} className="h-full w-full" />;
 */
export function useCanvas(
  draw: (ctx: CanvasRenderingContext2D, frame: Frame) => void,
  options: CanvasOptions = {},
) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const { resolution = 1, pixelated = false, fixed } = options;
  const fixedW = fixed?.width;
  const fixedH = fixed?.height;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (pixelated) {
      canvas.style.imageRendering = "pixelated";
      ctx.imageSmoothingEnabled = false;
    }
    const size = { cssWidth: 1, cssHeight: 1, scale: 1 };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      size.cssWidth = Math.max(1, rect.width);
      size.cssHeight = Math.max(1, rect.height);
      if (fixedW && fixedH) {
        canvas.width = fixedW;
        canvas.height = fixedH;
        size.scale = fixedW / size.cssWidth;
      } else {
        size.scale = Math.min(2, window.devicePixelRatio || 1) * resolution;
        canvas.width = Math.max(1, Math.round(size.cssWidth * size.scale));
        canvas.height = Math.max(1, Math.round(size.cssHeight * size.scale));
      }
      if (pixelated) ctx.imageSmoothingEnabled = false;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);

    let raf = 0;
    let last = performance.now();
    const t0 = last;
    let frame = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!visible || document.hidden) return;
      drawRef.current(ctx, {
        width: canvas.width,
        height: canvas.height,
        cssWidth: size.cssWidth,
        cssHeight: size.cssHeight,
        scale: size.scale,
        time: (now - t0) / 1000,
        dt,
        frame: frame++,
      });
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [resolution, pixelated, fixedW, fixedH]);

  return ref;
}

export type Uniforms = Record<string, number | readonly number[]>;

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

/**
 * Full-screen fragment shader on a WebGL canvas. The shader receives
 * `uniform vec2 u_res; uniform float u_time;` plus whatever `uniforms()`
 * returns each frame (floats or vec2/3/4 arrays). Returns `{ ref, ok }`
 * where `ok.current` is false if WebGL is unavailable — render a fallback.
 *
 *   const { ref } = useShader(FRAG, () => ({ u_progress: pos.progress }));
 */
export function useShader(fragment: string, uniforms: () => Uniforms = () => ({}), resolution = 1) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const ok = useRef(true);
  const uniformsRef = useRef(uniforms);
  uniformsRef.current = uniforms;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false });
    if (!gl) {
      ok.current = false;
      return;
    }
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh));
      }
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, `precision highp float;\nuniform vec2 u_res;\nuniform float u_time;\n${fragment}`));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      ok.current = false;
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const locs = new Map<string, WebGLUniformLocation | null>();
    const uloc = (name: string) => {
      if (!locs.has(name)) locs.set(name, gl.getUniformLocation(prog, name));
      return locs.get(name)!;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const s = Math.min(2, window.devicePixelRatio || 1) * resolution;
      canvas.width = Math.max(1, Math.round(rect.width * s));
      canvas.height = Math.max(1, Math.round(rect.height * s));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);

    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      gl.uniform2f(uloc("u_res"), canvas.width, canvas.height);
      gl.uniform1f(uloc("u_time"), (now - t0) / 1000);
      for (const [name, v] of Object.entries(uniformsRef.current())) {
        const l = uloc(name);
        if (!l) continue;
        if (typeof v === "number") gl.uniform1f(l, v);
        else if (v.length === 2) gl.uniform2f(l, v[0], v[1]);
        else if (v.length === 3) gl.uniform3f(l, v[0], v[1], v[2]);
        else if (v.length === 4) gl.uniform4f(l, v[0], v[1], v[2], v[3]);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      // No loseContext(): StrictMode remounts reuse this same canvas/context.
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
  }, [fragment, resolution]);

  return { ref, ok };
}

/** "#ff5a36" → [1, 0.35, 0.21] for shader uniforms. */
export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Read a CSS custom property, e.g. cssVar("--ink"). */
export function cssVar(name: string, el: Element = document.documentElement) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
