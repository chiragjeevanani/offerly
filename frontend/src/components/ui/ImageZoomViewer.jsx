import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Full-screen photo viewer with pinch / double-tap / wheel zoom, drag to pan and
// swipe between photos. The app disables browser pinch-zoom globally (main.jsx,
// viewport meta), so the gestures are handled here with pointer events.
// The phone's back button closes it (it pushes a history entry while open).
const ImageZoomViewer = ({ images, startIndex = 0, alt = '', onClose }) => {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const stageRef = useRef(null);
  const imgRef = useRef(null);
  const view = useRef({ scale: 1, x: 0, y: 0 });
  const gesture = useRef({ pointers: new Map(), mode: null, lastTap: null });
  const count = images.length;

  const apply = useCallback((animate = false, swipeX = 0) => {
    const img = imgRef.current;
    if (!img) return;
    const { scale, x, y } = view.current;
    img.style.transition = animate ? 'transform 0.25s ease-out' : 'none';
    img.style.transform = `translate3d(${x + swipeX}px, ${y}px, 0) scale(${scale})`;
    setZoomed(scale > 1.01);
  }, []);

  // How far the zoomed picture can move before its edge leaves the screen edge.
  const bounded = (scale, x, y) => {
    const stage = stageRef.current;
    const img = imgRef.current;
    if (!stage || !img) return { scale, x: 0, y: 0 };
    const vw = stage.clientWidth;
    const vh = stage.clientHeight;
    const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : vw / vh;
    const w = Math.min(vw, vh * ratio);
    const h = w / ratio;
    const maxX = Math.max(0, (w * scale - vw) / 2);
    const maxY = Math.max(0, (h * scale - vh) / 2);
    return { scale, x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  };

  // Zoom to `next`, keeping the point under (px, py) - page coords - where it is.
  const zoomAt = (next, px, py, base = view.current) => {
    const rect = stageRef.current.getBoundingClientRect();
    const cx = px - rect.left - rect.width / 2;
    const cy = py - rect.top - rect.height / 2;
    const scale = clamp(next, 1, MAX_SCALE);
    const ox = (cx - base.x) / base.scale;
    const oy = (cy - base.y) / base.scale;
    return bounded(scale, cx - ox * scale, cy - oy * scale);
  };

  const reset = (animate) => {
    view.current = { scale: 1, x: 0, y: 0 };
    apply(animate);
  };

  const go = (dir) => {
    if (count < 2) return;
    setIndex((i) => (i + dir + count) % count);
  };

  // New photo starts un-zoomed.
  useLayoutEffect(() => {
    view.current = { scale: 1, x: 0, y: 0 };
    apply(false);
  }, [index, apply]);

  // Back button closes; body doesn't scroll underneath.
  useEffect(() => {
    if (!window.history.state?.imageViewer) {
      window.history.pushState({ ...(window.history.state || {}), imageViewer: true }, '');
    }
    const onPop = () => onClose();
    const onKey = (e) => {
      if (e.key === 'Escape') window.history.back();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  // Wheel / trackpad zoom on desktop (non-passive so the page doesn't scroll).
  useEffect(() => {
    const stage = stageRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      view.current = zoomAt(view.current.scale * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
      apply(false);
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apply]);

  const startPan = (p) => {
    const g = gesture.current;
    g.mode = 'pan';
    g.startX = p.x;
    g.startY = p.y;
    g.base = { ...view.current };
    g.moved = false;
    g.startTime = Date.now();
  };

  const onPointerDown = (e) => {
    const g = gesture.current;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()];
      g.mode = 'pinch';
      g.startDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      g.base = { ...view.current };
      g.moved = true;
    } else if (g.pointers.size === 1) {
      startPan({ x: e.clientX, y: e.clientY });
    }
  };

  const onPointerMove = (e) => {
    const g = gesture.current;
    if (!g.pointers.has(e.pointerId)) return;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (g.mode === 'pinch' && g.pointers.size >= 2) {
      const [a, b] = [...g.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      view.current = zoomAt(g.base.scale * (dist / g.startDist), (a.x + b.x) / 2, (a.y + b.y) / 2, g.base);
      apply(false);
      return;
    }
    if (g.mode !== 'pan') return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) g.moved = true;
    if (g.base.scale > 1.01) {
      view.current = bounded(g.base.scale, g.base.x + dx, g.base.y + dy);
      apply(false);
    } else if (count > 1) {
      apply(false, dx); // drag the photo sideways to hint the swipe
    }
  };

  const onPointerUp = (e) => {
    const g = gesture.current;
    if (!g.pointers.has(e.pointerId)) return;
    g.pointers.delete(e.pointerId);

    if (g.mode === 'pinch') {
      // Lifting one finger of a pinch carries on as a pan with the other.
      if (g.pointers.size === 1) {
        const [p] = [...g.pointers.values()];
        startPan(p);
        g.moved = true;
      } else {
        g.mode = null;
        if (view.current.scale <= 1.01) reset(true);
      }
      return;
    }
    if (g.mode !== 'pan' || g.pointers.size > 0) return;
    g.mode = null;
    const dx = e.clientX - g.startX;

    if (!g.moved && Date.now() - g.startTime < 300) {
      const now = Date.now();
      const last = g.lastTap;
      if (last && now - last.t < 300 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30) {
        g.lastTap = null;
        if (view.current.scale > 1.01) {
          reset(true);
        } else {
          view.current = zoomAt(DOUBLE_TAP_SCALE, e.clientX, e.clientY);
          apply(true);
        }
      } else {
        g.lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
      return;
    }
    if (g.base.scale <= 1.01) {
      if (count > 1 && Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
      else apply(true);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black flex flex-col select-none" role="dialog" aria-modal="true" aria-label="Photo viewer">
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-3 pt-[max(12px,env(safe-area-inset-top))] pb-3 bg-gradient-to-b from-black/60 to-transparent">
        {count > 1 ? (
          <span className="text-white text-sm font-semibold px-3 py-1 rounded-full bg-black/55">{index + 1} / {count}</span>
        ) : (
          <span />
        )}
        <button
          type="button"
          aria-label="Close photo"
          onClick={() => window.history.back()}
          className="w-10 h-10 rounded-full bg-black/55 text-white flex items-center justify-center active:scale-95"
        >
          <CloseRoundedIcon />
        </button>
      </div>

      <div
        ref={stageRef}
        className="relative flex-1 overflow-hidden"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          ref={imgRef}
          key={images[index]}
          src={images[index]}
          alt={alt}
          draggable="false"
          onLoad={() => apply(false)}
          className="absolute inset-0 w-full h-full object-contain will-change-transform"
          style={{ transformOrigin: 'center center' }}
        />
      </div>

      {count > 1 && !zoomed && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 text-white hidden sm:flex items-center justify-center"
          >
            <ChevronLeftRoundedIcon />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 text-white hidden sm:flex items-center justify-center"
          >
            <ChevronRightRoundedIcon />
          </button>
        </>
      )}

      <p className="absolute bottom-0 inset-x-0 flex justify-center pb-[max(16px,env(safe-area-inset-bottom))] pointer-events-none">
        <span className="text-white text-xs px-3 py-1 rounded-full bg-black/55">
          {zoomed ? 'Double-tap to zoom out' : 'Pinch or double-tap to zoom'}
        </span>
      </p>
    </div>,
    document.body,
  );
};

export default ImageZoomViewer;
