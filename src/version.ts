// Injected at build time from package.json (see vite.config.ts).
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

/** "4.0.0" → "V4", "4.1.0" → "V4.1", "4.1.2" → "V4.1.2" */
export const APP_VERSION = `V${__APP_VERSION__.replace(/(\.0)+$/, '')}`;

/** Build time in local time, e.g. "2026-10-01 23:40". */
export const BUILD_TIME = (() => {
  const d = new Date(__BUILD_TIME__);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
})();
