import React, { useEffect, useRef, useState } from 'react';

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
}

function AnimatedCounter({
  value,
  duration = 650,
  locale = 'et-EE',
  formatOptions = { maximumFractionDigits: 0 },
}) {
  const numericValue = value === null || value === undefined ? NaN : Number(value);
  const targetValue = Number.isFinite(numericValue) ? numericValue : null;
  const [displayValue, setDisplayValue] = useState(targetValue ?? 0);
  const previousValueRef = useRef(targetValue ?? 0);

  useEffect(() => {
    if (targetValue === null) {
      return undefined;
    }

    const startValue = previousValueRef.current;
    const delta = targetValue - startValue;
    const startedAt = performance.now();
    let animationFrameId;

    function tick(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const nextValue = startValue + delta * easedProgress;

      setDisplayValue(nextValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(tick);
      } else {
        previousValueRef.current = targetValue;
        setDisplayValue(targetValue);
      }
    }

    animationFrameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrameId);
  }, [duration, targetValue]);

  if (targetValue === null) {
    return '--';
  }

  return displayValue.toLocaleString(locale, formatOptions);
}

export default AnimatedCounter;
