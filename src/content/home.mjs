/* Home page wording, English and Thai. Facts come from src/data; this file
   only frames them. Third person throughout: the concept does not speak as
   the hotel. */
export const home = {
  title: { en: "Suites in Pratunam, Bangkok", th: "ห้องสวีทย่านประตูน้ำ กรุงเทพฯ" },
  description: {
    en: "Grand Diamond Suites Hotel is an all-suite hotel on Phetchaburi Road, Bangkok, beside Platinum Fashion Mall. Compare six suite types, from {minArea} to about {maxArea} sq m.",
    th: "โรงแรมแกรนด์ไดมอนด์สวีทเป็นโรงแรมห้องสวีทบนถนนเพชรบุรี กรุงเทพฯ ติดแพลทินัม แฟชั่นมอลล์ เปรียบเทียบห้องสวีท 6 แบบ ขนาด {minArea} ถึงประมาณ {maxArea} ตร.ม.",
  },

  hero: {
    eyebrow: { en: "Pratunam, Bangkok", th: "ประตูน้ำ กรุงเทพฯ" },
    /* <em> marks the accent word; in Thai it is coloured, not slanted */
    /* the page's heading, for screen readers and search: the photograph speaks for itself on screen */
    title: { en: "Grand Diamond Suites Hotel, Pratunam", th: "โรงแรมแกรนด์ไดมอนด์สวีท ประตูน้ำ" },
    sub: {
      en: "Six kinds of suite, right next to Platinum Fashion Mall.",
      th: "ห้องสวีท 6 แบบ ติดกับแพลทินัม แฟชั่นมอลล์",
    },
    explore: { en: "Explore suites", th: "ดูห้องสวีท" },
    street: { en: "Phetchaburi Road", th: "ถนนเพชรบุรี" },
    compare: { en: "Compare the six suites", th: "เปรียบเทียบห้องสวีททั้ง 6 แบบ" },
    slides: [
      { photo: "luxury-suite-bed-sofa-city-window", suite: "luxury-suite" },
      { photo: "penthouse-suite-terrace-skyline", suite: "penthouse-suite" },
      { photo: "hotel-pool-and-tower", suite: null, name: { en: "Facilities", th: "สิ่งอำนวยความสะดวก" } },
    ],
  },

  /* the phone's home page: everything beyond the suites is a card that opens its own page */
  hub: {
    kicker: { en: "At a glance", th: "โดยสรุป" },
    lede: { en: "{suiteCount} suites in six types on Phetchaburi Road, next to Platinum Fashion Mall.", th: "ห้องสวีท {suiteCount} ห้อง 6 แบบ บนถนนเพชรบุรี ติดแพลทินัม แฟชั่นมอลล์" },
    title: { en: "Explore Grand Diamond", th: "สำรวจแกรนด์ไดมอนด์สวีท" },
    rates: {
      k: { en: "Rates", th: "ราคา" },
      head: { en: "Rates and offers", th: "ราคาและข้อเสนอ" },
      sub: { en: "Prices for your dates come from the hotel's booking page.", th: "ราคาตามวันที่เข้าพักมาจากหน้าจองของโรงแรม" },
      go: { en: "How it works", th: "ดูรายละเอียด" },
    },
    cards: [
      { path: "location/", map: true, name: { en: "Location", th: "ที่ตั้ง" }, sub: { en: "Phetchaburi Road, by Platinum", th: "ถนนเพชรบุรี ติดแพลทินัม" } },
      { path: "dining/", photo: "ploy-restaurant-dining-room", name: { en: "Dining", th: "ห้องอาหาร" }, sub: { en: "Ploy Restaurant, breakfast from 06:00", th: "ห้องอาหารพลอย อาหารเช้าตั้งแต่ 06:00 น." } },
      { path: "facilities/", photo: "hotel-pool-and-tower", name: { en: "Facilities", th: "สิ่งอำนวยความสะดวก" }, sub: { en: "Pool, gym and meeting rooms", th: "สระว่ายน้ำ ฟิตเนส ห้องประชุม" } },
      { path: "gallery/", photo: "penthouse-suite-terrace-skyline", name: { en: "Gallery", th: "แกลเลอรี" }, sub: { en: "All the hotel's photos", th: "ภาพทั้งหมดของโรงแรม" } },
      { path: "suites/compare/", photo: "family-suite-three-beds-city-windows", name: { en: "Compare suites", th: "เปรียบเทียบห้องสวีท" }, sub: { en: "All six side by side", th: "เทียบทั้ง 6 แบบ" } },
      { path: "faq/", photo: "hotel-towers-at-night", name: { en: "Questions", th: "คำถามที่พบบ่อย" }, sub: { en: "Breakfast, parking, children", th: "อาหารเช้า ที่จอดรถ และเด็ก" } },
      { path: "contact/", photo: "hotel-entrance", name: { en: "Contact", th: "ติดต่อ" }, sub: { en: "Phone, email and enquiries", th: "โทรศัพท์ อีเมล และสอบถาม" } },
    ],
  },
  reasons: {
    heading: { en: "Three reasons to stay", th: "สามเหตุผลที่ควรเลือกพักที่นี่" },
    items: [
      {
        key: { en: "{suiteCount}", th: "{suiteCount}" },
        word: { en: "suites", th: "ห้อง" },
        unit: { en: "six types", th: "ห้องสวีท 6 แบบ" },
        text: {
          en: "From a compact Luxury Suite of {minArea} square metres to a top-floor Penthouse of about {maxArea}, each with the essentials listed for every suite.",
          th: "ตั้งแต่ลักชัวรีสวีทขนาดกะทัดรัด {minArea} ตารางเมตร ไปจนถึงเพ\u2060นท์\u2060เฮาส์ชั้นบนสุดขนาดประมาณ {maxArea} ตารางเมตร ทุกห้องมีสิ่งอำนวยความสะดวกพื้นฐานครบตามที่โรงแรมระบุ",
        },
        link: { en: "Find your space", th: "เลือกห้องที่ใช่" }, href: "#find-your-space",
      },
      {
        key: { en: "Pratunam", th: "ประตูน้ำ" },
        unit: { en: "on Phetchaburi Road", th: "บนถนนเพชรบุรี" },
        text: {
          en: "Platinum Fashion Mall is next door. The hotel puts Pratunam Market a few minutes' walk away, and CentralWorld and Siam Paragon a 10 to 15 minute walk or a short BTS ride.",
          th: "แพลทินัม แฟชั่นมอลล์อยู่ติดกับโรงแรม โรงแรมระบุว่าตลาดประตูน้ำเดินถึงได้ในไม่กี่นาที ส่วนเซ็นทรัลเวิลด์และสยามพารากอนเดิน 10 ถึง 15 นาที หรือนั่งรถไฟฟ้า BTS ไม่นาน",
        },
        link: { en: "Your Bangkok address", th: "ที่พักของคุณในกรุงเทพฯ" }, href: "#address",
      },
      {
        key: { en: "{bfOpens}", th: "{bfOpens}" },
        unit: { en: "breakfast begins", th: "เริ่มให้บริการอาหารเช้า" },
        text: {
          en: "Ploy Restaurant serves a breakfast buffet until {bfCloses}, then an à la carte menu until {alcCloses}. An outdoor pool and a fitness centre are on site.",
          th: "ร้านอาหารพลอยให้บริการบุฟเฟต์อาหารเช้าถึง {bfCloses} น. ต่อด้วยเมนูตามสั่งถึง {alcCloses} น. ภายในโรงแรมมีสระว่ายน้ำกลางแจ้งและฟิตเนส",
        },
        link: { en: "Dining and facilities", th: "ห้องอาหารและสิ่งอำนวยความสะดวก" }, href: "#ploy",
      },
    ],
  },

  finder: {
    eyebrow: { en: "Suites", th: "ห้องสวีท" },
    title: { en: "Find your <em>space.</em>", th: "เลือก<em>ห้องที่ใช่</em>" },
    lead: {
      en: "Compare the layouts, features and room types before choosing your stay.",
      th: "เปรียบเทียบผังห้อง จุดเด่น และประเภทห้อง ก่อนเลือกห้องสำหรับการเข้าพัก",
    },
    compare: { en: "Compare all six side by side", th: "เปรียบเทียบทั้ง 6 แบบ" },
    aside: {
      en: "Suite names are styles, not sizes: the Luxury Suite is smaller than the Junior Suite.",
      th: "ชื่อห้องบอกรูปแบบ ไม่ได้บอกขนาด ลักชัวรีสวีทมีขนาดเล็กกว่าจู\u2060เนียร์สวีท",
    },
  },

  band: {
    photo: "penthouse-suite-terrace-skyline",
    title: { en: "The skyline, from a terrace of your own.", th: "เส้นขอบฟ้ากรุงเทพฯ จากเทอร์เรซส่วนตัว" },
    noteHead: { en: "Penthouse Suite", th: "เพนท์เฮาส์สวีท" },
    note: {
      en: "The private terrace on the top floor. Outdoor space is listed for two suites only: the Penthouse has a terrace and the Executive Suite a balcony.",
      th: "เทอร์เรซส่วนตัวบนชั้นบนสุด โรงแรมระบุพื้นที่กลางแจ้งไว้เพียงสองแบบ คือเทอร์เรซของเพนท์เฮาส์สวีท และระเบียงของเอ็กเซ็กคูทีฟสวีท",
    },
    link: { en: "See the Penthouse Suite", th: "ดูเพนท์เฮาส์สวีท" },
  },

  address: {
    eyebrow: { en: "Location", th: "ทำเลที่ตั้ง" },
    title: { en: "Your Bangkok <em>address.</em>", th: "ที่พักของคุณ<em>ในกรุงเทพฯ</em>" },
    lead: {
      en: "The hotel stands on Phetchaburi Road in Pratunam, beside Platinum Fashion Mall. It names Ratchathewi BTS station and Ratchaprarop Airport Rail Link station as the stations nearby.",
      th: "โรงแรมตั้งอยู่บนถนนเพชรบุรี ย่านประตูน้ำ ติดแพลทินัม แฟชั่นมอลล์ โรงแรมระบุว่าอยู่ใกล้สถานี BTS ราชเทวี และสถานีแอร์พอร์ต เรล ลิงก์ ราชปรารภ",
    },
    explore: { en: "Explore the neighbourhood", th: "สำรวจย่านรอบโรงแรม" },
    nearHead: { en: "Close by", th: "สถานที่ใกล้เคียง" },
  },

  ploy: {
    eyebrow: { en: "Dining", th: "ห้องอาหาร" },
    title: { en: "Ploy Restaurant", th: "ร้านอาหารพลอย" },
    lead: {
      en: "The hotel's restaurant serves Thai and international dishes, starting with an international breakfast buffet.",
      th: "ห้องอาหารของโรงแรม ให้บริการอาหารไทยและอาหารนานาชาติ เริ่มต้นวันด้วยบุฟเฟต์อาหารเช้านานาชาติ",
    },
    hoursCaption: { en: "Opening times", th: "เวลาให้บริการ" },
    lastOrder: { en: "Last order {t}", th: "รับออร์เดอร์สุดท้าย {t} น." },
    breakfast: {
      en: "Is breakfast included? The hotel's website does not say. Each rate on the booking page lists what it includes, so check the rate you choose.",
      th: "ราคาห้องรวมอาหารเช้าหรือไม่ เว็บไซต์ของโรงแรมไม่ได้ระบุไว้ แต่ละราคาในหน้าจองจะแสดงสิ่งที่รวมอยู่ในราคา จึงควรตรวจสอบราคาที่เลือก",
    },
    link: { en: "Dining details", th: "รายละเอียดห้องอาหาร" },
  },

  facilities: {
    eyebrow: { en: "Facilities", th: "สิ่งอำนวยความสะดวก" },
    title: { en: "A pool in the middle of the city.", th: "สระว่ายน้ำใจกลางเมือง" },
    lead: {
      en: "An outdoor pool and a fitness centre, with the day-to-day services a longer stay needs.",
      th: "สระว่ายน้ำกลางแจ้งและฟิตเนส พร้อมบริการประจำวันที่จำเป็นสำหรับการเข้าพักระยะยาว",
    },
    link: { en: "All facilities", th: "สิ่งอำนวยความสะดวกทั้งหมด" },
  },

  gallery: {
    eyebrow: { en: "Gallery", th: "แกลเลอรี" },
    title: { en: "Look around.", th: "ชมภาพโรงแรม" },
    lead: { en: "Photographs from the hotel's own website, each labelled with what it shows.", th: "ภาพถ่ายจากเว็บไซต์ของโรงแรม พร้อมคำบรรยายสิ่งที่อยู่ในภาพ" },
    link: { en: "Open the gallery", th: "เปิดแกลเลอรี" },
    photos: ["deluxe-suite-bathtub-city-view", "penthouse-suite-terrace-whirlpool", "family-suite-three-beds-city-windows", "executive-suite-living-dining-windows", "junior-suite-living-room", "penthouse-suite-living-room-double-height", "hotel-pool-and-tower", "hotel-entrance"],
  },

  essentials: {
    eyebrow: { en: "Before you book", th: "ก่อนจองห้องพัก" },
    title: { en: "The essentials.", th: "เรื่องที่ควรรู้" },
    lead: { en: "Short answers, with the hotel's own wording where it has published one.", th: "คำตอบสั้น ๆ โดยใช้ถ้อยคำของโรงแรมในส่วนที่โรงแรมเผยแพร่ไว้" },
    link: { en: "All questions", th: "คำถามทั้งหมด" },
    ids: ["where-book", "breakfast", "children", "which-suite", "parking", "airport", "accessibility"],
  },

  closing: {
    title: { en: "Make room for <em>Bangkok.</em>", th: "ห้องกว้าง พักสบาย<br><em>ใจกลางกรุงเทพฯ</em>" },
    text: {
      en: "Choose your dates and suite on the hotel's official booking page, or ask the hotel a question first.",
      th: "เลือกวันเข้าพักและห้องสวีทได้ที่หน้าจองทางการของโรงแรม หรือสอบถามโรงแรมก่อนตัดสินใจ",
    },
    contact: { en: "Contact the hotel", th: "ติดต่อโรงแรม" },
    photo: "hotel-towers-at-night",
  },
};
