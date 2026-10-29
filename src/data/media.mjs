/* Every photograph the site uses. All of them come from the hotel's own
   website (see `original`, the file kept untouched in _private/originals,
   and the provenance in _private/asset-manifest.json).

   id        the descriptive name used for the files in /media
   suite     the suite the HOTEL labels the photograph with, or null
   group     gallery filter: suites | dining | facilities | hotel
   focal     where the eye should stay when the frame crops the picture (0 to 1)
   caption   what the picture shows, nothing it cannot support
   tone      conservative global corrections applied by tools/images.mjs:
             bright (multiplier), sat (multiplier), wb [r, g, b] gains,
             sharpen (false to skip). Omitted means the standard light pass.
   crop      optional fraction of the original to keep: [left, top, width, height]

   Captions describe the picture, not the category: where a photograph shows
   something the hotel's list for that suite does not mention, the suite page
   says so in its notes. */

export const media = [
  /* ---------------- Luxury Suite ---------------- */
  {
    id: "luxury-suite-bed-sofa-city-window", original: "Grand-Diamond-Suites-Luxury-Suite-2.JPG", suite: "luxury-suite", group: "suites",
    focal: [0.52, 0.56], focalNarrow: [0.6, 0.56],
    caption: { en: "Bed, sofa and a city view", th: "เตียง โซฟา และวิวเมือง" },
    alt: { en: "Room with a large bed, two-seat sofa and coffee table beside a large window looking over city towers", th: "ห้องพักเตียงใหญ่ มีโซฟาสองที่นั่งและโต๊ะกลาง ข้างหน้าต่างบานใหญ่ที่มองเห็นตึกสูงในเมือง" },
  },
  {
    id: "luxury-suite-room-from-entrance", original: "Grand-Diamond-Suites-Luxury-Suite-3.JPG", suite: "luxury-suite", group: "suites",
    focal: [0.64, 0.56],
    caption: { en: "The minibar corner", th: "มุมมินิบาร์" },
    alt: { en: "Minibar counter with water, snacks and a small fridge, with the bed, sofa and a city-view window beyond", th: "เคาน์เตอร์มินิบาร์มีน้ำดื่ม ของว่าง และตู้เย็นเล็ก ถัดไปเป็นเตียง โซฟา และหน้าต่างวิวเมือง" },
  },
  {
    id: "luxury-suite-sofa-and-bed", original: "Grand-Diamond-Suites-Luxury-Suite-4.JPG", suite: "luxury-suite", group: "suites",
    focal: [0.66, 0.62],
    caption: { en: "Sofa corner and bed", th: "มุมโซฟาและเตียง" },
    alt: { en: "Sofa and glass coffee table in front of a large bed, with wardrobe, vanity desk and entrance door behind", th: "โซฟาและโต๊ะกลางกระจกหน้าเตียงใหญ่ ด้านหลังเป็นตู้เสื้อผ้า โต๊ะเครื่องแป้ง และประตูทางเข้า" },
  },
  {
    id: "luxury-suite-bed-and-television", original: "Grand-Diamond-Suites-Luxury-Suite-5.JPG", suite: "luxury-suite", group: "suites",
    focal: [0.48, 0.55],
    caption: { en: "Bed and TV", th: "เตียงและทีวี" },
    alt: { en: "View across a large bed to a wall-mounted television, sofa, luggage bench and vanity desk with mirror", th: "มองข้ามเตียงใหญ่ไปยังโทรทัศน์ติดผนัง โซฟา ชั้นวางกระเป๋า และโต๊ะเครื่องแป้งพร้อมกระจก" },
  },
  {
    id: "luxury-suite-bathroom", original: "Grand-Diamond-Suites-Luxury-Suite-1.JPG", suite: "luxury-suite", group: "suites",
    focal: [0.56, 0.5],
    caption: { en: "Bath and walk-in shower", th: "อ่างอาบน้ำและฝักบัว" },
    alt: { en: "Grey tiled bathroom with a bathtub, toilet, vanity with a round lit mirror and a glass walk-in shower", th: "ห้องน้ำปูกระเบื้องสีเทา มีอ่างอาบน้ำ สุขภัณฑ์ อ่างล้างหน้าพร้อมกระจกกลมมีไฟ และฝักบัวในฉากกั้นกระจก" },
  },

  /* ---------------- Junior Suite ---------------- */
  {
    id: "junior-suite-bedroom-twin-beds", original: "Grand-Diamond-Suites-Junior-Suite-2.JPG", suite: "junior-suite", group: "suites",
    focal: [0.67, 0.6],
    caption: { en: "Twin beds by a corner window", th: "เตียงคู่ริมหน้าต่างมุมห้อง" },
    alt: { en: "Bedroom with two single beds, wooden wardrobe, armchair and round table beside a corner window over the city", th: "ห้องนอนเตียงเดี่ยวสองเตียง มีตู้เสื้อผ้าไม้ เก้าอี้นั่งเล่น และโต๊ะกลมริมหน้าต่างมุมห้องที่มองเห็นวิวเมือง" },
  },
  {
    id: "junior-suite-living-room", original: "Grand-Diamond-Suites-Junior-Suite-1.JPG", suite: "junior-suite", group: "suites",
    focal: [0.55, 0.6],
    caption: { en: "The living room", th: "ห้องนั่งเล่น" },
    alt: { en: "Living room with a grey sofa, glass coffee table and large television, a small dining table and kitchenette behind", th: "ห้องนั่งเล่นมีโซฟาสีเทา โต๊ะกลางกระจก และโทรทัศน์จอใหญ่ ด้านหลังเป็นโต๊ะอาหารเล็กและครัวขนาดเล็ก" },
  },
  {
    id: "junior-suite-kitchenette-dining", original: "Grand-Diamond-Suites-Junior-Suite-4.JPG", suite: "junior-suite", group: "suites",
    focal: [0.66, 0.55],
    caption: { en: "Kitchenette with a view", th: "ครัวเล็กพร้อมวิว" },
    alt: { en: "Kitchenette with sink, hob and fridge opening onto a living area with a sofa, dining table and city-view window", th: "ครัวขนาดเล็กมีอ่างล้างจาน เตาไฟฟ้า และตู้เย็น ต่อเนื่องกับส่วนนั่งเล่นที่มีโซฟา โต๊ะอาหาร และหน้าต่างวิวเมือง" },
  },
  {
    id: "junior-suite-bedroom-king-city-view", original: "junior-suite.webp", suite: "junior-suite", group: "suites",
    focal: [0.62, 0.5],
    caption: { en: "Bedroom, living room beyond", th: "ห้องนอน ถัดไปเป็นห้องนั่งเล่น" },
    alt: { en: "Bedroom with a large bed beside a corner window over the skyline, and an open door to a living room with a sofa", th: "ห้องนอนเตียงใหญ่ข้างหน้าต่างมุมห้องวิวตึกสูง และประตูที่เปิดไปยังห้องนั่งเล่นซึ่งมีโซฟา" },
    tone: { sharpen: false },
  },
  {
    id: "junior-suite-bathroom", original: "Grand-Diamond-Suites-Junior-Suite-3.JPG", suite: "junior-suite", group: "suites",
    focal: [0.5, 0.55],
    caption: { en: "Bath and separate shower", th: "อ่างอาบน้ำและฝักบัวแยก" },
    alt: { en: "Bathroom with a bathtub, separate glass shower, toilet, pedestal basin and wood-framed mirror", th: "ห้องน้ำมีอ่างอาบน้ำ ตู้อาบน้ำฝักบัวกระจกแยกส่วน สุขภัณฑ์ อ่างล้างหน้า และกระจกกรอบไม้" },
  },

  /* ---------------- Family Suite ---------------- */
  {
    id: "family-suite-three-beds-city-windows", original: "Grand-Diamond-Suites-Family-Suite-2-09e6d6f4.JPG", suite: "family-suite", group: "suites",
    focal: [0.5, 0.58],
    caption: { en: "Three beds and big windows", th: "สามเตียงกับหน้าต่างบานใหญ่" },
    alt: { en: "Two single beds in front and a large bed under a grey mural, with an armchair, desk and two city-view windows", th: "เตียงเดี่ยวสองเตียงด้านหน้า เตียงใหญ่ใต้ภาพผนังโทนเทา พร้อมเก้าอี้นวม โต๊ะทำงาน และหน้าต่างวิวเมืองสองบาน" },
  },
  {
    id: "family-suite-beds-and-desk", original: "Grand-Diamond-Suites-Family-Suite-5-d7ce1ef3.JPG", suite: "family-suite", group: "suites",
    focal: [0.62, 0.5],
    caption: { en: "Bed by the window", th: "เตียงริมหน้าต่าง" },
    alt: { en: "Large bed beside large windows over the city skyline, with two single beds, an armchair and a desk in the same room", th: "เตียงใหญ่ข้างหน้าต่างบานใหญ่วิวตึกสูง พร้อมเตียงเดี่ยวสองเตียง เก้าอี้นวม และโต๊ะทำงานในห้องเดียวกัน" },
    tone: { bright: 1.06, wb: [1.015, 1, 0.985] },
  },
  {
    id: "family-suite-king-bed-wardrobes", original: "Grand-Diamond-Suites-Family-Suite-4-c6b5153b.JPG", suite: "family-suite", group: "suites",
    focal: [0.5, 0.55],
    caption: { en: "Desk, wardrobe and minibar", th: "โต๊ะทำงาน ตู้เสื้อผ้า และมินิบาร์" },
    alt: { en: "View over a large bed to a desk, wardrobe, minibar shelf and entrance door, with two single beds at the right", th: "มองจากเตียงใหญ่ไปยังโต๊ะทำงาน ตู้เสื้อผ้า ชั้นมินิบาร์ และประตูทางเข้า ด้านขวาเป็นเตียงเดี่ยวสองเตียง" },
  },
  {
    id: "family-suite-king-bed-and-television", original: "Grand-Diamond-Suites-Family-Suite-3-b34b12e1.JPG", suite: "family-suite", group: "suites",
    focal: [0.36, 0.52],
    caption: { en: "Seen from the single beds", th: "มองจากฝั่งเตียงเดี่ยว" },
    alt: { en: "View across two single beds to a large bed under a grey mural, a television on a low cabinet and an armchair", th: "มองข้ามเตียงเดี่ยวสองเตียงไปยังเตียงใหญ่ใต้ภาพผนังโทนเทา โทรทัศน์บนตู้เตี้ย และเก้าอี้นวม" },
  },
  {
    id: "family-suite-bathroom", original: "Grand-Diamond-Suites-Family-Suite-1-51962a0a.JPG", suite: "family-suite", group: "suites",
    focal: [0.45, 0.48],
    caption: { en: "Walk-in shower", th: "ฝักบัวกั้นกระจก" },
    alt: { en: "Grey tiled bathroom with a lit mirror, white marble vanity, toilet and a walk-in shower behind a glass panel", th: "ห้องน้ำกระเบื้องสีเทา มีกระจกบานใหญ่พร้อมไฟ เคาน์เตอร์หินอ่อนสีขาว สุขภัณฑ์ และฝักบัวหลังฉากกั้นกระจก" },
  },

  /* ---------------- Deluxe Suite ---------------- */
  {
    id: "deluxe-suite-living-dining", original: "Grand-Diamond-Suites-Deluxe-Suite-1.JPG", suite: "deluxe-suite", group: "suites",
    focal: [0.52, 0.58],
    caption: { en: "Dining table for four", th: "โต๊ะอาหารสี่ที่นั่ง" },
    alt: { en: "Living area with a grey sofa, armchair, coffee table and television, with a dining table for four behind", th: "มุมนั่งเล่นมีโซฟาสีเทา เก้าอี้นวม โต๊ะกลาง และโทรทัศน์ ด้านหลังเป็นโต๊ะรับประทานอาหาร 4 ที่นั่ง" },
  },
  {
    id: "deluxe-suite-bedroom-corner-windows", original: "Grand-Diamond-Suites-Deluxe-Suite-4.JPG", suite: "deluxe-suite", group: "suites",
    focal: [0.6, 0.52],
    caption: { en: "Corner windows over the city", th: "หน้าต่างมุมห้องมองเห็นเมือง" },
    alt: { en: "Bedroom with two single beds set side by side, a wall television, armchair and corner windows over city towers", th: "ห้องนอนเตียงเดี่ยวสองเตียงวางชิดกัน มีโทรทัศน์ติดผนัง เก้าอี้นวม และหน้าต่างมุมห้องที่เห็นตึกสูงกลางเมือง" },
  },
  {
    id: "deluxe-suite-bedroom-king-bed", original: "Grand-Diamond-Suites-Deluxe-Suite-3.JPG", suite: "deluxe-suite", group: "suites",
    focal: [0.58, 0.62],
    caption: { en: "Bed and two armchairs", th: "เตียงกับเก้าอี้นวมสองตัว" },
    alt: { en: "Bedroom with one large bed, two armchairs, a floor lamp, wooden wardrobe, television and dressing table", th: "ห้องนอนเตียงใหญ่ มีเก้าอี้นวมสองตัว โคมไฟตั้งพื้น ตู้เสื้อผ้าไม้ โทรทัศน์ และโต๊ะเครื่องแป้ง" },
  },
  {
    id: "deluxe-suite-bathtub-city-view", original: "Grand-Diamond-Suites-Deluxe-Suite-5.JPG", suite: "deluxe-suite", group: "suites",
    focal: [0.38, 0.52],
    caption: { en: "A bath with a city view", th: "อ่างอาบน้ำวิวเมือง" },
    alt: { en: "Bathroom with a built-in bathtub beside a large window over the city, a granite vanity and a glass shower", th: "ห้องน้ำมีอ่างอาบน้ำริมหน้าต่างบานใหญ่วิวเมือง เคาน์เตอร์หินแกรนิต และฝักบัวกั้นกระจก" },
  },

  /* ---------------- Executive Suite ---------------- */
  {
    id: "executive-suite-living-dining-windows", original: "Grand-Diamond-Suites-Executive-Suite-2.JPG", suite: "executive-suite", group: "suites",
    focal: [0.55, 0.58],
    caption: { en: "Living and dining, balcony beyond", th: "นั่งเล่นและโต๊ะอาหาร ถัดไปเป็นระเบียง" },
    alt: { en: "Living and dining area with a sofa, armchairs and television, a balcony and city towers beyond the glass wall", th: "พื้นที่นั่งเล่นและรับประทานอาหาร มีโซฟา เก้าอี้นวม และโทรทัศน์ มองผ่านผนังกระจกเห็นระเบียงและตึกสูงของเมือง" },
  },
  {
    id: "executive-suite-living-room-kitchenette", original: "Grand-Diamond-Suites-Executive-Suite-3.JPG", suite: "executive-suite", group: "suites",
    focal: [0.42, 0.6],
    caption: { en: "Kitchenette and dining table", th: "ครัวเล็กและโต๊ะอาหาร" },
    alt: { en: "Living room with a sofa, coffee table and television, next to a kitchenette with wooden cabinets and a round dining table", th: "ห้องนั่งเล่นมีโซฟา โต๊ะกลาง และโทรทัศน์ ติดกับครัวขนาดเล็กตู้ไม้และโต๊ะอาหารทรงกลม" },
    tone: { wb: [1.02, 1, 0.985] },
  },
  {
    id: "executive-suite-bedroom-king-balcony", original: "Grand-Diamond-Suites-Executive-Suite-4.JPG", suite: "executive-suite", group: "suites",
    focal: [0.36, 0.55],
    caption: { en: "Bedroom with a balcony door", th: "ห้องนอนมีประตูออกระเบียง" },
    alt: { en: "Bedroom with a large bed, two armchairs by the balcony door, a dressing table and a doorway to the living room", th: "ห้องนอนเตียงใหญ่ มีเก้าอี้นวมสองตัวริมประตูระเบียง โต๊ะเครื่องแป้ง และประตูเชื่อมไปยังห้องนั่งเล่น" },
    tone: { bright: 0.975, wb: [0.975, 1, 1.04] },
  },
  {
    id: "executive-suite-bedroom-twin-beds", original: "Grand-Diamond-Suites-Executive-Suite-5.JPG", suite: "executive-suite", group: "suites",
    focal: [0.42, 0.6],
    caption: { en: "Twin bedroom", th: "ห้องนอนเตียงคู่" },
    alt: { en: "Bedroom with two single beds, a bedside lamp, a dressing table with an arched mirror and a wooden door", th: "ห้องนอนเตียงเดี่ยวสองเตียง มีโคมไฟหัวเตียง โต๊ะเครื่องแป้งพร้อมกระจกทรงโค้ง และประตูไม้" },
  },
  {
    id: "executive-suite-bathroom", original: "Grand-Diamond-Suites-Executive-Suite-1-.JPG", suite: "executive-suite", group: "suites",
    focal: [0.42, 0.52],
    caption: { en: "Bath and separate shower", th: "อ่างอาบน้ำและฝักบัวแยก" },
    alt: { en: "Bathroom with a bathtub, glass-walled shower, toilet and black stone vanity under a wood-framed mirror", th: "ห้องน้ำมีอ่างอาบน้ำ ฝักบัวกั้นกระจก สุขภัณฑ์ และเคาน์เตอร์อ่างล้างหน้าหินสีดำใต้กระจกกรอบไม้" },
  },

  /* ---------------- Penthouse Suite ---------------- */
  {
    id: "penthouse-suite-terrace-skyline", original: "Grand-Diamond-Suites-Penthouse-Suite-5.JPG", suite: "penthouse-suite", group: "suites",
    focal: [0.42, 0.62], focalNarrow: [0.3, 0.62],
    caption: { en: "The terrace, above the city", th: "เทอร์เรซเหนือเมือง" },
    alt: { en: "Tiled terrace with two wicker chairs, a glass-top table and potted plants, steps to a raised deck and city towers beyond", th: "เทอร์เรซปูกระเบื้อง มีเก้าอี้หวายสองตัว โต๊ะกระจก และไม้กระถาง บันไดขึ้นสู่ชานยกระดับ ฉากหลังเป็นตึกสูงกลางเมือง" },
    tone: { sat: 0.94 },
  },
  {
    id: "penthouse-suite-living-room-double-height", original: "Grand-Diamond-Suites-Penthouse-Suite-1.JPG", suite: "penthouse-suite", group: "suites",
    focal: [0.42, 0.58],
    caption: { en: "Double-height living room", th: "ห้องนั่งเล่นเพดานสูง" },
    alt: { en: "Double-height living room with a cream sofa and armchair, glass doors to a terrace, dining table and kitchenette behind", th: "ห้องนั่งเล่นเพดานสูงสองชั้น มีโซฟาสีครีม ประตูกระจกบานใหญ่เปิดสู่เทอร์เรซ ด้านหลังเป็นโต๊ะอาหารและครัวขนาดเล็ก" },
  },
  {
    id: "penthouse-suite-terrace-whirlpool", original: "Grand-Diamond-Suites-Penthouse-Suite-6.JPG", suite: "penthouse-suite", group: "suites",
    focal: [0.55, 0.6],
    caption: { en: "Whirlpool on the deck", th: "อ่างน้ำวนบนชานไม้" },
    alt: { en: "Outdoor whirlpool tub set in a wooden deck with glass and steel railings, overlooking treetops and city towers", th: "อ่างน้ำวนกลางแจ้งฝังในชานไม้ ล้อมด้วยราวกระจกโครงสเตนเลส มองเห็นแนวต้นไม้และตึกสูงของเมือง" },
    tone: { bright: 0.975, sat: 0.94, wb: [1.02, 1, 0.985] },
  },
  {
    id: "penthouse-suite-upper-landing", original: "Grand-Diamond-Suites-Penthouse-Suite-8.JPG", suite: "penthouse-suite", group: "suites",
    focal: [0.62, 0.6],
    caption: { en: "The upstairs landing", th: "โถงชั้นบน" },
    alt: { en: "Upper landing with an iron balustrade, two grey armchairs at a small glass table, a chandelier and windows with wooden blinds", th: "โถงชั้นบนมีราวกันตกเหล็กดัด เก้าอี้นวมสีเทาสองตัวกับโต๊ะกระจกตัวเล็ก โคมระย้า และหน้าต่างมู่ลี่ไม้" },
    tone: { wb: [0.98, 1, 1.035] },
  },
  {
    id: "penthouse-suite-bedroom", original: "Grand-Diamond-Suites-Penthouse-Suite-2.JPG", suite: "penthouse-suite", group: "suites",
    focal: [0.47, 0.62],
    caption: { en: "Bedroom, set up as twins", th: "ห้องนอน จัดเป็นเตียงคู่" },
    alt: { en: "Bedroom with two single beds set side by side in white linen, a bedside lamp, wooden wardrobe and wall television", th: "ห้องนอนเตียงเดี่ยวสองเตียงวางชิดกัน ผ้าปูสีขาว โคมไฟหัวเตียง ตู้เสื้อผ้าไม้ และโทรทัศน์ติดผนัง" },
    tone: { wb: [0.98, 1, 1.035] },
  },
  {
    id: "penthouse-suite-bathroom", original: "Grand-Diamond-Suites-Penthouse-Suite-7.JPG", suite: "penthouse-suite", group: "suites",
    focal: [0.62, 0.55],
    caption: { en: "Bath, shower and a view", th: "อ่างอาบน้ำ ฝักบัว และวิว" },
    alt: { en: "Cream tiled bathroom with a bathtub under a window facing city towers, a glass shower screen, toilet and round basin", th: "ห้องน้ำกระเบื้องสีครีม มีอ่างอาบน้ำใต้หน้าต่างวิวตึกสูง ฉากกั้นฝักบัวกระจก สุขภัณฑ์ และอ่างล้างหน้าทรงกลม" },
  },

  /* ---------------- Hotel and facilities ---------------- */
  {
    id: "hotel-pool-and-tower", original: "DSC00335.JPG", suite: null, group: "facilities",
    focal: [0.48, 0.66],
    caption: { en: "The pool, below the tower", th: "สระว่ายน้ำใต้ตึก" },
    alt: { en: "Oval outdoor pool with a small round pool beside it, framed by frangipani trees, with a white tower rising behind", th: "สระว่ายน้ำกลางแจ้งทรงรี มีสระเล็กทรงกลมอยู่ติดกัน ล้อมด้วยต้นลีลาวดี ด้านหลังเป็นอาคารสูงสีขาว" },
  },
  {
    id: "hotel-pool-loungers", original: "pool.png", suite: null, group: "facilities",
    focal: [0.55, 0.52],
    caption: { en: "Loungers by the pool", th: "เก้าอี้อาบแดดริมสระ" },
    alt: { en: "Curved outdoor pool with five blue sun loungers in front of a stone-column pergola, among palms and frangipani trees", th: "สระว่ายน้ำกลางแจ้งขอบโค้ง มีเก้าอี้อาบแดดสีฟ้าห้าตัวหน้าซุ้มเสาหิน ท่ามกลางต้นปาล์มและต้นลีลาวดี" },
    tone: { sat: 0.95 },
  },
  {
    id: "hotel-fitness-centre", original: "fitness.JPG", suite: null, group: "facilities",
    focal: [0.5, 0.6],
    caption: { en: "The gym", th: "ฟิตเนส" },
    alt: { en: "Fitness room with three treadmills, two exercise bikes, an elliptical and a stepper beside windows facing trees", th: "ห้องฟิตเนสมีลู่วิ่งสามเครื่อง จักรยานออกกำลังกายสองคัน เครื่องเดินวงรี และเครื่องสเต็ป ริมหน้าต่างที่มองเห็นต้นไม้" },
  },
  {
    id: "hotel-meeting-room", original: "meeting.png", suite: null, group: "facilities",
    focal: [0.43, 0.55],
    caption: { en: "A meeting room", th: "ห้องประชุม" },
    alt: { en: "Meeting room set classroom style with white-clothed tables, cream chairs, brass chandeliers and a mirrored column", th: "ห้องประชุมจัดแบบห้องเรียน โต๊ะคลุมผ้าขาว เก้าอี้สีครีม โคมระย้าทองเหลือง และเสากระจกเงากลางห้อง" },
    tone: { bright: 0.965, wb: [0.97, 1, 1.05] },
  },
  {
    id: "ploy-restaurant-dining-room", original: "restaurant.JPG", suite: null, group: "dining",
    focal: [0.52, 0.56],
    caption: { en: "Ploy Restaurant", th: "ห้องอาหารพลอย" },
    alt: { en: "Restaurant with green-topped tables, wooden chairs and a buffet counter around the columns, tall windows facing trees", th: "ห้องอาหารมีโต๊ะท็อปสีเขียว เก้าอี้ไม้ และเคาน์เตอร์บุฟเฟต์รอบเสา กระจกบานสูงมองเห็นต้นไม้ด้านนอก" },
  },
  {
    id: "ploy-restaurant-breakfast-poolside", original: "S__10715142_0.jpg", suite: null, group: "dining",
    focal: [0.5, 0.56],
    caption: { en: "Breakfast by the pool", th: "อาหารเช้าริมสระ" },
    alt: { en: "Breakfast table by the glass with fried eggs, a croissant, fruit and juice, and the swimming pool outside", th: "โต๊ะอาหารเช้าริมกระจก มีไข่ดาว ครัวซองต์ ผลไม้ และน้ำผลไม้ มองเห็นสระว่ายน้ำด้านนอก" },
    tone: { sat: 0.94, sharpen: false },
  },
  {
    /* cropped to the entrance itself: the original also shows a parked van with a readable number plate */
    id: "hotel-entrance", original: "DSC00155.JPG", suite: null, group: "hotel",
    crop: [0.04, 0.02, 0.66, 0.96],
    focal: [0.5, 0.4],
    caption: { en: "The front entrance", th: "ทางเข้าโรงแรม" },
    alt: { en: "Hotel entrance with white columns, a glass canopy and the orange Grand Diamond sign above the steps", th: "ทางเข้าโรงแรม มีเสาสีขาว หลังคากระจก และป้ายแกรนด์ไดมอนด์สีส้มเหนือบันไดทางขึ้น" },
  },
  {
    id: "hotel-towers-at-night", original: "hero.jpg", suite: null, group: "hotel",
    focal: [0.64, 0.45],
    caption: { en: "The towers at night", th: "ตึกยามค่ำคืน" },
    alt: { en: "Night view of two lit towers with a red Grand Diamond rooftop sign, the plaza building below and the city around", th: "ภาพกลางคืนของอาคารสูงสองหลังเปิดไฟสว่าง มีป้ายไฟแกรนด์ไดมอนด์สีแดงบนยอดตึก ด้านล่างเป็นอาคารพลาซ่า ท่ามกลางแสงไฟเมือง" },
    tone: { sharpen: false },
  },
];

export const mediaById = new Map(media.map((m) => [m.id, m]));
