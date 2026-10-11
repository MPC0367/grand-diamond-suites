/* The six suite categories, as the hotel's own rooms page describes them
   (read 2026-10-08). One object per suite is the single source for the
   selector, the comparison table and the suite pages, so a name, its facts
   and its photographs cannot drift apart.

   null means "the hotel has not published this". It is shown as
   "Not listed", never as "No".

   `occupancy` is the figure the hotel's booking page prints beside each room
   ("up to N guests"). It is the only place a limit is published, so it is
   always shown with that attribution.

   Every record also carries (added at the foot of this file): id, source,
   occupancySource, verified, accessibility (null: nothing is published) and
   bookingRoomId (null until the hotel supplies its room identifiers). */

export const SUITE_ORDER = ["junior-suite", "luxury-suite", "family-suite", "deluxe-suite", "executive-suite", "penthouse-suite"];

export const suites = {
  "junior-suite": {
    slug: "junior-suite",
    name: { en: "Junior Suite", th: "จูเนียร์สวีท" },
    area: { min: 45, max: 45, approx: false },
    bedrooms: 1,
    beds: { en: "King bed or two twin beds", th: "เตียงคิงไซส์ หรือเตียงแฝด 2 เตียง" },
    bedsShort: { en: "King or twin", th: "เตียงคิงไซส์หรือเตียงแฝด" },
    bathrooms: { count: 1, detail: { en: "Shower or bathtub", th: "ฝักบัวหรืออ่างอาบน้ำ" } },
    living: { en: "Separate living room with sofa and coffee table", th: "ห้องนั่งเล่นแยกเป็นสัดส่วน พร้อมโซฟาและโต๊ะกาแฟ" },
    kitchen: null,
    outdoor: null,
    occupancy: 3,
    line: { en: "One bedroom and a living room of its own.", th: "หนึ่งห้องนอน พร้อมห้องนั่งเล่นแยกเป็นสัดส่วน" },
    summary: {
      en: "A one-bedroom suite with a living room of its own, set apart from the bedroom and furnished with a sofa and coffee table. The bedroom takes a king bed or two twin beds, and large windows look onto the city. The hotel also lists a work desk and a private bathroom with a shower or a bathtub. It suggests the suite for business travellers, solo guests and couples who like room to spread out.",
      th: "ห้องสวีทหนึ่งห้องนอน มีห้องนั่งเล่นแยกเป็นสัดส่วนจากห้องนอน พร้อมโซฟาและโต๊ะกาแฟ ห้องนอนเลือกได้ระหว่างเตียงคิงไซส์หรือเตียงแฝด 2 เตียง และมีหน้าต่างบานใหญ่ที่มองเห็นวิวเมือง โรงแรมยังระบุว่ามีโต๊ะทำงานและห้องน้ำส่วนตัวพร้อมฝักบัวหรืออ่างอาบน้ำ และแนะนำห้องนี้สำหรับผู้เดินทางเพื่อธุรกิจ ผู้เข้าพักคนเดียว และคู่รักที่ต้องการพื้นที่กว้างขึ้น",
    },
    features: [
      { en: "One bedroom with a king bed or two twin beds", th: "หนึ่งห้องนอน เตียงคิงไซส์หรือเตียงแฝด 2 เตียง" },
      { en: "Separate living room with sofa and coffee table", th: "ห้องนั่งเล่นแยกเป็นสัดส่วน พร้อมโซฟาและโต๊ะกาแฟ" },
      { en: "Private bathroom with shower or bathtub", th: "ห้องน้ำส่วนตัว มีฝักบัวหรืออ่างอาบน้ำ" },
      { en: "City view from large windows", th: "วิวเมืองจากหน้าต่างบานใหญ่" },
      { en: "Work desk and seating area", th: "โต๊ะทำงานและมุมนั่งเล่น" },
    ],
    notes: [
      {
        en: "The booking page lists smoking and non-smoking Junior Suites separately. Choose the one you want there.",
        th: "หน้าจองแสดงจูเนียร์สวีทแบบสูบบุหรี่ได้และแบบปลอดบุหรี่แยกเป็นคนละรายการ เลือกแบบที่ต้องการได้ในหน้านั้น",
      },
      {
        en: "Some of the hotel's photographs of this suite show a kitchenette and a small dining table. Its list for the Junior Suite does not mention either, so ask the hotel if you need one.",
        th: "ภาพถ่ายบางภาพของห้องนี้มีครัวขนาดเล็กและโต๊ะอาหารตัวเล็ก แต่รายละเอียดจูเนียร์สวีทที่โรงแรมระบุไว้ไม่ได้กล่าวถึง หากต้องการห้องที่มีครัวขนาดเล็ก กรุณาสอบถามโรงแรม",
      },
    ],
    compareWith: [
      { slug: "luxury-suite", why: { en: "Smaller, with modern decor", th: "ขนาดเล็กกว่า ตกแต่งสไตล์โมเดิร์น" } },
      { slug: "family-suite", why: { en: "The same size, with three beds and two bathrooms", th: "ขนาดเท่ากัน มี 3 เตียงและ 2 ห้องน้ำ" } },
    ],
    photos: ["junior-suite-bedroom-twin-beds", "junior-suite-living-room", "junior-suite-kitchenette-dining", "junior-suite-bedroom-king-city-view", "junior-suite-bathroom"],
  },

  "luxury-suite": {
    slug: "luxury-suite",
    name: { en: "Luxury Suite", th: "ลักชัวรีสวีท" },
    area: { min: 34, max: 38, approx: false },
    bedrooms: 1,
    beds: { en: "King bed or twin beds", th: "เตียงคิงไซส์ หรือเตียงแฝด" },
    bedsShort: { en: "King or twin", th: "เตียงคิงไซส์หรือเตียงแฝด" },
    bathrooms: { count: 1, detail: { en: "En-suite, with shower", th: "ห้องน้ำในตัว พร้อมฝักบัว" } },
    living: null,
    kitchen: null,
    outdoor: null,
    occupancy: 2,
    line: { en: "The compact one, with modern decor.", th: "ห้องขนาดกะทัดรัด ตกแต่งสไตล์โมเดิร์น" },
    summary: {
      en: "The smallest and most compact of the six suite types. The hotel describes refined, modern decor in warm tones, a soft-top mattress for restful sleep and city views, with an en-suite bathroom and shower. The bedroom takes a king bed or twin beds. The hotel suggests it for corporate travellers and couples on a short business or leisure trip who want a practical room.",
      th: "ห้องสวีทที่เล็กและกะทัดรัดที่สุดในหกแบบ โรงแรมบรรยายว่าตกแต่งอย่างประณีตในสไตล์โมเดิร์นโทนสีอบอุ่น มีที่นอนนุ่มสบายและวิวเมือง พร้อมห้องน้ำในตัวที่มีฝักบัว ห้องนอนเลือกได้ระหว่างเตียงคิงไซส์หรือเตียงแฝด โรงแรมแนะนำห้องนี้สำหรับผู้เดินทางเพื่อธุรกิจและคู่รักที่เดินทางระยะสั้น และต้องการห้องที่ใช้งานได้จริง",
    },
    features: [
      { en: "One bedroom with a king bed or twin beds", th: "หนึ่งห้องนอน เตียงคิงไซส์หรือเตียงแฝด" },
      { en: "Soft-top mattress", th: "ที่นอนนุ่มสบาย" },
      { en: "Modern decor in warm tones, with city views", th: "ตกแต่งสไตล์โมเดิร์นในโทนสีอบอุ่น พร้อมวิวเมือง" },
      { en: "En-suite bathroom with shower", th: "ห้องน้ำในตัว พร้อมฝักบัว" },
    ],
    notes: [
      {
        en: "Luxury is a room style here, not a size: this suite is smaller than the Junior Suite.",
        th: "คำว่าลักชัวรีในที่นี้หมายถึงรูปแบบการตกแต่ง ไม่ใช่ขนาดห้อง ห้องนี้มีขนาดเล็กกว่าจูเนียร์สวีท",
      },
      {
        en: "The booking page lists two rooms here: Luxury, for up to 2 guests, and Luxury Plus, for up to 4, both at 34 square metres. The hotel's website describes only the Luxury Suite, so ask the hotel how they differ.",
        th: "หน้าจองแสดงห้องประเภทนี้สองรายการ คือ Luxury สำหรับผู้เข้าพักสูงสุด 2 ท่าน และ Luxury Plus สำหรับผู้เข้าพักสูงสุด 4 ท่าน ทั้งสองรายการระบุขนาด 34 ตารางเมตร เว็บไซต์ของโรงแรมอธิบายเฉพาะลักชัวรีสวีท กรุณาสอบถามโรงแรมว่าสองรายการต่างกันอย่างไร",
      },
      {
        en: "The hotel's rooms page says each of its suites has a separate living area. Its list for the Luxury Suite does not mention one, and the photographs show the sofa in the same room as the bed. Ask the hotel if a separate living room matters to you.",
        th: "หน้าห้องพักของโรงแรมระบุว่าห้องสวีททุกห้องมีพื้นที่นั่งเล่นแยกเป็นสัดส่วน แต่รายละเอียดของลักชัวรีสวีทไม่ได้กล่าวถึง และในภาพถ่าย โซฟาอยู่ในห้องเดียวกับเตียง หากต้องการห้องนั่งเล่นแยก กรุณาสอบถามโรงแรม",
      },
      {
        en: "The bathroom photographed has a bathtub as well as a shower. The hotel's list for this suite mentions a shower only, so ask the hotel if a bathtub matters to you.",
        th: "ห้องน้ำในภาพมีทั้งอ่างอาบน้ำและฝักบัว แต่รายละเอียดที่โรงแรมระบุสำหรับห้องนี้กล่าวถึงเฉพาะฝักบัว หากต้องการอ่างอาบน้ำ กรุณาสอบถามโรงแรม",
      },
    ],
    compareWith: [
      { slug: "junior-suite", why: { en: "Larger, with a separate living room", th: "กว้างกว่า มีห้องนั่งเล่นแยกเป็นสัดส่วน" } },
      { slug: "family-suite", why: { en: "Larger, with three beds and two bathrooms", th: "กว้างกว่า มี 3 เตียงและ 2 ห้องน้ำ" } },
    ],
    photos: ["luxury-suite-bed-sofa-city-window", "luxury-suite-room-from-entrance", "luxury-suite-sofa-and-bed", "luxury-suite-bed-and-television", "luxury-suite-bathroom"],
  },

  "family-suite": {
    slug: "family-suite",
    name: { en: "Family Suite", th: "แฟมิลี่สวีท" },
    area: { min: 45, max: 45, approx: false },
    bedrooms: null,
    beds: { en: "One king bed and two single beds", th: "เตียงคิงไซส์ 1 เตียง และเตียงเดี่ยว 2 เตียง" },
    bedsShort: { en: "King and two singles", th: "คิงไซส์ 1 เตียง และเตียงเดี่ยว 2 เตียง" },
    bathrooms: { count: 2, detail: { en: "One with shower, one with bathtub", th: "ห้องหนึ่งมีฝักบัว อีกห้องมีอ่างอาบน้ำ" } },
    living: { en: "Living area with sofa", th: "พื้นที่นั่งเล่นพร้อมโซฟา" },
    kitchen: null,
    outdoor: null,
    occupancy: 5,
    line: { en: "Three beds and two bathrooms for staying together.", th: "สามเตียง สองห้องน้ำ สำหรับการพักด้วยกัน" },
    summary: {
      en: "One king bed and two single beds, with two bathrooms, one with a shower and one with a bathtub, so mornings are easier when several people are getting ready. The hotel also lists a living area with a sofa and city view windows. It suggests the suite for families or groups of three or four who want to stay together.",
      th: "เตียงคิงไซส์หนึ่งเตียงและเตียงเดี่ยวสองเตียง พร้อมห้องน้ำสองห้อง ห้องหนึ่งมีฝักบัว อีกห้องมีอ่างอาบน้ำ ช่วยให้ช่วงเช้าสะดวกขึ้นเมื่อมีผู้เข้าพักหลายคน โรงแรมยังระบุว่ามีพื้นที่นั่งเล่นพร้อมโซฟาและหน้าต่างชมวิวเมือง และแนะนำห้องนี้สำหรับครอบครัวหรือกลุ่ม 3 ถึง 4 คนที่ต้องการพักด้วยกัน",
    },
    features: [
      { en: "One king bed and two single beds", th: "เตียงคิงไซส์ 1 เตียง และเตียงเดี่ยว 2 เตียง" },
      { en: "Living area with sofa", th: "พื้นที่นั่งเล่นพร้อมโซฟา" },
      { en: "Two bathrooms, one with shower and one with bathtub", th: "ห้องน้ำ 2 ห้อง ห้องหนึ่งมีฝักบัว อีกห้องมีอ่างอาบน้ำ" },
      { en: "City view windows", th: "หน้าต่างชมวิวเมือง" },
    ],
    notes: [
      {
        en: "The hotel's list for this suite mentions a living area with a sofa. Its photographs show an armchair and a small table in the same room as the beds, so ask the hotel if a sofa or a separate sitting area matters to you.",
        th: "รายละเอียดที่โรงแรมระบุสำหรับห้องนี้กล่าวถึงพื้นที่นั่งเล่นพร้อมโซฟา แต่ในภาพถ่ายเป็นเก้าอี้นวมและโต๊ะตัวเล็กอยู่ในห้องเดียวกับเตียง หากต้องการโซฟาหรือมุมนั่งเล่นแยก กรุณาสอบถามโรงแรม",
      },
    ],
    compareWith: [
      { slug: "junior-suite", why: { en: "The same size, with one bedroom and a separate living room", th: "ขนาดเท่ากัน มีหนึ่งห้องนอนและห้องนั่งเล่นแยกเป็นสัดส่วน" } },
      { slug: "deluxe-suite", why: { en: "Twice the size, with two bedrooms and a kitchenette", th: "กว้างเป็นสองเท่า มี 2 ห้องนอนและครัวขนาดเล็ก" } },
    ],
    photos: ["family-suite-three-beds-city-windows", "family-suite-beds-and-desk", "family-suite-king-bed-wardrobes", "family-suite-king-bed-and-television", "family-suite-bathroom"],
  },

  "deluxe-suite": {
    slug: "deluxe-suite",
    name: { en: "Deluxe Suite", th: "ดีลักซ์สวีท" },
    area: { min: 90, max: 90, approx: false },
    bedrooms: 2,
    beds: { en: "One king bed and two single beds", th: "เตียงคิงไซส์ 1 เตียง และเตียงเดี่ยว 2 เตียง" },
    bedsShort: { en: "King and two singles", th: "คิงไซส์ 1 เตียง และเตียงเดี่ยว 2 เตียง" },
    bathrooms: { count: 1, detail: { en: "Large shared bathroom with bathtub", th: "ห้องน้ำขนาดใหญ่ใช้ร่วมกันสองห้องนอน พร้อมอ่างอาบน้ำ" } },
    living: { en: "Living and dining area", th: "พื้นที่นั่งเล่นและรับประทานอาหาร" },
    kitchen: { en: "Kitchenette with microwave and fridge", th: "ครัวขนาดเล็ก พร้อมไมโครเวฟและตู้เย็น" },
    outdoor: null,
    occupancy: 6,
    line: { en: "Two bedrooms, a living room and a kitchenette.", th: "สองห้องนอน ห้องนั่งเล่น และครัวขนาดเล็ก" },
    summary: {
      en: "Two bedrooms, with one king bed and two single beds between them, and a living and dining area to share. The hotel also lists a kitchenette with a microwave and fridge, city view windows and one large bathroom with a bathtub, which both bedrooms use. It suggests the suite for families, friends or executives planning a longer stay who want extra space and privacy.",
      th: "ห้องสวีทสองห้องนอน มีเตียงคิงไซส์หนึ่งเตียงและเตียงเดี่ยวสองเตียง พร้อมพื้นที่นั่งเล่นและรับประทานอาหารที่ใช้ร่วมกัน โรงแรมยังระบุว่ามีครัวขนาดเล็กพร้อมไมโครเวฟและตู้เย็น หน้าต่างชมวิวเมือง และห้องน้ำขนาดใหญ่หนึ่งห้องพร้อมอ่างอาบน้ำซึ่งทั้งสองห้องนอนใช้ร่วมกัน และแนะนำห้องนี้สำหรับครอบครัว กลุ่มเพื่อน หรือผู้บริหารที่วางแผนเข้าพักระยะยาวและต้องการพื้นที่กับความเป็นส่วนตัวมากขึ้น",
    },
    features: [
      { en: "Two bedrooms: one king bed and two single beds", th: "2 ห้องนอน เตียงคิงไซส์ 1 เตียง และเตียงเดี่ยว 2 เตียง" },
      { en: "Living and dining area", th: "พื้นที่นั่งเล่นและรับประทานอาหาร" },
      { en: "Large shared bathroom with bathtub", th: "ห้องน้ำขนาดใหญ่ใช้ร่วมกันสองห้องนอน พร้อมอ่างอาบน้ำ" },
      { en: "Kitchenette with microwave and fridge", th: "ครัวขนาดเล็ก พร้อมไมโครเวฟและตู้เย็น" },
      { en: "City view windows", th: "หน้าต่างชมวิวเมือง" },
    ],
    notes: [
      {
        en: "Both bedrooms share one bathroom. The Executive Suite has two.",
        th: "ทั้งสองห้องนอนใช้ห้องน้ำร่วมกันหนึ่งห้อง ส่วนเอ็กเซ็กคูทีฟสวีทมีสองห้องน้ำ",
      },
    ],
    compareWith: [
      { slug: "executive-suite", why: { en: "Larger, with two bathrooms and a private balcony", th: "กว้างกว่า มี 2 ห้องน้ำและระเบียงส่วนตัว" } },
      { slug: "family-suite", why: { en: "Half the size, with two bathrooms", th: "ขนาดครึ่งหนึ่ง มี 2 ห้องน้ำ" } },
    ],
    photos: ["deluxe-suite-bedroom-corner-windows", "deluxe-suite-living-dining", "deluxe-suite-bedroom-king-bed", "deluxe-suite-bathtub-city-view"],
  },

  "executive-suite": {
    slug: "executive-suite",
    name: { en: "Executive Suite", th: "เอ็กเซ็กคูทีฟสวีท" },
    area: { min: 120, max: 120, approx: false },
    bedrooms: 2,
    beds: { en: "One king bed and two single beds", th: "เตียงคิงไซส์ 1 เตียง และเตียงเดี่ยว 2 เตียง" },
    bedsShort: { en: "King and two singles", th: "คิงไซส์ 1 เตียง และเตียงเดี่ยว 2 เตียง" },
    bathrooms: { count: 2, detail: null },
    living: { en: "Living and dining areas", th: "พื้นที่นั่งเล่นและรับประทานอาหาร" },
    kitchen: { en: "Kitchenette with microwave and refrigerator", th: "ครัวขนาดเล็ก พร้อมไมโครเวฟและตู้เย็น" },
    outdoor: { en: "Private balcony", th: "ระเบียงส่วนตัว" },
    occupancy: 6,
    line: { en: "Two bedrooms, two bathrooms and a private balcony.", th: "สองห้องนอน สองห้องน้ำ และระเบียงส่วนตัว" },
    summary: {
      en: "Two bedrooms and two bathrooms, with one king bed and two single beds, living and dining areas, and a kitchenette with a microwave and refrigerator. A private balcony looks over Bangkok, one of only two outdoor spaces the hotel lists for any suite. The hotel suggests it for families, business travellers and long-stay guests who want more space and privacy.",
      th: "สองห้องนอนและสองห้องน้ำ มีเตียงคิงไซส์หนึ่งเตียงและเตียงเดี่ยวสองเตียง พร้อมพื้นที่นั่งเล่น รับประทานอาหาร และครัวขนาดเล็กที่มีไมโครเวฟและตู้เย็น ระเบียงส่วนตัวมองเห็นวิวกรุงเทพฯ ซึ่งเป็นหนึ่งในสองห้องสวีทเท่านั้นที่โรงแรมระบุว่ามีพื้นที่กลางแจ้ง โรงแรมแนะนำห้องนี้สำหรับครอบครัว ผู้เดินทางเพื่อธุรกิจ และผู้เข้าพักระยะยาวที่ต้องการพื้นที่และความเป็นส่วนตัวมากขึ้น",
    },
    features: [
      { en: "Two bedrooms: one king bed and two single beds", th: "2 ห้องนอน เตียงคิงไซส์ 1 เตียง และเตียงเดี่ยว 2 เตียง" },
      { en: "Two bathrooms", th: "ห้องน้ำ 2 ห้อง" },
      { en: "Living and dining areas", th: "พื้นที่นั่งเล่นและรับประทานอาหาร" },
      { en: "Private balcony overlooking Bangkok", th: "ระเบียงส่วนตัวมองเห็นวิวกรุงเทพฯ" },
      { en: "Kitchenette with microwave and refrigerator", th: "ครัวขนาดเล็ก พร้อมไมโครเวฟและตู้เย็น" },
    ],
    notes: [],
    compareWith: [
      { slug: "deluxe-suite", why: { en: "Smaller, with one shared bathroom and no balcony listed", th: "เล็กกว่า ใช้ห้องน้ำร่วมกันหนึ่งห้อง และไม่ได้ระบุว่ามีระเบียง" } },
      { slug: "penthouse-suite", why: { en: "The top floor, with a private terrace and two king bedrooms", th: "ชั้นบนสุด มีเทอร์เรซส่วนตัวและห้องนอนเตียงคิงไซส์ 2 ห้อง" } },
    ],
    photos: ["executive-suite-living-dining-windows", "executive-suite-living-room-kitchenette", "executive-suite-bedroom-king-balcony", "executive-suite-bedroom-twin-beds", "executive-suite-bathroom"],
  },

  "penthouse-suite": {
    slug: "penthouse-suite",
    name: { en: "Penthouse Suite", th: "เพนท์เฮาส์สวีท" },
    area: { min: 150, max: 150, approx: true },
    bedrooms: 2,
    beds: { en: "Two king beds", th: "เตียงคิงไซส์ 2 เตียง" },
    bedsShort: { en: "Two kings", th: "เตียงคิงไซส์ 2 เตียง" },
    bathrooms: { count: null, detail: { en: "En-suite bathrooms with bathtub and shower", th: "ห้องน้ำในตัว พร้อมอ่างอาบน้ำและฝักบัว" } },
    living: { en: "Living and dining rooms", th: "ห้องนั่งเล่นและห้องรับประทานอาหาร" },
    kitchen: { en: "Kitchenette and refrigerator", th: "ครัวขนาดเล็กและตู้เย็น" },
    outdoor: { en: "Private terrace with seating", th: "เทอร์เรซส่วนตัวพร้อมที่นั่ง" },
    occupancy: 8,
    line: { en: "The top floor, with a terrace of its own.", th: "ชั้นบนสุด พร้อมเทอร์เรซส่วนตัว" },
    summary: {
      en: "The hotel's largest suite, on the top floor. It has two bedrooms with king beds, living and dining rooms, a kitchenette with a refrigerator, and en-suite bathrooms with a bathtub and shower. A private terrace with seating gives a wide view of the city. The hotel suggests it for families, executives and long-stay guests who want space, privacy and city views.",
      th: "ห้องสวีทที่ใหญ่ที่สุดของโรงแรม ตั้งอยู่บนชั้นบนสุด มีสองห้องนอนเตียงคิงไซส์ ห้องนั่งเล่น ห้องรับประทานอาหาร ครัวขนาดเล็กพร้อมตู้เย็น และห้องน้ำในตัวที่มีอ่างอาบน้ำและฝักบัว เทอร์เรซส่วนตัวพร้อมที่นั่งมองเห็นวิวเมืองกว้างไกล โรงแรมแนะนำห้องนี้สำหรับครอบครัว ผู้บริหาร และผู้เข้าพักระยะยาวที่ต้องการพื้นที่ ความเป็นส่วนตัว และวิวเมือง",
    },
    features: [
      { en: "Two bedrooms with king beds", th: "2 ห้องนอน เตียงคิงไซส์" },
      { en: "Private terrace with seating area", th: "เทอร์เรซส่วนตัวพร้อมมุมนั่งเล่น" },
      { en: "Living and dining rooms", th: "ห้องนั่งเล่นและห้องรับประทานอาหาร" },
      { en: "En-suite bathrooms with bathtub and shower", th: "ห้องน้ำในตัว พร้อมอ่างอาบน้ำและฝักบัว" },
      { en: "Kitchenette and refrigerator", th: "ครัวขนาดเล็กและตู้เย็น" },
      { en: "Top floor, with panoramic city views", th: "ชั้นบนสุด วิวเมืองแบบพาโนรามา" },
    ],
    notes: [
      {
        en: "The rooms page gives the size as approximately 150 square metres; the booking page lists 200. Ask the hotel if the exact figure matters to you.",
        th: "หน้าห้องพักระบุขนาดประมาณ 150 ตารางเมตร ส่วนหน้าจองระบุ 200 ตารางเมตร หากต้องการตัวเลขที่แน่นอน กรุณาสอบถามโรงแรม",
      },
      {
        en: "The photographs show a suite on two levels and an outdoor whirlpool tub on the terrace deck. Neither is in the hotel's list for the Penthouse, and one bedroom is pictured with two single beds side by side. Confirm what you need with the hotel.",
        th: "ภาพถ่ายแสดงห้องสวีทสองชั้น และอ่างน้ำวนกลางแจ้งบนชานเทอร์เรซ ซึ่งไม่ได้อยู่ในรายละเอียดเพ\u2060นท์\u2060เฮาส์ที่โรงแรมระบุไว้ และห้องนอนหนึ่งห้องในภาพจัดเป็นเตียงเดี่ยวสองเตียงวางชิดกัน กรุณายืนยันสิ่งที่ต้องการกับโรงแรม",
      },
    ],
    compareWith: [
      { slug: "executive-suite", why: { en: "Smaller, with a balcony and a king plus two singles", th: "เล็กกว่า มีระเบียง เตียงคิงไซส์ 1 เตียงและเตียงเดี่ยว 2 เตียง" } },
      { slug: "deluxe-suite", why: { en: "Two bedrooms at 90 square metres, without outdoor space listed", th: "2 ห้องนอน ขนาด 90 ตารางเมตร ไม่ได้ระบุว่ามีพื้นที่กลางแจ้ง" } },
    ],
    photos: ["penthouse-suite-terrace-skyline", "penthouse-suite-living-room-double-height", "penthouse-suite-terrace-whirlpool", "penthouse-suite-upper-landing", "penthouse-suite-bedroom", "penthouse-suite-bathroom"],
  },
};

/* Provenance shared by all six records. `bookingRoomId` is the room type
   identifier from the hotel's booking system: when the hotel supplies one,
   the stay planner on that suite's page adds it to the booking link. */
for (const s of Object.values(suites)) {
  Object.assign(s, {
    id: s.slug,
    source: "https://www.granddiamondsuites.com/rooms",
    occupancySource: "https://www.granddiamondsuites.com/booking",
    verified: "2026-10-08",
    accessibility: null,
    bookingRoomId: null,
  });
}

export const suiteList = SUITE_ORDER.map((slug) => suites[slug]);
