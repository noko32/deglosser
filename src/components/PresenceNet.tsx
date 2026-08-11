"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_NET_TUNING,
  PRESENCE_SIDES,
  PRESENCE_VIRTUAL,
  distToSegment,
  polar,
  presenceSurfaceFromPath,
} from "@/lib/presence";

type Leaf = {
  ox: number;
  oy: number;
  x: number;
  y: number;
  r: number;
  r0: number;
  vx: number;
  vy: number;
};

/**
 * Ambient Net A (n-gon rings + field sway). Only on `/` and `/search`.
 * Canvas is pointer-events:none; pointer tracked on window for scroll safety.
 */
export function PresenceNet() {
  const pathname = usePathname();
  const surface = presenceSurfaceFromPath(pathname);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (surface === "none") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const { scaleNet, glassAlpha } = DEFAULT_NET_TUNING;
    const V = PRESENCE_VIRTUAL;
    const sides = PRESENCE_SIDES;
    const cx = V / 2;
    const cy = V / 2;

    const leaves: Leaf[] = [];
    for (let i = 0; i < sides; i++) {
      const [x, y] = polar(cx, cy, 165, i, sides);
      leaves.push({ ox: x, oy: y, x, y, r: 5, r0: 5, vx: 0, vy: 0 });
    }
    for (let i = 0; i < sides; i++) {
      const [x, y] = polar(cx, cy, 110, i, sides, -Math.PI / 2 + Math.PI / sides);
      leaves.push({ ox: x, oy: y, x, y, r: 4.2, r0: 4.2, vx: 0, vy: 0 });
    }
    const hub = { x: cx, y: cy, ox: cx, oy: cy, r: 12 };
    const pointer = { x: cx, y: cy, inside: false };

    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduce = reduceMq.matches;
    const onReduce = () => {
      reduce = reduceMq.matches;
    };
    reduceMq.addEventListener("change", onReduce);

    function mapPointer(clientX: number, clientY: number) {
      const nr = canvas!.getBoundingClientRect();
      if (
        clientX < nr.left ||
        clientX > nr.right ||
        clientY < nr.top ||
        clientY > nr.bottom
      ) {
        pointer.inside = false;
        return;
      }
      pointer.x = ((clientX - nr.left) / nr.width) * V;
      pointer.y = ((clientY - nr.top) / nr.height) * V;
      pointer.inside = true;
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" && e.buttons === 0 && !e.isPrimary) return;
      mapPointer(e.clientX, e.clientY);
    };
    const onDown = (e: PointerEvent) => mapPointer(e.clientX, e.clientY);
    const onUp = () => {
      pointer.inside = false;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });

    function strokeSeg(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      hot: boolean
    ) {
      ctx!.lineWidth = hot ? 2.4 : 1.25;
      ctx!.strokeStyle = hot
        ? "oklch(85% 0.08 280 / 0.55)"
        : "oklch(80% 0.05 260 / 0.26)";
      ctx!.beginPath();
      ctx!.moveTo(x1, y1);
      ctx!.lineTo(x2, y2);
      ctx!.stroke();
    }

    let raf = 0;
    let alive = true;

    function frame() {
      if (!alive) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const cssW = canvas!.clientWidth;
      const cssH = canvas!.clientHeight;
      if (cssW && cssH) {
        const bw = Math.floor(cssW * dpr);
        const bh = Math.floor(cssH * dpr);
        if (canvas!.width !== bw || canvas!.height !== bh) {
          canvas!.width = bw;
          canvas!.height = bh;
        }
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx!.clearRect(0, 0, cssW, cssH);
        ctx!.save();
        ctx!.translate(cssW / 2, cssH / 2);
        const u = Math.min(cssW / V, cssH / V) * scaleNet;
        ctx!.scale(u, u);
        ctx!.translate(-V / 2, -V / 2);
        ctx!.globalAlpha = glassAlpha;

        const px = pointer.inside ? pointer.x : cx;
        const py = pointer.inside ? pointer.y : cy;

        for (const L of leaves) {
          const dx = px - L.ox;
          const dy = py - L.oy;
          const dist = Math.hypot(dx, dy) || 1;
          const sway =
            pointer.inside && !reduce ? Math.min(16, 240 / dist) : 0;
          L.vx += (L.ox + (dx / dist) * sway * 0.55 - L.x) * 0.12;
          L.vy += (L.oy + (dy / dist) * sway * 0.55 - L.y) * 0.12;
          L.vx *= 0.78;
          L.vy *= 0.78;
          if (reduce) {
            L.x = L.ox;
            L.y = L.oy;
            L.vx = 0;
            L.vy = 0;
          } else {
            L.x += L.vx;
            L.y += L.vy;
          }
          const near = Math.hypot(px - L.x, py - L.y);
          L.r =
            L.r0 *
            (near < 44 && pointer.inside && !reduce
              ? 1.4 + (1 - near / 44) * 0.75
              : 1);
        }

        {
          const dx = px - hub.ox;
          const dy = py - hub.oy;
          const dist = Math.hypot(dx, dy) || 1;
          const sway =
            pointer.inside && !reduce ? Math.min(7, 130 / dist) : 0;
          hub.x += (hub.ox + (dx / dist) * sway * 0.4 - hub.x) * 0.15;
          hub.y += (hub.oy + (dy / dist) * sway * 0.4 - hub.y) * 0.15;
          if (reduce) {
            hub.x = hub.ox;
            hub.y = hub.oy;
          }
          hub.r =
            12 *
            (Math.hypot(px - hub.x, py - hub.y) < 52 &&
            pointer.inside &&
            !reduce
              ? 1.28
              : 1);
        }

        const outer = leaves.slice(0, sides);
        const mid = leaves.slice(sides);

        for (let i = 0; i < sides; i++) {
          const L = outer[i];
          const seg = distToSegment(px, py, hub.x, hub.y, L.x, L.y);
          const hot =
            pointer.inside &&
            !reduce &&
            seg.d < 16 &&
            seg.t > 0.06 &&
            seg.t < 0.94;
          strokeSeg(hub.x, hub.y, L.x, L.y, hot);
          if (hot) {
            ctx!.beginPath();
            ctx!.fillStyle = "oklch(90% 0.06 280 / 0.75)";
            ctx!.arc(seg.sx, seg.sy, 4.5, 0, Math.PI * 2);
            ctx!.fill();
          }
        }

        const ring = (nodes: Leaf[]) => {
          for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i];
            const b = nodes[(i + 1) % nodes.length];
            const seg = distToSegment(px, py, a.x, a.y, b.x, b.y);
            strokeSeg(
              a.x,
              a.y,
              b.x,
              b.y,
              pointer.inside && !reduce && seg.d < 14
            );
          }
        };
        ring(mid);
        ring(outer);

        for (const L of leaves) {
          const hot = L.r > L.r0 * 1.15;
          ctx!.beginPath();
          ctx!.fillStyle = hot
            ? "oklch(88% 0.08 280 / 0.55)"
            : "oklch(80% 0.06 260 / 0.32)";
          ctx!.strokeStyle = "oklch(95% 0.02 260 / 0.45)";
          ctx!.lineWidth = 1;
          ctx!.arc(L.x, L.y, L.r, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.stroke();
        }

        ctx!.beginPath();
        ctx!.fillStyle = "oklch(70% 0.1 280 / 0.4)";
        ctx!.strokeStyle = "oklch(95% 0.03 280 / 0.5)";
        ctx!.lineWidth = 1.2;
        ctx!.arc(hub.x, hub.y, hub.r, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.stroke();
        ctx!.restore();
      }
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      reduceMq.removeEventListener("change", onReduce);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [surface]);

  if (surface === "none") return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
