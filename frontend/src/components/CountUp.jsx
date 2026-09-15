import { useEffect, useState } from "react";

/**
 * Animates a number counting up from 0 to `value` when it mounts or changes.
 * Usage: <CountUp value={8} /> instead of just showing {8} directly.
 */
export default function CountUp({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = null;
    const from = 0;
    const to = Number(value) || 0;

    function step(timestamp) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // ease-out so it slows down near the end
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display}</>;
}
