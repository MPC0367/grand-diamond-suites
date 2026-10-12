/* The frames of the street map, shared by the tools that fetch its data and draw it.

   NEAR   the neighbourhood around the hotel: what the page shows before its script runs, and where the map
          opens. Its bounds are the ones the site has always used to place its markers.
   FRAME  central Bangkok, five times as wide and as tall, with the same centre. The map can be moved and
          zoomed out over all of it.
   DETAIL the middle of FRAME, where the map can be zoomed in closely and buildings are drawn.

   Everything is spherical Web Mercator, north up, 4:3. */
export const rad = (d) => (d * Math.PI) / 180;
export const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2));
export const invMercY = (y) => ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;
const round7 = (n) => Math.round(n * 1e7) / 1e7;

const CENTRE_LON = 100.5355, CENTRE_LAT = 13.7504;
/* a 4:3 Mercator frame `width` degrees of longitude wide, symmetric (in Mercator) about the centre */
const frame = (width) => {
  const half = (rad(width) * 0.75) / 2;
  return { west: round7(CENTRE_LON - width / 2), east: round7(CENTRE_LON + width / 2), north: round7(invMercY(mercY(CENTRE_LAT) + half)), south: round7(invMercY(mercY(CENTRE_LAT) - half)) };
};
export const NEAR = frame(0.02);
export const FRAME = frame(0.1);
export const OPEN = 5;                 /* the map opens with NEAR filling its window: FRAME enlarged this many times */

/* Levels of the drawing. Level k draws FRAME 640 x 2^k logical pixels wide, in squares of 256 logical pixels
   (512 real ones, for sharp screens). Levels 0 to 3 cover all of FRAME; 4 and 5 cover its middle only. */
export const TILE = 256;
export const levelSize = (k) => ({ w: 640 * 2 ** k, h: 480 * 2 ** k });
const middle = (k, half) => {
  const { w, h } = levelSize(k);
  const c0 = Math.floor((w * (0.5 - half)) / TILE), c1 = Math.ceil((w * (0.5 + half)) / TILE), r0 = Math.floor((h * (0.5 - half)) / TILE), r1 = Math.ceil((h * (0.5 + half)) / TILE);
  return { k, c0, r0, cols: c1 - c0, rows: r1 - r0 };
};
const whole = (k) => { const { w, h } = levelSize(k); return { k, c0: 0, r0: 0, cols: Math.ceil(w / TILE), rows: Math.ceil(h / TILE) }; };
export const LEVELS = [whole(0), whole(1), whole(2), whole(3), middle(4, 0.225), middle(5, 0.11)];

/* longitude, latitude -> fractions of FRAME (x right, y down) */
const MX0 = rad(FRAME.west), MX1 = rad(FRAME.east), MY0 = mercY(FRAME.north), MY1 = mercY(FRAME.south);
export const toFrame = (lon, lat) => [(rad(lon) - MX0) / (MX1 - MX0), (MY0 - mercY(lat)) / (MY0 - MY1)];
export const fromFrame = (x, y) => ({ lon: ((MX0 + x * (MX1 - MX0)) * 180) / Math.PI, lat: invMercY(MY0 - y * (MY0 - MY1)) });
/* the part of FRAME that level 4 covers, with a little more: buildings are fetched for this */
const L4 = LEVELS[4], S4 = levelSize(4);
const corner = (c, r) => fromFrame((c * TILE) / S4.w, (r * TILE) / S4.h);
const nw = corner(L4.c0, L4.r0), se = corner(L4.c0 + L4.cols, L4.r0 + L4.rows);
export const DETAIL = { west: nw.lon, east: se.lon, north: nw.lat, south: se.lat };
/* ground width of FRAME in metres, at its centre latitude */
export const GROUND = 6378137 * (MX1 - MX0) * Math.cos(rad(CENTRE_LAT));
