/* Places shown on the neighbourhood map and in "Close by".

   Position: every coordinate was read from OpenStreetMap on 2026-10-08 (the
   `osm` field names the object). None was placed by eye. The site draws each
   pin from its coordinate and works out the distance from the hotel's own
   coordinate at build time, as a straight line. No walking time is computed
   or claimed: where the hotel itself gives one, it is quoted as the hotel's
   wording in `hotelSays`.

   Wording: `what` says only what the source supports. `source` names where
   the description comes from when it is not the hotel's attractions page. */

export const PLACES_CHECKED = "2026-10-08";

export const places = [
  /* ---------------- shopping ---------------- */
  {
    id: "platinum", kind: "shopping", lat: 13.7500065, lon: 100.5393912, osm: "way/31141613",
    name: { en: "Platinum Fashion Mall", th: "แพลทินัม แฟชั่นมอลล์" },
    what: {
      en: "A fashion mall of small shops selling clothing and accessories, retail and wholesale. Its building stands beside the hotel on Phetchaburi Road.",
      th: "ศูนย์การค้าแฟชั่นที่รวมร้านเสื้อผ้าและเครื่องประดับ ทั้งขายปลีกและขายส่ง อาคารอยู่ติดกับโรงแรมบนถนนเพชรบุรี",
    },
    hotelSays: { en: "Just next door to the hotel.", th: "อยู่ติดกับโรงแรม" },
  },
  {
    id: "phenix", kind: "shopping", lat: 13.7504134, lon: 100.5372772, osm: "way/31141565",
    name: { en: "Phenix, the former Pantip Plaza", th: "ฟีนิกซ์ (พันธุ์ทิพย์พลาซ่าเดิม)" },
    what: {
      en: "The building many visitors still know as Pantip Plaza. Its operator reopened it in June 2024 under the name Phenix, with food wholesale and a food lounge. The hotel's own website still uses the old name.",
      th: "อาคารที่หลายคนยังรู้จักในชื่อพันธุ์ทิพย์พลาซ่า ผู้ดำเนินการเปิดให้บริการอีกครั้งในเดือนมิถุนายน 2024 ภายใต้ชื่อฟีนิกซ์ โดยเป็นศูนย์ค้าส่งอาหารและฟู้ดเลานจ์ ส่วนเว็บไซต์ของโรงแรมยังใช้ชื่อเดิม",
    },
    hotelSays: null,
    source: { en: "Asset World Corporation press release, 26 June 2024", th: "ข่าวประชาสัมพันธ์ของ Asset World Corporation วันที่ 26 มิถุนายน 2024" },
  },
  {
    id: "pratunam-market", kind: "shopping", lat: 13.7522704, lon: 100.5405377, osm: "way/1363612934",
    name: { en: "Pratunam Market", th: "ตลาดประตูน้ำ" },
    what: {
      en: "A local market area. The hotel describes fashion stalls and street food vendors.",
      th: "ย่านตลาดท้องถิ่น โรงแรมบรรยายว่ามีแผงขายสินค้าแฟชั่นและร้านอาหารริมทาง",
    },
    hotelSays: { en: "A few minutes' walk from the hotel.", th: "ห่างจากโรงแรมเพียงไม่กี่นาทีโดยการเดิน" },
  },
  {
    id: "centralworld", kind: "shopping", lat: 13.7465769, lon: 100.5390414, osm: "way/157482067",
    name: { en: "CentralWorld", th: "เซ็นทรัลเวิลด์" },
    what: {
      en: "A large shopping centre at Ratchaprasong. The hotel mentions designer brands, restaurants, cinemas and family entertainment here and at Siam Paragon.",
      th: "ศูนย์การค้าขนาดใหญ่ย่านราชประสงค์ โรงแรมกล่าวถึงแบรนด์ดีไซเนอร์ ร้านอาหาร โรงภาพยนตร์ และความบันเทิงสำหรับครอบครัว ทั้งที่นี่และที่สยามพารากอน",
    },
    hotelSays: { en: "Only a 10 to 15 minute walk or a quick BTS ride away.", th: "เดินเพียง 10 ถึง 15 นาที หรือโดยสารรถไฟฟ้า BTS ไม่นาน" },
  },
  {
    id: "siam-paragon", kind: "shopping", lat: 13.7467785, lon: 100.534954, osm: "way/781138575",
    name: { en: "Siam Paragon", th: "สยามพารากอน" },
    what: {
      en: "A shopping centre on Rama I Road in Pathum Wan.",
      th: "ศูนย์การค้าบนถนนพระรามที่ 1 เขตปทุมวัน",
    },
    hotelSays: { en: "Only a 10 to 15 minute walk or a quick BTS ride away.", th: "เดินเพียง 10 ถึง 15 นาที หรือโดยสารรถไฟฟ้า BTS ไม่นาน" },
    source: { en: "Address from OpenStreetMap", th: "ที่อยู่จาก OpenStreetMap" },
  },

  /* ---------------- transport ---------------- */
  {
    id: "ratchaprarop", kind: "transport", lat: 13.7551065, lon: 100.5421238, osm: "node/6711026524",
    name: { en: "Ratchaprarop station, Airport Rail Link", th: "สถานีราชปรารภ แอร์พอร์ต เรล ลิงก์" },
    what: {
      en: "The Airport Rail Link station the hotel names. Trains run between Suvarnabhumi Airport and Phaya Thai, and this is the stop before Phaya Thai.",
      th: "สถานีแอร์พอร์ต เรล ลิงก์ที่โรงแรมกล่าวถึง รถไฟให้บริการระหว่างสนามบินสุวรรณภูมิกับพญาไท โดยสถานีนี้อยู่ก่อนถึงพญาไทหนึ่งสถานี",
    },
    hotelSays: { en: "Conveniently located near Ratchathewi BTS Station and Ratchaprarop Airport Rail Link.", th: "ตั้งอยู่ในทำเลสะดวก ใกล้สถานีรถไฟฟ้า BTS ราชเทวีและรถไฟฟ้าแอร์พอร์ตลิงค์ราชปรารภ" },
  },
  {
    id: "siam", kind: "transport", lat: 13.7456236, lon: 100.5342199, osm: "node/1692209237",
    name: { en: "Siam station, BTS", th: "สถานีสยาม รถไฟฟ้า BTS" },
    what: {
      en: "The interchange between the BTS Sukhumvit and Silom lines.",
      th: "สถานีเชื่อมต่อระหว่างรถไฟฟ้า BTS สายสุขุมวิทและสายสีลม",
    },
    hotelSays: null,
    source: { en: "The BTS route map", th: "แผนที่เส้นทาง BTS" },
  },
  {
    id: "ratchathewi", kind: "transport", lat: 13.7518605, lon: 100.5315534, osm: "node/5388611982",
    name: { en: "Ratchathewi station, BTS", th: "สถานีราชเทวี รถไฟฟ้า BTS" },
    what: {
      en: "The BTS station the hotel names, on the Sukhumvit Line. Siam is the next stop to the south.",
      th: "สถานีรถไฟฟ้า BTS ที่โรงแรมกล่าวถึง อยู่บนสายสุขุมวิท สถานีถัดไปทางทิศใต้คือสยาม",
    },
    hotelSays: { en: "Conveniently located near Ratchathewi BTS Station and Ratchaprarop Airport Rail Link.", th: "ตั้งอยู่ในทำเลสะดวก ใกล้สถานีรถไฟฟ้า BTS ราชเทวีและรถไฟฟ้าแอร์พอร์ตลิงค์ราชปรารภ" },
  },
  {
    id: "phaya-thai", kind: "transport", lat: 13.7569644, lon: 100.5338214, osm: "node/5388610344",
    name: { en: "Phaya Thai station, BTS and Airport Rail Link", th: "สถานีพญาไท รถไฟฟ้า BTS และแอร์พอร์ต เรล ลิงก์" },
    what: {
      en: "Where the BTS Sukhumvit Line meets the Airport Rail Link, whose city end is here.",
      th: "จุดเชื่อมต่อระหว่างรถไฟฟ้า BTS สายสุขุมวิทกับแอร์พอร์ต เรล ลิงก์ ซึ่งมีสถานีปลายทางฝั่งเมืองอยู่ที่นี่",
    },
    hotelSays: null,
    source: { en: "The BTS route map and Airports of Thailand's station list", th: "แผนที่เส้นทาง BTS และรายชื่อสถานีของท่าอากาศยานไทย" },
  },

  /* ---------------- culture ---------------- */
  {
    id: "erawan", kind: "culture", lat: 13.7443205, lon: 100.5404211, osm: "node/373104218",
    name: { en: "Erawan Shrine", th: "ศาลพระพรหมเอราวัณ" },
    what: {
      en: "A shrine at the Ratchaprasong crossing. The hotel describes visitors paying respect and traditional Thai dance performances.",
      th: "ศาลบริเวณสี่แยกราชประสงค์ โรงแรมบรรยายว่ามีผู้มาสักการะและมีการแสดงนาฏศิลป์ไทย",
    },
    hotelSays: { en: "About 10 minutes from the hotel.", th: "ห่างจากโรงแรมประมาณ 10 นาที" },
  },
  {
    id: "bacc", kind: "culture", lat: 13.746778, lon: 100.5302625, osm: "way/48966995",
    name: { en: "Bangkok Art and Culture Centre", th: "หอศิลปวัฒนธรรมแห่งกรุงเทพมหานคร" },
    what: {
      en: "An art centre on Rama I Road in Pathum Wan.",
      th: "หอศิลป์บนถนนพระรามที่ 1 เขตปทุมวัน",
    },
    hotelSays: null,
    source: { en: "Address from OpenStreetMap", th: "ที่อยู่จาก OpenStreetMap" },
  },
  {
    id: "jim-thompson", kind: "culture", lat: 13.7492268, lon: 100.5282811, osm: "way/341577338",
    name: { en: "Jim Thompson House Museum", th: "พิพิธภัณฑ์บ้านจิม ทอมป์สัน" },
    what: {
      en: "A museum on Soi Kasemsan 2 in Pathum Wan.",
      th: "พิพิธภัณฑ์ในซอยเกษมสันต์ 2 เขตปทุมวัน",
    },
    hotelSays: null,
    source: { en: "Address from OpenStreetMap", th: "ที่อยู่จาก OpenStreetMap" },
  },
];

/* The five shown beside the small map on the home page, in this order. */
export const NEAR_HOME = ["platinum", "pratunam-market", "centralworld", "ratchaprarop", "ratchathewi"];

export const placeById = new Map(places.map((p) => [p.id, p]));

/** Straight-line distance in metres between two coordinates. */
export function metresBetween(a, b) {
  const R = 6371008.8, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
