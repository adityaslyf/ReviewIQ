import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Crosshair, GitBranch, ShieldCheck, Zap } from "lucide-react";

const modes = [
  {
    name: "Logic",
    icon: GitBranch,
    color: "255, 116, 66",
    file: "retry.ts",
    code: "attempt <= maxAttempts",
    fix: "attempt < maxAttempts",
    label: "Edge case detected",
    detail: "An extra attempt. A preventable bug.",
  },
  {
    name: "Security",
    icon: ShieldCheck,
    color: "151, 194, 255",
    file: "users.ts",
    code: "query(`email = '${input}'`)",
    fix: "query('email = $1', [input])",
    label: "Input traced to query",
    detail: "One unchecked input. A real risk.",
  },
  {
    name: "Performance",
    icon: Zap,
    color: "187, 221, 133",
    file: "projects.ts",
    code: "for (project) await getOwner()",
    fix: "findMany({ include: owner })",
    label: "Repeated query detected",
    detail: "Follow the call. Find the bottleneck.",
  },
];

/** A projected wireframe torus, rendered locally without a 3D dependency. */
function CoreCanvas({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef(color);
  colorRef.current = color;
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let visible = true;
    let size = 560;
    let lastFrame = 0;
    let elapsed = 0;
    let targetX = 0;
    let targetY = 0;
    let pointerX = 0;
    let pointerY = 0;
    const project = (u: number, v: number, time: number) => {
      const radius = 1.17 + 0.44 * Math.cos(v);
      const x = radius * Math.cos(u);
      const y = radius * Math.sin(u);
      const z = 0.44 * Math.sin(v);
      const ax = 0.92 + pointerY * 0.28;
      const ay = time * 0.12 + pointerX * 0.3;
      const az = -0.35;
      const y1 = y * Math.cos(ax) - z * Math.sin(ax);
      const z1 = y * Math.sin(ax) + z * Math.cos(ax);
      const x2 = x * Math.cos(ay) + z1 * Math.sin(ay);
      const z2 = -x * Math.sin(ay) + z1 * Math.cos(ay);
      const x3 = x2 * Math.cos(az) - y1 * Math.sin(az);
      const y3 = x2 * Math.sin(az) + y1 * Math.cos(az);
      const perspective = 4.8 / (4.8 - z2);
      return {
        x: size / 2 + x3 * size * 0.223 * perspective,
        y: size / 2 + y3 * size * 0.223 * perspective,
        z: z2,
      };
    };
    const draw = (now: number) => {
      if (!visible || document.hidden) {
        frame = 0;
        return;
      }
      if (now - lastFrame < 28 && !reduced.matches) {
        frame = requestAnimationFrame(draw);
        return;
      }
      elapsed += reduced.matches ? 0 : Math.min((now - lastFrame) / 1000, 0.04);
      lastFrame = now;
      pointerX += (targetX - pointerX) * 0.04;
      pointerY += (targetY - pointerY) * 0.04;
      const time = reduced.matches ? 2 : elapsed;
      ctx.clearRect(0, 0, size, size);
      const rgb = colorRef.current;
      const glow = ctx.createRadialGradient(
        size * 0.5,
        size * 0.5,
        0,
        size * 0.5,
        size * 0.5,
        size * 0.49,
      );
      glow.addColorStop(0, `rgba(${rgb},.035)`);
      glow.addColorStop(0.52, `rgba(${rgb},.045)`);
      glow.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);
      // Fixed seeds keep the stars stable across frames and screen sizes.
      for (let i = 0; i < 75; i++) {
        const x = ((((Math.sin(i * 127.1) * 43758.54) % 1) + 1) % 1) * size;
        const y = ((((Math.sin(i * 311.7) * 22578.14) % 1) + 1) % 1) * size;
        ctx.fillStyle = `rgba(195,200,199,${0.12 + 0.18 * (0.5 + 0.5 * Math.sin(time * 0.5 + i))})`;
        ctx.fillRect(x, y, i % 9 === 0 ? 1.5 : 0.7, i % 9 === 0 ? 1.5 : 0.7);
      }
      const paths: {
        points: ReturnType<typeof project>[];
        depth: number;
        bright: boolean;
      }[] = [];
      for (let ring = 0; ring < 46; ring++) {
        const u = (ring / 46) * Math.PI * 2;
        const points = Array.from({ length: 61 }, (_, j) =>
          project(u, (j / 60) * Math.PI * 2, time),
        );
        paths.push({
          points,
          depth: points.reduce((sum, p) => sum + p.z, 0) / points.length,
          bright: ring % 11 === 0,
        });
      }
      for (let ring = 0; ring < 20; ring++) {
        const v = (ring / 20) * Math.PI * 2;
        const points = Array.from({ length: 97 }, (_, j) =>
          project((j / 96) * Math.PI * 2, v, time),
        );
        paths.push({
          points,
          depth: points.reduce((sum, p) => sum + p.z, 0) / points.length,
          bright: ring === 5,
        });
      }
      paths.sort((a, b) => a.depth - b.depth);
      for (const { points, depth, bright } of paths) {
        const alpha = Math.max(0.06, Math.min(0.66, 0.23 + depth * 0.21));
        ctx.strokeStyle = `rgba(${rgb},${bright ? Math.min(1, alpha + 0.2) : alpha})`;
        ctx.lineWidth = bright ? 1.15 : 0.65;
        ctx.beginPath();
        points.forEach((p, i) =>
          i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
        );
        ctx.stroke();
      }
      // Small luminous packets travel along the structure.
      for (let i = 0; i < 8; i++) {
        const p = project(time * 0.24 + i * 0.79, time * 0.65 + i * 2.1, time);
        if (p.z < -0.5) continue;
        ctx.shadowColor = `rgb(${rgb})`;
        ctx.shadowBlur = 12;
        ctx.fillStyle = i % 3 === 0 ? "#fff0dd" : `rgb(${rgb})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5 + (p.z + 1) * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (!reduced.matches) frame = requestAnimationFrame(draw);
      else frame = 0;
    };
    const start = () => {
      if (!frame && visible && !document.hidden)
        frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      size = canvas.getBoundingClientRect().width;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      start();
    };
    const move = (event: PointerEvent) => {
      if (reduced.matches) return;
      const rect = canvas.getBoundingClientRect();
      targetX = (event.clientX - rect.left) / rect.width - 0.5;
      targetY = (event.clientY - rect.top) / rect.height - 0.5;
    };
    const leave = () => {
      targetX = 0;
      targetY = 0;
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { rootMargin: "100px" },
    );
    const resizeObserver = new ResizeObserver(resize);
    observer.observe(canvas);
    resizeObserver.observe(canvas);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", start);
    reduced.addEventListener("change", start);
    resize();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", start);
      reduced.removeEventListener("change", start);
    };
  }, [color]);
  return (
    <canvas ref={canvasRef} className="ri-core-canvas" aria-hidden="true" />
  );
}

export function ReviewCore() {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const mode = modes[active];
  return (
    <div
      className="ri-core"
      style={{ "--core-color": mode.color } as CSSProperties}
    >
      <div className="ri-core-grid" aria-hidden="true" />
      <CoreCanvas color={mode.color} />
      <svg
        className="ri-core-orbits"
        viewBox="0 0 560 560"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="280"
          cy="280"
          r="239"
          stroke="currentColor"
          strokeDasharray="1 11"
        />
        <path
          d="M25 280h24m462 0h24M280 25v24m0 462v24"
          stroke="currentColor"
        />
        <g className="ri-core-reticle">
          <path
            d="M55 150V55h95M410 55h95v95M505 410v95h-95M150 505H55v-95"
            stroke="currentColor"
          />
          <path
            d="M55 55h26m398 0h26M55 505h26m398 0h26"
            stroke="rgb(255,116,66)"
          />
        </g>
      </svg>
      <div className="ri-core-topline">
        <span>
          <span className="ri-status-dot" /> REVIEW ENGINE
        </span>
        <span>SYS / 001</span>
      </div>
      <div className="ri-core-center" aria-hidden="true">
        <Crosshair size={18} />
        <span>LOOK CLOSER</span>
      </div>
      <div className="ri-core-file">
        <div>
          <span className="ri-core-file-icon">{`</>`}</span>
          <span>
            src / <strong>{mode.file}</strong>
          </span>
          <span className="ri-core-file-dots">•••</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            className="ri-core-diff"
            key={active}
            initial={{ opacity: 0, y: reduced ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <code>
              <span>−</span>
              {mode.code}
            </code>
            <code>
              <span>+</span>
              {mode.fix}
            </code>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="ri-core-finding">
        <span className="ri-core-check">
          <Check size={14} />
        </span>
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <strong>{mode.label}</strong>
            <span>{mode.detail}</span>
          </motion.div>
        </AnimatePresence>
        <span className="ri-core-signal">
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
      <div
        className="ri-core-controls"
        role="group"
        aria-label="Explore review layers"
      >
        {modes.map((item, i) => (
          <button
            key={item.name}
            aria-pressed={active === i}
            onClick={() => setActive(i)}
          >
            <item.icon size={12} />
            {item.name}
          </button>
        ))}
      </div>
      <div className="ri-core-bottomline">
        <span>INTERACTIVE VISUALIZATION</span>
        <span>MOVE TO EXPLORE ↗</span>
      </div>
    </div>
  );
}
