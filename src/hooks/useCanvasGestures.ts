import { useState, useRef, useCallback } from "react";

export function useCanvasGestures(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const pinchStartRef = useRef(0);
  const pinchZoomStartRef = useRef(1);
  const lastTapRef = useRef(0);

  // Pan clamping
  const clampPan = useCallback((x: number, y: number) => {
    const el = containerRef.current;
    if (!el) return { x, y };
    const w = el.clientWidth * 0.3;
    const h = el.clientHeight * 0.3;
    return {
      x: Math.max(-w, Math.min(w, x)),
      y: Math.max(-h, Math.min(h, y)),
    };
  }, [containerRef]);

  // Touch handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch" || e.pointerType === "mouse") {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: panOffset.x, panY: panOffset.y };
    }
  }, [panOffset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    const clamped = clampPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy);
    setPanOffset(clamped);
  }, [isPanning, clampPan]);

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Double-tap zoom toggle
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setZoom((z) => (z === 1 ? 2 : 1));
      setPanOffset({ x: 0, y: 0 });
    }
    lastTapRef.current = now;
  }, []);

  // Pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartRef.current = Math.sqrt(dx * dx + dy * dy);
      pinchZoomStartRef.current = zoom;
    }
  }, [zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartRef.current > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / pinchStartRef.current;
      setZoom(Math.max(0.5, Math.min(3, pinchZoomStartRef.current * scale)));
    }
  }, []);

  return {
    panOffset,
    zoom,
    isPanning,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDoubleTap,
    handleTouchStart,
    handleTouchMove,
  };
}
