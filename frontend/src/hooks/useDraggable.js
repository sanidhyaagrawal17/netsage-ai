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
          // Verify bounds so it's not off-screen
          const x = Math.min(Math.max(10, parsed.x), window.innerWidth - 60);
          const y = Math.min(Math.max(10, parsed.y), window.innerHeight - 60);
          return { x, y };
        }
      }
    } catch (e) {}
    return initialPos;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (['BUTTON', 'A', 'INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.target.closest('button') || e.target.closest('[data-no-drag]')) return;

    let clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    let clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

    const curX = Number.isFinite(position?.x) ? position.x : initialPos.x;
    const curY = Number.isFinite(position?.y) ? position.y : initialPos.y;

    dragStartPos.current = { x: clientX, y: clientY };
    hasMoved.current = false;

    dragOffset.current = {
      x: clientX - curX,
      y: clientY - curY
    };
    setIsDragging(true);
  }, [position, initialPos]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return;

    let clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    let clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    if (
      Math.abs(clientX - dragStartPos.current.x) > 4 ||
      Math.abs(clientY - dragStartPos.current.y) > 4
    ) {
      hasMoved.current = true;
    }

    let newX = clientX - dragOffset.current.x;
    let newY = clientY - dragOffset.current.y;

    const widgetElement = document.getElementById('floating-status-widget');
    const width = widgetElement ? widgetElement.offsetWidth : 200;
    const height = widgetElement ? widgetElement.offsetHeight : 50;

    const maxX = Math.max(0, window.innerWidth - width - 12);
    const maxY = Math.max(0, window.innerHeight - height - 12);

    newX = Math.min(Math.max(12, newX), maxX);
    newY = Math.min(Math.max(12, newY), maxY);

    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      window.addEventListener('mousemove', handlePointerMove, { passive: false });
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchend', handlePointerUp);
    } else {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
      try {
        localStorage.setItem(storageKey, JSON.stringify(position));
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp, position, storageKey]);

  useEffect(() => {
    const handleResize = () => {
      const widgetElement = document.getElementById('floating-status-widget');
      const width = widgetElement ? widgetElement.offsetWidth : 200;
      const height = widgetElement ? widgetElement.offsetHeight : 50;

      const maxX = Math.max(0, window.innerWidth - width - 12);
      const maxY = Math.max(0, window.innerHeight - height - 12);

      setPosition(prev => ({
        x: Math.min(Math.max(12, prev.x), maxX),
        y: Math.min(Math.max(12, prev.y), maxY)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { position, handlePointerDown, isDragging, hasMoved: () => hasMoved.current };
}
