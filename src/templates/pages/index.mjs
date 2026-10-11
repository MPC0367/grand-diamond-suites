/* The site's routes, in one list. Each entry is built once per language. */
import { suiteList } from "../../data/suites.mjs";
import { homeDef } from "./home.mjs";
import { suitesDef, suiteDef, compareDef } from "./suites.mjs";
import { diningDef, facilitiesDef, locationDef, galleryDef } from "./hotel.mjs";
import { offersDef, contactDef, faqDef, privacyDef, termsDef, notFound, rootPage } from "./help.mjs";

export function pageList() {
  return [
    homeDef,
    suitesDef,
    ...suiteList.map((s) => suiteDef(s)),
    compareDef,
    diningDef,
    facilitiesDef,
    locationDef,
    galleryDef,
    offersDef,
    contactDef,
    faqDef,
    privacyDef,
    termsDef,
  ];
}

export { notFound, rootPage };
