/* The verification list.

   Every material fact that the hotel publishes in two forms that disagree, or does not
   publish at all, and that only the hotel can settle.

   `flag` is a short note printed right beside the fact it qualifies, on the suite page, in
   the suite selector and in the comparison table, in both languages. A guest sees the doubt
   where the decision is made, not in a footnote.

   status   "conflicting"  two of the hotel's own sources disagree (or a photograph and a list)
            "unknown"      nothing is published
            "published"    published once, shown with its source, not confirmed by the hotel
            "confirmed"    the hotel has answered in writing (none yet)
   When the hotel answers: correct the fact in suites.mjs or hotel.mjs, set status to
   "confirmed" and remove `flag`. The note disappears from every page and language in one
   build. Never mark an item confirmed on public evidence alone.

   subject  a suite slug, or "hotel"
   field    the fact concerned; for a suite it matches a row of the specification list
   checked  the day the sources were last read

   The studio's working notes on each item (what each source says, the question to put to the
   hotel, who is to answer and who reviewed the answer) are kept outside this repository. When
   that file is present, the build checks it against this list and writes the open questions
   out in full. */

export const verification = [
  /* ---------------- Luxury Suite ---------------- */
  { id: "luxury-area", subject: "luxury-suite", field: "area", status: "conflicting", checked: "2026-10-08",
    flag: { en: "The booking page lists 34 sq m", th: "หน้าจองระบุ 34 ตร.ม." } },
  { id: "luxury-plus", subject: "luxury-suite", field: "occupancy", status: "conflicting", checked: "2026-10-08",
    flag: { en: "The booking page also lists Luxury Plus, for up to 4", th: "หน้าจองยังมี Luxury Plus สำหรับสูงสุด 4 ท่าน" } },
  { id: "luxury-bath", subject: "luxury-suite", field: "bathrooms", status: "conflicting", checked: "2026-10-08",
    flag: { en: "A photograph shows a bathtub as well", th: "ภาพถ่ายมีอ่างอาบน้ำด้วย" } },
  { id: "luxury-living", subject: "luxury-suite", field: "living", status: "conflicting", checked: "2026-10-08",
    flag: { en: "The photographs show the sofa in the bedroom", th: "ในภาพถ่าย โซฟาอยู่ในห้องเดียวกับเตียง" } },

  /* ---------------- Family Suite ---------------- */
  { id: "family-living", subject: "family-suite", field: "living", status: "conflicting", checked: "2026-10-08",
    flag: { en: "The photographs show an armchair and a small table", th: "ในภาพถ่ายเป็นเก้าอี้เท้าแขนและโต๊ะตัวเล็ก" } },
  { id: "family-bedrooms", subject: "family-suite", field: "bedrooms", status: "unknown", checked: "2026-10-08" },
  { id: "family-occupancy", subject: "family-suite", field: "occupancy", status: "conflicting", checked: "2026-10-08" },

  /* ---------------- Junior Suite ---------------- */
  { id: "junior-kitchen", subject: "junior-suite", field: "kitchen", status: "conflicting", checked: "2026-10-08",
    flag: { en: "Some photographs show a kitchenette", th: "ภาพถ่ายบางภาพมีครัวขนาดเล็ก" } },
  { id: "junior-variants", subject: "junior-suite", field: "variants", status: "published", checked: "2026-10-08" },

  /* ---------------- Deluxe and Executive ---------------- */
  { id: "deluxe-bath", subject: "deluxe-suite", field: "bathrooms", status: "conflicting", checked: "2026-10-08" },
  { id: "two-bedroom-occupancy", subject: "deluxe-suite", field: "occupancy", status: "published", checked: "2026-10-08" },

  /* ---------------- Penthouse Suite ---------------- */
  { id: "penthouse-area", subject: "penthouse-suite", field: "area", status: "conflicting", checked: "2026-10-08",
    flag: { en: "The booking page lists 200 sq m", th: "หน้าจองระบุ 200 ตร.ม." } },
  { id: "penthouse-beds", subject: "penthouse-suite", field: "beds", status: "conflicting", checked: "2026-10-08",
    flag: { en: "One bedroom is pictured with two single beds", th: "ภาพถ่ายห้องนอนหนึ่งห้องเป็นเตียงเดี่ยว 2 เตียง" } },
  { id: "penthouse-outdoor", subject: "penthouse-suite", field: "outdoor", status: "conflicting", checked: "2026-10-08",
    flag: { en: "Photographs also show an outdoor whirlpool tub", th: "ภาพถ่ายมีอ่างน้ำวนกลางแจ้งด้วย" } },
  { id: "penthouse-levels", subject: "penthouse-suite", field: "living", status: "conflicting", checked: "2026-10-08",
    flag: { en: "The photographs show a suite on two levels", th: "ภาพถ่ายแสดงห้องสวีทสองชั้น" } },

  /* ---------------- The hotel ---------------- */
  { id: "address", subject: "hotel", field: "address", status: "conflicting", checked: "2026-10-08" },
  { id: "entrance-name", subject: "hotel", field: "name", status: "conflicting", checked: "2026-10-08" },
  { id: "policies", subject: "hotel", field: "policies", status: "unknown", checked: "2026-10-08" },
  { id: "breakfast", subject: "hotel", field: "breakfast", status: "unknown", checked: "2026-10-08" },
  { id: "dining-details", subject: "hotel", field: "dining", status: "unknown", checked: "2026-10-08" },
  { id: "facility-hours", subject: "hotel", field: "facilities", status: "unknown", checked: "2026-10-08" },
  { id: "access", subject: "hotel", field: "accessibility", status: "unknown", checked: "2026-10-08" },
  { id: "offers", subject: "hotel", field: "offers", status: "unknown", checked: "2026-10-08" },
  { id: "booking-limits", subject: "hotel", field: "booking", status: "published", checked: "2026-10-12" },
  { id: "photo-rights", subject: "hotel", field: "photographs", status: "unknown", checked: "2026-10-08" },
  { id: "thai-copy", subject: "hotel", field: "language", status: "unknown", checked: "2026-10-12" },
];

/** The short note to print beside a suite's fact, or null. */
export function flagFor(slug, field) {
  const v = verification.find((x) => x.subject === slug && x.field === field && x.flag && x.status !== "confirmed");
  return v ? v.flag : null;
}
