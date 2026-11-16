import { useEffect } from 'react';
import { useActivity } from '../store/activity';

const TICK_SECONDS = 15;
/** No input for this long means the learner has walked away. */
const IDLE_MS = 2 * 60 * 1000;

/**
 * Counts active study time while the calling page is mounted: the window
 * must be visible and the learner must have moved, typed or scrolled lately.
 */
export function useStudyTimer(): void {
  useEffect(() => {
    let lastInput = Date.now();
    const touch = () => {
      lastInput = Date.now();
    };
    const events = ['mousemove', 'keydown', 'wheel', 'touchstart', 'pointerdown'] as const;
    for (const name of events) window.addEventListener(name, touch, { passive: true });

    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastInput > IDLE_MS) return;
      useActivity.getState().addSeconds(TICK_SECONDS);
    }, TICK_SECONDS * 1000);

    return () => {
      clearInterval(timer);
      for (const name of events) window.removeEventListener(name, touch);
    };
  }, []);
}
