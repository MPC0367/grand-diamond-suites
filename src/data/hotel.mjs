/* The hotel's own published details. Every value here was read from the
   hotel's official website or its booking page on the date in `checked`,
   and nothing has been confirmed by the hotel for this concept.

   Rules for this file:
   - a value the hotel has not published is null, never a guess;
   - text shown to guests exists in English and Thai;
   - each group names its source so the claim can be re-checked. */

export const SOURCES = {
  home: { label: "Official website, home page", url: "https://www.granddiamondsuites.com/" },
  rooms: { label: "Official website, rooms page", url: "https://www.granddiamondsuites.com/rooms" },
  facilities: { label: "Official website, facilities page", url: "https://www.granddiamondsuites.com/facilites" },
  offers: { label: "Official website, offers page", url: "https://www.granddiamondsuites.com/offers" },
  attractions: { label: "Official website, attractions page", url: "https://www.granddiamondsuites.com/attractions" },
  contact: { label: "Official website, contact page", url: "https://www.granddiamondsuites.com/contact" },
  booking: { label: "Official booking page", url: "https://www.granddiamondsuites.com/booking" },
};

export const hotel = {
  checked: "2026-10-08",

  name: { en: "Grand Diamond Suites Hotel", th: "โรงแรมแกรนด์ไดมอนด์สวีท" },
  shortName: { en: "Grand Diamond Suites", th: "แกรนด์ไดมอนด์สวีท" },
  city: { en: "Bangkok", th: "กรุงเทพฯ" },
  district: { en: "Pratunam, Bangkok", th: "ประตูน้ำ กรุงเทพฯ" },

  /* "a 4-star all-suite hotel" is the hotel's own description (home page). */
  positioning: { en: "A four-star all-suite hotel", th: "โรงแรมห้องสวีทระดับ 4 ดาว", source: "home" },

  /* "Our 176 well-appointed suites" (rooms page). */
  suiteCount: { value: 176, source: "rooms" },

  phone: { display: "+66 2 656 6888", href: "tel:+6626566888", source: "home" },
  email: { address: "reservation@granddiamondsuites.com", source: "home" },

  /* The footer of the official site prints the street numbers as
     "888/1,13-19 425-610". They are reproduced as printed; how they should
     be punctuated is a question for the hotel. */
  address: {
    en: ["888/1,13-19 425-610 Phetchaburi Road", "Thanon Phetchaburi, Ratchathewi", "Bangkok 10400, Thailand"],
    th: ["888/1,13-19 425-610 ถนนเพชรบุรี", "แขวงถนนเพชรบุรี เขตราชเทวี", "กรุงเทพฯ 10400"],
    oneLine: {
      en: "888/1,13-19 425-610 Phetchaburi Road, Thanon Phetchaburi, Ratchathewi, Bangkok 10400, Thailand",
      th: "888/1,13-19 425-610 ถนนเพชรบุรี แขวงถนนเพชรบุรี เขตราชเทวี กรุงเทพฯ 10400",
    },
    source: "home",
  },

  /* From the map embedded on the hotel's own contact page. */
  coords: { lat: 13.7504126, lon: 100.5385094, source: "contact" },

  links: {
    official: { en: "https://www.granddiamondsuites.com/", th: "https://www.granddiamondsuites.com/th" },
    /* the hotel's own short link to its map listing, taken from its website */
    mapListing: "https://maps.app.goo.gl/bX8JxTQznPXdLs2g8",
    /* directions to the coordinates above; no place identifier is assumed */
    directions: "https://www.google.com/maps/dir/?api=1&destination=13.7504126%2C100.5385094",
    facebook: "https://www.facebook.com/GrandDiamondSuitesHotels/",
    instagram: "https://www.instagram.com/granddiamondsuites/",
    line: "https://lin.ee/rByLxCc",
    officialOffers: { en: "https://www.granddiamondsuites.com/offers", th: "https://www.granddiamondsuites.com/th/offers" },
  },

  /* Booking is completed on the hotel's own booking page, which embeds the
     Exely Booking Engine. The provider documents these address parameters
     (exely.com/help/351067): date (YYYY-MM-DD), nights, adults, and
     children-age (ages separated by semicolons). Read-only checks on
     2026-10-08 showed the booking page displaying each of them as passed:
     dates across a year end, same-day arrival, 1 to 6 adults, 30 nights,
     and one to three children by age. Nothing else is passed. Room types
     need the hotel's own room identifiers, which are not known, so the
     suite is chosen on the booking page.

     Read-only checks on 2026-10-12 (kept in _private/booking-probe, l to u)
     set the limits below. They are what the booking page displayed for the
     requests tried, not a rule the hotel has stated:
     - 31 nights: dates shown, rooms listed. 60 and 90 nights: "There is a
       maximum stay of 31 nights for the selected dates", no rooms listed.
     - 8 adults: shown as 8 adults, in English and in Thai. 9 adults: shown
       as 8 adults, so the page lowers the number without saying so.
     - 8 guests in total: 5 adults and 3 children were all shown; 6 adults
       and 3 children were shown as "6 adults, 2 children"; 8 adults and one
       child as "8 adults". Past 8 in total the page drops guests silently,
       so this site never sends such a request and offers other routes. */
  booking: {
    page: { en: "https://www.granddiamondsuites.com/booking", th: "https://www.granddiamondsuites.com/th/booking" },
    allowedHost: "www.granddiamondsuites.com",
    params: { date: "date", nights: "nights", adults: "adults", childrenAge: "children-age" },
    maxAdults: 8,
    maxChildren: 3,
    maxChildAge: 17,
    /* adults and children together, in one search */
    maxGuests: 8,
    maxNights: 31,
    provider: "Exely Booking Engine",
    providerDocs: "https://exely.com/help/351067/",
    verified: "2026-10-12",
  },

  /* Shared room amenities: "All suites include" (rooms page). */
  inEverySuite: [
    { en: "Free high-speed Wi-Fi", th: "Wi-Fi ความเร็วสูง ไม่มีค่าใช้จ่าย" },
    { en: "Air conditioning", th: "เครื่องปรับอากาศ" },
    { en: "Satellite television", th: "โทรทัศน์ช่องดาวเทียม" },
    { en: "Minibar and refrigerator", th: "มินิบาร์และตู้เย็น" },
    { en: "In-room safe", th: "ตู้นิรภัยในห้อง" },
    { en: "Hairdryer and toiletries", th: "ไดร์เป่าผมและของใช้ในห้องน้ำ" },
    { en: "Daily housekeeping", th: "บริการทำความสะอาดห้องทุกวัน" },
  ],

  /* Ploy Restaurant. Hours as printed on the home and offers pages. The
     facilities page also mentions dinner; no dinner hours are published, so
     none are shown. */
  dining: {
    name: { en: "Ploy Restaurant", th: "ร้านอาหารพลอย" },
    cuisine: { en: "Thai and international dishes", th: "อาหารไทยและอาหารนานาชาติ", source: "facilities" },
    services: [
      {
        key: "breakfast",
        name: { en: "Breakfast buffet", th: "บุฟเฟต์อาหารเช้า" },
        note: { en: "International buffet", th: "บุฟเฟต์นานาชาติ" },
        opens: "06:00", closes: "10:30", lastOrder: null, source: "home",
      },
      {
        key: "alacarte",
        name: { en: "À la carte menu", th: "เมนูตามสั่ง (à la carte)" },
        note: { en: "Served daily", th: "ให้บริการทุกวัน" },
        opens: "11:00", closes: "15:00", lastOrder: "14:00", source: "home",
      },
    ],
    roomService: { available: true, hours: null, source: "facilities" },
    dinner: { mentioned: true, hours: null, source: "facilities" },
    breakfastIncluded: null,
    menuUrl: null,
    /* Practical details a diner asks about. Each is null ("Not listed") until the hotel supplies it; then
       it is written as { en, th, source, checked } and appears on the dining page in both languages. */
    practical: { menu: null, breakfastPrice: null, location: null, reservations: null, nonGuests: null },
  },

  /* Facilities named on the official facilities page. Hours, charges, floor
     and access rules are not published there, so none are stated. */
  facilities: [
    {
      key: "pool", icon: "pool", lead: true,
      name: { en: "Outdoor swimming pool", th: "สระว่ายน้ำกลางแจ้ง" },
      text: {
        en: "Open-air pool with loungers, under frangipani and palms.",
        th: "สระกลางแจ้ง มีเก้าอี้อาบแดด ร่มรื่นด้วยลีลาวดีและต้นปาล์ม",
      },
    },
    {
      key: "fitness", icon: "fitness", lead: true,
      name: { en: "Fitness centre", th: "ฟิตเนส" },
      text: {
        en: "Cardio and weight machines.",
        th: "เครื่องคาร์ดิโอและเครื่องเวท",
      },
    },
    {
      key: "dining", icon: "dining",
      name: { en: "Ploy Restaurant and room service", th: "ร้านอาหารพลอยและรูมเซอร์วิส" },
      text: {
        en: "Thai and international food, in the restaurant or your room.",
        th: "อาหารไทยและนานาชาติ ทานที่ร้านหรือสั่งขึ้นห้อง",
      },
    },
    {
      key: "meetings", icon: "meeting",
      name: { en: "Meeting facilities", th: "ห้องประชุม" },
      text: {
        en: "Meeting rooms. Ask the hotel about sizes and layouts.",
        th: "ห้องประชุม สอบถามขนาดและการจัดห้องกับโรงแรม",
      },
    },
    {
      key: "frontdesk", icon: "desk",
      name: { en: "24-hour front desk and concierge", th: "แผนกต้อนรับและคอนเซียร์จตลอด 24 ชั่วโมง" },
      text: null,
    },
    { key: "housekeeping", icon: "housekeeping", name: { en: "Daily housekeeping", th: "บริการทำความสะอาดห้องทุกวัน" }, text: null },
    { key: "laundry", icon: "laundry", name: { en: "Laundry service", th: "บริการซักรีด" }, text: null },
    { key: "wifi", icon: "wifi", name: { en: "Free Wi-Fi throughout the hotel", th: "Wi-Fi ฟรีทั่วทั้งโรงแรม" }, text: null },
    { key: "parking", icon: "parking", name: { en: "On-site parking", th: "ที่จอดรถภายในโรงแรม" }, text: null },
  ],

  /* The hotel's own statement on its home page. No certificate, level or
     year has been seen, so it is reported as the hotel's statement. */
  greenHotel: {
    stated: true,
    issuer: { en: "Department of Climate Change and Environment", th: "กรมการเปลี่ยนแปลงสภาพภูมิอากาศและสิ่งแวดล้อม" },
    source: "home",
  },

  /* Shown on the booking page next to the room list (not on the website itself). */
  bookingPageNotes: {
    childrenUnder7Free: true,
    smokingJunior: true,
    parkingListedAs: "Free indoor parking",
    /* shown in the "My booking" summary of the booking page: "from 14:00" and "till 12:00" */
    checkIn: "14:00",
    checkOut: "12:00",
  },
};
