/* Small helpers for writing HTML as strings without a framework. */

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escape text for element content or an attribute value. */
export const e = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

/** A value that is already safe HTML and must not be escaped again. */
export class Raw {
  constructor(s) { this.s = String(s ?? ""); }
  toString() { return this.s; }
}
export const raw = (s) => new Raw(s);

/** Tagged template: interpolated strings are escaped, arrays are joined,
    Raw values and nested html`` results pass through, null and false vanish. */
export function html(strings, ...values) {
  let out = "";
  strings.forEach((str, i) => {
    out += str;
    if (i < values.length) out += render(values[i]);
  });
  return new Raw(out);
}

function render(v) {
  if (v === null || v === undefined || v === false || v === true) return "";
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(render).join("");
  return e(v);
}

/** Attribute list from an object; false, null and undefined are skipped, true prints the bare name. */
export function attrs(obj) {
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === false || v === null || v === undefined) continue;
    parts.push(v === true ? k : `${k}="${e(v)}"`);
  }
  return raw(parts.length ? " " + parts.join(" ") : "");
}

/** Join class names, skipping falsy ones. */
export const cx = (...names) => names.flat().filter(Boolean).join(" ");
