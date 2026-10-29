import { raw } from "../lib/html.mjs";

/* Line icons drawn for this site: information graphics, 24 px grid, 1.6 stroke. */
const P = {
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  down: '<path d="M12 4v15M6 13l6 6 6-6"/>',
  up: '<path d="M12 20V5M6 11l6-6 6 6"/>',
  out: '<path d="M7 17L17 7M9 7h8v8"/>',
  chev: '<path d="M5 9l7 7 7-7"/>',
  close: '<path d="M5 5l14 14M19 5L5 19"/>',
  prev: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5z"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="1.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  pool: '<path d="M3 18c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1M3 14c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1"/><path d="M8 11V5.5a2 2 0 0 1 4 0M14 11V5.5a2 2 0 0 1 4 0M8 8.5h6"/>',
  fitness: '<path d="M3 12h2M19 12h2M5 8v8M8 6v12M16 6v12M19 8v8M8 12h8"/>',
  dining: '<path d="M7 3v7a2 2 0 0 0 2 2v9M5 3v5M9 3v5M16 21v-8h-2c0-5 1-9 3-10v18"/>',
  meeting: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8M7 9h6M7 12h10"/>',
  desk: '<path d="M4 20h16M6 20v-5a6 6 0 0 1 12 0v5M12 9V6M9.5 6h5"/>',
  housekeeping: '<path d="M4 20h16M6 20l1-8h10l1 8M9 12V8a3 3 0 0 1 6 0v4"/>',
  laundry: '<rect x="4.5" y="3" width="15" height="18" rx="1.5"/><circle cx="12" cy="13.5" r="4"/><path d="M8 6.5h2M13 6.5h3"/>',
  wifi: '<path d="M3 9a13.5 13.5 0 0 1 18 0M6 12.5a9 9 0 0 1 12 0M9 16a4.5 4.5 0 0 1 6 0"/><circle cx="12" cy="19" r=".8" fill="currentColor"/>',
  parking: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M9.5 17V7h3.2a3 3 0 0 1 0 6H9.5"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-12 14M5 19l7-7"/>',
  bed: '<path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5a1.5 1.5 0 1 0 0-.01"/>',
  area: '<path d="M4 4h16v16H4zM4 9h3M4 14h3M9 20v-3M14 20v-3"/>',
  train: '<rect x="6" y="3" width="12" height="14" rx="2.5"/><path d="M6 11h12M9 20l-2 2M15 20l2 2M9.5 14h.01M14.5 14h.01"/>',
  plane: '<path d="M10.5 13.5L3 11l1.5-1.5 7 1L16 6c1.5-1.5 3.5-2 4.5-1.5.5 1-.0 3-1.5 4.5l-4.5 4.5 1 7L14 22l-2.5-7.5L8 18v2.5l-1.5 1L5.5 18.5 2.5 17.5l1-1.5H6z"/>',
  walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M9 21l2.5-6-2-2.5L11 8l3 2.5 3 1M11 8l-3 1.5-1 3.5M13 14l2.5 2.5L16 21"/>',
  /* the three kinds of place on the neighbourhood map */
  /* shopping is a cart: a bag with a handle, at this size, reads as a padlock */
  cart: '<path d="M3 4.5h2.6l2.3 10h9.4l2-7.5H6.6"/><circle cx="9.2" cy="18.6" r="1.5"/><circle cx="16.3" cy="18.6" r="1.5"/>',
  landmark: '<path d="M3.5 9.5L12 4l8.5 5.5zM6.5 9.5V17M10.2 9.5V17M13.8 9.5V17M17.5 9.5V17M5 17h14M3.5 20h17"/>',
  /* map controls */
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
};

/* which icon stands for which kind of place: on the pins, in the lists and on the filter chips */
export const KIND_ICON = { shopping: "cart", transport: "train", culture: "landmark" };

export function icon(name, cls = "") {
  const body = P[name];
  if (!body) throw new Error("Unknown icon: " + name);
  return raw(`<svg class="i-${name}${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`);
}

/* The studio's own mark, as used on every O2 build. */
export const O2_MARK_PATH = "M56.99 99.51A50 50 0 0 1 33.88 2.67L38 10.97A40.84 40.84 0 0 0 52.65 90.75ZM42.27 0.6A50 50 0 0 1 66.45 97.22L62.34 88.93A40.84 40.84 0 0 0 46.59 9.31ZM157.94 74.78L148.9 74.77C147.72 72.56 147.05 70.73 145.23 68.89C138.08 61.67 125.49 63.06 119.44 70.92L118.43 72.68C116.33 76.4 116.59 78.85 116.23 82.89C113.81 83.15 109.39 83.26 107.04 82.84C106.96 80.45 106.94 77.98 107.43 75.63C109.72 64.58 119.41 55.88 130.73 55.04C140.97 54.28 151.46 58.93 156.12 68.39C157.1 70.38 158.02 72.54 157.94 74.78ZM148.84 83.59C151.04 83.14 155.75 83.23 158.04 83.51C157.97 85.63 157.24 87.64 156.34 89.53C153.35 95.79 148.24 98.9 142.26 101.9C137.63 104.22 133.19 106.96 128.53 109.23C126.42 110.25 120.74 112.92 119.24 114.34C116.45 116.97 117.29 117.47 116.13 119.2L114.32 121.49C112.04 121.8 109.41 121.77 107.13 121.51C106.19 114 111.68 108.04 117.74 104.62C124.34 100.89 131.24 97.68 137.85 93.97C143.08 91.03 146.6 89.67 148.84 83.59ZM121.53 120.51C124.54 119.99 135.15 120.36 138.93 120.36C142.92 120.36 154.81 119.99 157.91 120.49L157.85 129.51C154.88 129.77 151.82 129.6 148.83 129.59L135.02 129.59C130.67 129.59 119.91 129.95 116.29 129.48C117.52 126.27 119.99 123.58 121.53 120.51Z";
