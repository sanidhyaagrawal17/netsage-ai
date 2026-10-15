import { useState, useEffect, useCallback, useRef } from 'react';

export function useDraggable(storageKey, defaultPosition = { x: 24, y: 24 }) {
  const actualKey = typeof storageKey === 'string' ? storageKey : 'netsage_floating_status_pos';
  const initialPos = typeof storageKey === 'object' && storageKey !== null 
    ? storageKey 
    : (defaultPosition || { x: 24, y: 24 });

  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return initialPos;
    try {
      const saved = localStorage.getItem(actualKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) {
          const x = Math.min(Math.max(12, parsed.x), window.innerWidth - 60);
          const y = Math.min(Math.max(12, parsed.y), window.innerHeight - 60);
          return { x, y };
        }
      }
    } catch (e) {}
    return initialPos;
  });

  const [isDragging, setIsDragging] = useState(false);
  const isMouseDownRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const latestPointerPos = useRef({ x: 0, y: 0 });
  const posRef = useRef(position);
  posRef.current = position;

  const handlePointerDown = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (['BUTTON', 'A', 'INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.target.closest('button') || e.target.closest('[data-no-drag]')) return;

    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

    const curX = Number.isFinite(posRef.current?.x) ? posRef.current.x : initialPos.x;
    const curY = Number.isFinite(posRef.current?.y) ? posRef.current.y : initialPos.y;

    isMouseDownRef.current = true;
    hasMovedRef.current = false;
    dragStartPos.current = { x: clientX, y: clientY };
    latestPointerPos.current = { x: clientX, y: clientY };
    dragOffset.current = { x: clientX - curX, y: clientY - curY };
  }, [initialPos]);

  useEffect(() => {
    let animFrame = null;

    const onPointerMove = (e) => {
      if (!isMouseDownRef.current) return;

      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

      latestPointerPos.current = { x: clientX, y: clientY };

      const dist = Math.hypot(
        clientX - dragStartPos.current.x,
        clientY - dragStartPos.current.y
      );

      // Require 6px threshold to activate drag (prevents click accidental drags)
      if (dist > 6) {
        hasMovedRef.current = true;
        setIsDragging(true);
      }

      if (!hasMovedRef.current) return;

      if (animFrame) return;
      animFrame = requestAnimationFrame(() => {
        const widgetElement = document.getElementById('floating-status-widget');
        const width = widgetElement ? widgetElement.offsetWidth : 200;
        const height = widgetElement ? widgetElement.offsetHeight : 50;

        const maxX = Math.max(0, window.innerWidth - width - 12);
        const maxY = Math.max(0, window.innerHeight - height - 12);

        const newX = Math.min(Math.max(12, latestPointerPos.current.x - dragOffset.current.x), maxX);
        const newY = Math.min(Math.max(12, latestPointerPos.current.y - dragOffset.current.y), maxY);

        posRef.current = { x: newX, y: newY };
        setPosition({ x: newX, y: newY });
        animFrame = null;
      });
    };

    const onPointerUp = () => {
      if (!isMouseDownRef.current) return;
      isMouseDownRef.current = false;
      setIsDragging(false);

      if (animFrame) {
        cancelAnimationFrame(animFrame);
        animFrame = null;
      }

      if (hasMovedRef.current) {
        try {
          localStorage.setItem(actualKey, JSON.stringify(posRef.current));
        } catch (e) {}
      }
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, [actualKey]);

  useEffect(() => {
    const handleResize = () => {
      const widgetElement = document.getElementById('floating-status-widget');
      const width = widgetElement ? widgetElement.offsetWidth : 200;
      const height = widgetElement ? widgetElement.offsetHeight : 50;

      const maxX = Math.max(0, window.innerWidth - width - 12);
      const maxY = Math.max(0, window.innerHeight - height - 12);

      setPosition(prev => {
        const curX = Number.isFinite(prev?.x) ? prev.x : initialPos.x;
        const curY = Number.isFinite(prev?.y) ? prev.y : initialPos.y;
        const clamped = {
          x: Math.min(Math.max(12, curX), maxX),
          y: Math.min(Math.max(12, curY), maxY)
        };
        posRef.current = clamped;
        return clamped;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initialPos]);

  const wasDragged = useCallback(() => hasMovedRef.current, []);

  return { position, setPosition, handlePointerDown, isDragging, wasDragged };
}
