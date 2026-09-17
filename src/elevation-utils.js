// elevation-utils.js
//
// Raw GPS/barometric altitude readings are noisy — a flat road can show
// several feet of jitter between consecutive points. Naively summing every
// positive step between points massively inflates elevation gain.
//
// This does two things to fix that:
// 1. Smooths the altitude series with a moving average to cancel out jitter.
// 2. Uses a "baseline + threshold" approach: only counts a climb once the
//    smoothed altitude has moved meaningfully (past `threshold`) away from
//    the last baseline, rather than counting every tiny up-tick.

export function smoothedElevationGainMeters(rawAltitudes, { windowSize = 5, threshold = 1 } = {}) {
  const alts = rawAltitudes.filter((a) => a != null);
  if (alts.length < 2) return 0;

  // 1. Moving average smoothing
  const smoothed = alts.map((_, i) => {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(alts.length, i + Math.ceil(windowSize / 2));
    const window = alts.slice(start, end);
    return window.reduce((a, b) => a + b, 0) / window.length;
  });

  // 2. Baseline + threshold accumulation
  let gain = 0;
  let baseline = smoothed[0];
  for (let i = 1; i < smoothed.length; i++) {
    const diff = smoothed[i] - baseline;
    if (diff > threshold) {
      gain += diff;
      baseline = smoothed[i];
    } else if (diff < -threshold) {
      baseline = smoothed[i];
    }
  }
  return gain;
}