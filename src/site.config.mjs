/* One place for how the site is built and where it lives.

   mode "preview"    : an unofficial O2 concept. Every page carries the concept
                       notice, asks search engines not to index it, and prints no
                       canonical address or structured data.
   mode "production" : only for a hotel-approved launch on the hotel's own domain.
                       The build refuses it while the origin is missing or is a
                       github.io address. */
export const config = {
  mode: process.env.SITE_MODE === "production" ? "production" : "preview",

  /* Path the site is served under. GitHub Pages project sites live in a folder. */
  basePath: process.env.SITE_BASE || "/grand-diamond-suites/",

  /* Scheme and host only, no path. Used for canonicals and the sitemap in production. */
  origin: process.env.SITE_ORIGIN || "",

  /* Preview only: where the concept is hosted, so a shared link can show the sharing image that says
     in words that this is an unofficial concept. It sets nothing else: no canonical, no indexing.
     Set SITE_SHARE_ORIGIN to an empty string to leave the image out. */
  shareOrigin: process.env.SITE_SHARE_ORIGIN ?? "https://mpc0367.github.io",

  languages: ["en", "th"],
  defaultLanguage: "en",

  /* The day the hotel's own website and booking page were last read for the facts shown. */
  factsChecked: "2026-10-08",

  studio: { name: "O2 Design Studio", url: "https://o2-designstudio.com/" },

  /* The neighbourhood map. Its street view is this site's own drawing of OpenStreetMap data and is served
     with the page. Its satellite view is the one part of the site that comes from somewhere else: the
     images are fetched from the service below, by the visitor's browser, and only after the visitor has
     chosen "Satellite". Nothing is asked of that service before then, and the choice is not remembered.

     The service is Esri's World Imagery. Esri asks anyone using its maps to register and keep to its
     terms (a free ArcGIS Location Platform account covers two million map tiles). That registration is
     the studio's to make before this view is put in front of the public. With an account, put its API
     key in SITE_MAP_TOKEN and it is added to each request; the address below works without one.
     Set SITE_MAP_SATELLITE=off to build the site without the satellite view at all. */
  map: {
    satellite: {
      on: process.env.SITE_MAP_SATELLITE !== "off",
      /* {z} zoom, {y} row, {x} column, as the service orders them */
      url: process.env.SITE_MAP_TILES || "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      token: process.env.SITE_MAP_TOKEN || "",
      minZoom: 12,
      maxZoom: 18,
      provider: "Esri",
      /* the service's own credit line, read from its metadata on 2026-10-12 */
      credit: { en: "Imagery: Esri, Vantor, Earthstar Geographics, and the GIS User Community", th: "ภาพถ่ายดาวเทียม: Esri, Vantor, Earthstar Geographics และ GIS User Community" },
      creditHref: "https://www.esri.com/",
    },
  },
};

export function assertConfig() {
  if (config.mode !== "production") return;
  if (!config.origin) throw new Error("Production build needs SITE_ORIGIN (the approved domain, scheme and host only).");
  if (/github\.io/i.test(config.origin)) throw new Error("Production metadata is refused for a github.io address. Use the hotel's approved domain.");
  if (!/^https:\/\/[^/]+$/.test(config.origin)) throw new Error("SITE_ORIGIN must be https://host with no path or trailing slash.");
}
