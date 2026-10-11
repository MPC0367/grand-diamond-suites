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

  languages: ["en", "th"],
  defaultLanguage: "en",

  /* The day the hotel's own website and booking page were last read for the facts shown. */
  factsChecked: "2026-10-08",

  studio: { name: "O2 Design Studio", url: "https://o2-designstudio.com/" },
};

export function assertConfig() {
  if (config.mode !== "production") return;
  if (!config.origin) throw new Error("Production build needs SITE_ORIGIN (the approved domain, scheme and host only).");
  if (/github\.io/i.test(config.origin)) throw new Error("Production metadata is refused for a github.io address. Use the hotel's approved domain.");
  if (!/^https:\/\/[^/]+$/.test(config.origin)) throw new Error("SITE_ORIGIN must be https://host with no path or trailing slash.");
}
