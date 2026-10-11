/* Wording for the inner pages, English and Thai. Hotel facts are read from
   src/data at build time; nothing operational is typed here twice. */

export const suitesPage = {
  title: { en: "All six suite types", th: "ห้องสวีท 6 แบบให้เลือก" },
  description: {
    en: "Junior, Luxury, Family, Deluxe, Executive and Penthouse suites at Grand Diamond Suites, Bangkok. See sizes, beds and layouts, then check your dates.",
    th: "จูเนียร์ ลักชัวรี แฟมิลี่ ดีลักซ์ เอ็กเซ็กคูทีฟ และเพนท์เฮาส์สวีท ที่แกรนด์ไดมอนด์สวีท กรุงเทพฯ ดูขนาด เตียง และผังห้อง แล้วตรวจสอบห้องว่างได้ที่หน้าจอง",
  },
  eyebrow: { en: "Suites", th: "ห้องสวีท" },
  h1: { en: "Find your <em>space.</em>", th: "เลือก<em>ห้องที่ใช่</em>" },
  lead: {
    en: "Six suite types across {suiteCount} suites. Open each one to see its own photographs and what the hotel lists for it.",
    th: "ห้องสวีท 6 แบบ รวม {suiteCount} ห้อง เปิดดูแต่ละแบบเพื่อชมภาพถ่ายของห้องนั้นและรายละเอียดที่โรงแรมระบุไว้",
  },
  aside: {
    en: "Suite names are styles, not sizes: the Luxury Suite is smaller than the Junior Suite.",
    th: "ชื่อห้องบอกรูปแบบ ไม่ได้บอกขนาด ลักชัวรีสวีทมีขนาดเล็กกว่าจู\u2060เนียร์สวีท",
  },
  allHead: { en: "All six, at a glance", th: "ทั้ง 6 แบบโดยสรุป" },
  everyHead: { en: "In every suite", th: "ในห้องสวีททุกห้อง" },
  everyLead: { en: "The hotel lists these for all {suiteCount} suites.", th: "โรงแรมระบุว่ามีสิ่งเหล่านี้ในห้องสวีททั้ง {suiteCount} ห้อง" },
  compareHead: { en: "Still deciding?", th: "ยังตัดสินใจไม่ได้" },
  compareText: {
    en: "The comparison sets area, beds, bathrooms, living space, kitchenette, outdoor space and listed guests side by side.",
    th: "หน้าเปรียบเทียบแสดงขนาดห้อง เตียง ห้องน้ำ พื้นที่นั่งเล่น ครัวขนาดเล็ก พื้นที่กลางแจ้ง และจำนวนผู้เข้าพัก เทียบกันทีละรายการ",
  },
};

export const suitePage = {
  eyebrow: { en: "Suite", th: "ห้องสวีท" },
  titleTpl: { en: "{name}, {area}", th: "{name} {area}" },
  descTpl: {
    en: "{name} at Grand Diamond Suites, Bangkok, {area}. {line} See photographs and what the hotel lists for it.",
    th: "{name} ที่แกรนด์ไดมอนด์สวีท กรุงเทพฯ ขนาด {area} {line} ชมภาพถ่ายและรายละเอียดที่โรงแรมระบุ",
  },
  aboutHead: { en: "About this suite", th: "เกี่ยวกับห้องนี้" },
  listedHead: { en: "What the hotel lists", th: "รายละเอียดที่โรงแรมระบุ" },
  everyHead: { en: "In every suite", th: "ในห้องสวีททุกห้อง" },
  knowHead: { en: "Good to know", th: "ข้อควรทราบ" },
  photosHead: { en: "Photographs of this suite", th: "ภาพถ่ายของห้องนี้" },
  photosNote: {
    en: "Photographs are the hotel's own and show one example of this suite type. Individual suites can differ in layout, furnishings and view.",
    th: "ภาพถ่ายเป็นของโรงแรม และเป็นตัวอย่างหนึ่งของห้องประเภทนี้ แต่ละห้องอาจมีผังห้อง เฟอร์นิเจอร์ และวิวแตกต่างกัน",
  },
  occupancyNote: {
    en: "The booking page lists this suite for up to {n} guests, the only limit the hotel publishes. It also states \"Free stay for children under 7\". Other child rules and extra-bed rules are not published.",
    th: "หน้าจองระบุว่าห้องนี้รองรับผู้เข้าพักสูงสุด {n} ท่าน ซึ่งเป็นข้อจำกัดเดียวที่โรงแรมเผยแพร่ หน้าจองยังระบุว่า \"พักฟรีสำหรับเด็กอายุต่ำกว่า 7 ปี\" ส่วนเงื่อนไขอื่นเรื่องเด็กและเตียงเสริมไม่ได้เผยแพร่ไว้",
  },
  breakfastNote: {
    en: "The hotel's website does not say whether breakfast is included. Each rate on the booking page lists what it includes.",
    th: "เว็บไซต์ของโรงแรมไม่ได้ระบุว่าราคาห้องรวมอาหารเช้าหรือไม่ แต่ละราคาในหน้าจองจะแสดงสิ่งที่รวมอยู่ในราคา",
  },
  asideHead: { en: "Check your dates", th: "เลือกวันเข้าพัก" },
  asideEnquire: { en: "Ask the hotel about this suite", th: "สอบถามโรงแรมเกี่ยวกับห้องนี้" },
  compareHead: { en: "Compare with", th: "เปรียบเทียบกับ" },
  compareAll: { en: "Compare all six suites", th: "เปรียบเทียบห้องสวีททั้ง 6 แบบ" },
  prev: { en: "Previous suite", th: "ห้องก่อนหน้า" },
  next: { en: "Next suite", th: "ห้องถัดไป" },
  size: { en: "Size", th: "ขนาด" },
};

export const comparePage = {
  title: { en: "Compare the six suites", th: "เปรียบเทียบห้องสวีท 6 แบบ" },
  description: {
    en: "Compare the six suites at Grand Diamond Suites side by side: area, beds, bedrooms, bathrooms, living space, kitchenette, outdoor space and guests.",
    th: "เปรียบเทียบห้องสวีททั้ง 6 แบบของแกรนด์ไดมอนด์สวีท ทั้งขนาดห้อง เตียง ห้องนอน ห้องน้ำ พื้นที่นั่งเล่น ครัวขนาดเล็ก พื้นที่กลางแจ้ง และจำนวนผู้เข้าพัก",
  },
  eyebrow: { en: "Suites", th: "ห้องสวีท" },
  h1: { en: "Compare the suites.", th: "เปรียบเทียบห้องสวีท" },
  lead: {
    en: "Every figure below is the hotel's own, read from its rooms page and booking page.",
    th: "ข้อมูลทุกรายการด้านล่างเป็นข้อมูลของโรงแรม อ่านจากหน้าห้องพักและหน้าจองของโรงแรม",
  },
  caption: { en: "The six suite types compared", th: "ตารางเปรียบเทียบห้องสวีท 6 แบบ" },
  sizeHead: { en: "Size at a glance", th: "เทียบขนาดห้อง" },
  sizeNote: {
    en: "Areas as printed on the hotel's rooms page, smallest first. Every bar is drawn to the same scale.",
    th: "ขนาดห้องตามที่ระบุในหน้าห้องพักของโรงแรม เรียงจากเล็กไปใหญ่ ทุกแถบใช้มาตราส่วนเดียวกัน",
  },
  tableHead: { en: "Feature by feature", th: "เทียบทีละรายการ" },
  feature: { en: "Feature", th: "รายการ" },
  pickA: { en: "First suite", th: "ห้องแรก" },
  pickB: { en: "Second suite", th: "ห้องที่สอง" },
  legendUnlisted: {
    en: "\"Not listed\" means the hotel has not published this detail. It does not mean the suite lacks it.",
    th: "\"ไม่ได้ระบุ\" หมายถึงโรงแรมไม่ได้เผยแพร่ข้อมูลส่วนนี้ ไม่ได้หมายความว่าห้องไม่มีสิ่งนั้น",
  },
  legendGuests: {
    en: "Guest numbers are as listed on the hotel's booking page on {date}. Apart from \"Free stay for children under 7\" on that page, child and extra-bed rules are not published.",
    th: "จำนวนผู้เข้าพักเป็นไปตามที่ระบุในหน้าจองของโรงแรม ณ วันที่ {date} นอกจากข้อความ \"พักฟรีสำหรับเด็กอายุต่ำกว่า 7 ปี\" ในหน้านั้น โรงแรมไม่ได้เผยแพร่เงื่อนไขเรื่องเด็กและเตียงเสริม",
  },
  legendLiving: {
    en: "The hotel's rooms page says each of its suites has a separate living area. The Living space row shows what each suite's own list says.",
    th: "หน้าห้องพักของโรงแรมระบุว่าห้องสวีททุกห้องมีพื้นที่นั่งเล่นแยกเป็นสัดส่วน แถวพื้นที่นั่งเล่นแสดงข้อมูลตามรายละเอียดของห้องแต่ละแบบ",
  },
  scrollHint: { en: "Scroll sideways to see all six suites", th: "เลื่อนไปด้านข้างเพื่อดูครบทั้ง 6 แบบ" },
  view: { en: "View suite", th: "ดูห้องนี้" },
};

export const diningPage = {
  title: { en: "Dining at Ploy Restaurant", th: "ร้านอาหารพลอย อาหารเช้าและมื้อกลางวัน" },
  description: {
    en: "Ploy Restaurant at Grand Diamond Suites, Bangkok: breakfast buffet from {bfOpens}, à la carte menu until {alcCloses}. See times and how to ask about dietary needs.",
    th: "ร้านอาหารพลอย ที่แกรนด์ไดมอนด์สวีท กรุงเทพฯ บุฟเฟต์อาหารเช้านานาชาติตั้งแต่ {bfOpens} น. และเมนูตามสั่งถึง {alcCloses} น. ดูเวลาให้บริการและวิธีสอบถามเรื่องข้อจำกัดด้านอาหาร",
  },
  eyebrow: { en: "Dining", th: "ห้องอาหาร" },
  h1: { en: "Ploy <em>Restaurant</em>", th: "ร้านอาหาร<em>พลอย</em>" },
  lead: {
    en: "The hotel's restaurant serves Thai and international dishes: a breakfast buffet in the morning and an à la carte menu through lunch.",
    th: "ห้องอาหารของโรงแรม ให้บริการอาหารไทยและอาหารนานาชาติ ช่วงเช้าเป็นบุฟเฟต์อาหารเช้า ต่อด้วยเมนูตามสั่งในมื้อกลางวัน",
  },
  hoursHead: { en: "Opening times", th: "เวลาให้บริการ" },
  knowHead: { en: "Good to know", th: "ข้อควรทราบ" },
  hoursCaption: { en: "Ploy Restaurant opening times", th: "เวลาให้บริการของร้านอาหารพลอย" },
  service: { en: "Service", th: "บริการ" },
  time: { en: "Time", th: "เวลา" },
  lastOrder: { en: "Last order {t}", th: "รับออร์เดอร์สุดท้าย {t} น." },
  eveningHead: { en: "Evenings and room service", th: "มื้อค่ำและรูมเซอร์วิส" },
  evening: {
    en: "The hotel mentions dinner and room service, ordered to your suite, without publishing times for either. Ask the front desk about evening meals.",
    th: "โรงแรมกล่าวถึงมื้อค่ำและรูมเซอร์วิสที่สั่งขึ้นห้องพักได้ แต่ไม่ได้เผยแพร่เวลาให้บริการ หากต้องการใช้บริการช่วงเย็น กรุณาสอบถามแผนกต้อนรับ",
  },
  breakfastHead: { en: "Is breakfast included?", th: "ราคาห้องรวมอาหารเช้าหรือไม่" },
  breakfast: {
    en: "The hotel's website does not say. Each rate on the hotel's booking page lists what it includes, so check before you confirm.",
    th: "เว็บไซต์ของโรงแรมไม่ได้ระบุไว้ แต่ละราคาในหน้าจองของโรงแรมจะแสดงสิ่งที่รวมอยู่ในราคา จึงควรตรวจสอบก่อนยืนยันการจอง",
  },
  dietHead: { en: "Dietary needs", th: "ข้อจำกัดด้านอาหารและการแพ้อาหาร" },
  diet: {
    en: "No menu, allergen list or dietary certification is published. If you have an allergy or follow a particular diet, tell the hotel before you arrive.",
    th: "โรงแรมไม่ได้เผยแพร่เมนู รายการสารก่อภูมิแพ้ หรือการรับรองด้านอาหาร หากแพ้อาหารหรือมีข้อจำกัดด้านอาหาร กรุณาแจ้งโรงแรมก่อนเข้าพัก",
  },
  ask: { en: "Ask the hotel about dining", th: "สอบถามโรงแรมเรื่องห้องอาหาร" },
  photosHead: { en: "In the restaurant", th: "ภายในห้องอาหาร" },
};

export const facilitiesPage = {
  title: { en: "Pool, fitness and hotel services", th: "สระว่ายน้ำ ฟิตเนส และบริการของโรงแรม" },
  description: {
    en: "Facilities at Grand Diamond Suites, Bangkok: outdoor pool, fitness centre, Ploy Restaurant, meeting facilities, 24-hour front desk, Wi-Fi and parking.",
    th: "สิ่งอำนวยความสะดวกของแกรนด์ไดมอนด์สวีท กรุงเทพฯ สระว่ายน้ำกลางแจ้ง ฟิตเนส ร้านอาหารพลอย ห้องประชุม แผนกต้อนรับ 24 ชั่วโมง Wi-Fi และที่จอดรถ",
  },
  eyebrow: { en: "Facilities", th: "สิ่งอำนวยความสะดวก" },
  h1: { en: "Pool, fitness and <em>hotel services.</em>", th: "สระว่ายน้ำ ฟิตเนส<em>และบริการของโรงแรม</em>" },
  lead: {
    en: "What the hotel lists on site, with photographs where it has published them.",
    th: "สิ่งอำนวยความสะดวกที่โรงแรมระบุไว้ พร้อมภาพถ่ายเท่าที่โรงแรมเผยแพร่",
  },
  directoryHead: { en: "Services", th: "บริการ" },
  hoursNote: {
    en: "Opening times and access rules for the pool, fitness centre and parking are not published, and neither are any charges for the pool or fitness centre. The front desk, open 24 hours, can confirm them.",
    th: "โรงแรมไม่ได้เผยแพร่เวลาเปิดให้บริการและเงื่อนไขการใช้สระว่ายน้ำ ฟิตเนส และที่จอดรถ รวมถึงค่าใช้จ่ายของสระว่ายน้ำและฟิตเนส สอบถามได้ที่แผนกต้อนรับซึ่งเปิดตลอด 24 ชั่วโมง",
  },
  parkingNote: {
    en: "The booking page describes parking as free and indoor. A space cannot be reserved through this website.",
    th: "หน้าจองระบุว่าเป็นที่จอดรถในร่มโดยไม่มีค่าใช้จ่าย ไม่สามารถจองที่จอดรถผ่านเว็บไซต์นี้ได้",
  },
  meetingsHead: { en: "Meetings", th: "การประชุม" },
  meetings: {
    en: "The hotel lists meeting facilities and Wi-Fi throughout the property for business travellers. Room dimensions, seating layouts, capacity and equipment are not published.",
    th: "โรงแรมระบุว่ามีห้องประชุมและ Wi-Fi ทั่วทั้งโรงแรมสำหรับผู้เดินทางเพื่อธุรกิจ แต่ไม่ได้เผยแพร่ขนาดห้อง รูปแบบการจัดที่นั่ง ความจุ หรืออุปกรณ์",
  },
  meetingsAsk: { en: "Enquire about a meeting", th: "สอบถามเรื่องการจัดประชุม" },
  greenHead: { en: "Green Hotel", th: "โรงแรมที่เป็นมิตรกับสิ่งแวดล้อม (Green Hotel)" },
  green: {
    en: "The hotel states that it holds Green Hotel certification from the Department of Climate Change and Environment. The department's list of hotels that passed its assessment for 2025, posted on 8 January 2026, includes the hotel's Thai name, โรงแรมแกรนด์ไดมอนด์สวีท, at the Very Good (Silver) level, the second of three. The list gives names only, and no certificate number or end date is published.",
    th: "โรงแรมระบุว่าได้รับการรับรอง Green Hotel จากกรมการเปลี่ยนแปลงสภาพภูมิอากาศและสิ่งแวดล้อม ประกาศรายชื่อโรงแรมที่ผ่านการตรวจประเมินประจำปี พ.ศ. 2568 (ค.ศ. 2025) ของกรมฯ ซึ่งเผยแพร่เมื่อวันที่ 8 มกราคม 2026 มีชื่อโรงแรมแกรนด์ไดมอนด์สวีทอยู่ในระดับดีมาก (Silver) ซึ่งเป็นระดับที่สองจากสามระดับ ประกาศดังกล่าวระบุเฉพาะชื่อโรงแรม และไม่มีการเผยแพร่เลขที่ใบรับรองหรือวันสิ้นอายุ",
  },
};

export const locationPage = {
  title: { en: "Location in Pratunam, Bangkok", th: "ทำเลที่ตั้ง ย่านประตูน้ำ กรุงเทพฯ" },
  description: {
    en: "Find Grand Diamond Suites on Phetchaburi Road, beside Platinum Fashion Mall. See the address, a map of nearby places and routes from both Bangkok airports.",
    th: "แกรนด์ไดมอนด์สวีทตั้งอยู่บนถนนเพชรบุรี ติดแพลทินัม แฟชั่นมอลล์ ดูที่อยู่ แผนที่แหล่งช้อปปิ้งและสถานีรถไฟฟ้าใกล้เคียง และวิธีเดินทางจากสนามบินทั้งสองแห่งของกรุงเทพฯ",
  },
  eyebrow: { en: "Location", th: "ทำเลที่ตั้ง" },
  h1: { en: "Your Bangkok <em>address.</em>", th: "ที่พักของคุณ<em>ในกรุงเทพฯ</em>" },
  lead: {
    en: "On Phetchaburi Road in Pratunam, beside Platinum Fashion Mall. Every place on this page is plotted from its map coordinates, and every distance is a straight line from the hotel.",
    th: "บนถนนเพชรบุรี ย่านประตูน้ำ ติดแพลทินัม แฟชั่นมอลล์ สถานที่ทุกแห่งในหน้านี้วางตำแหน่งตามพิกัดบนแผนที่ และระยะทางทุกรายการวัดเป็นเส้นตรงจากโรงแรม",
  },
  arriveHead: { en: "Arriving at the hotel", th: "การเดินทางมาถึงโรงแรม" },
  entranceCap: {
    en: "The hotel entrance. The sign above the doors reads Grand Diamond Plaza Suites Hotel.",
    th: "ทางเข้าโรงแรม ป้ายเหนือประตูเขียนว่า Grand Diamond Plaza Suites Hotel",
  },
  addressNote: {
    en: "The street numbers are reproduced exactly as the hotel prints them. For a taxi, show the Thai address or the map listing.",
    th: "เลขที่ในที่อยู่แสดงตามที่โรงแรมพิมพ์ไว้ทุกประการ หากนั่งแท็กซี่ ให้คนขับดูที่อยู่ภาษาไทยหรือตำแหน่งบนแผนที่",
  },
  exploreHead: { en: "Explore the neighbourhood", th: "สำรวจย่านรอบโรงแรม" },
  exploreLead: {
    en: "Twelve places around the hotel. Distances are straight lines, rounded, and a walking route is always longer. Where the hotel gives a walking time, it is shown as the hotel's own. Check opening times with each place before you go.",
    th: "สถานที่ 12 แห่งรอบโรงแรม ระยะทางวัดเป็นเส้นตรงโดยประมาณ เส้นทางเดินจริงจะไกลกว่าเสมอ หากโรงแรมระบุเวลาเดินไว้ จะแสดงเป็นข้อมูลจากโรงแรม ควรตรวจสอบเวลาเปิดให้บริการกับแต่ละสถานที่ก่อนเดินทาง",
  },
  kinds: {
    shopping: { en: "Shopping", th: "ช้อปปิ้ง" },
    transport: { en: "Transport", th: "การเดินทาง" },
    culture: { en: "Culture", th: "วัฒนธรรม" },
  },
  hotelSays: { en: "The hotel says", th: "โรงแรมระบุว่า" },
  airportsHead: { en: "From the airports", th: "การเดินทางจากสนามบิน" },
  airportsLead: {
    en: "Bangkok has two airports on different rail lines. Journey times depend on traffic and time of day, so none are quoted here.",
    th: "กรุงเทพฯ มีสนามบินสองแห่งซึ่งอยู่คนละเส้นทางรถไฟฟ้า ระยะเวลาเดินทางขึ้นอยู่กับสภาพจราจรและช่วงเวลา จึงไม่ได้ระบุไว้ที่นี่",
  },
  accessHead: { en: "Step-free arrival", th: "การเดินทางมาถึงโดยไม่ต้องขึ้นบันได" },
  access: {
    en: "The hotel has not published step-free routes from the street or the stations. Tell the hotel what you need before you travel and ask where to be dropped off.",
    th: "โรงแรมไม่ได้เผยแพร่ข้อมูลเส้นทางที่ไม่มีขั้นบันไดจากถนนหรือสถานี กรุณาแจ้งความต้องการกับโรงแรมก่อนเดินทาง และสอบถามจุดรับส่งที่เหมาะสม",
  },
  accessAsk: { en: "Ask about access", th: "สอบถามเรื่องการเข้าถึงสำหรับผู้พิการ" },
};

export const galleryPage = {
  title: { en: "Photographs of the hotel", th: "ภาพถ่ายของโรงแรม" },
  description: {
    en: "Photographs of Grand Diamond Suites, Bangkok, from the hotel's own website: every suite type, Ploy Restaurant, the pool, the fitness centre and the entrance.",
    th: "ภาพถ่ายของแกรนด์ไดมอนด์สวีท กรุงเทพฯ จากเว็บไซต์ของโรงแรม ครบทุกประเภทห้องสวีท ร้านอาหารพลอย สระว่ายน้ำ ฟิตเนส และทางเข้าโรงแรม",
  },
  eyebrow: { en: "Gallery", th: "แกลเลอรี" },
  h1: { en: "Look <em>around.</em>", th: "ชมภาพ<em>โรงแรม</em>" },
  lead: {
    en: "Every photograph is the hotel's own, labelled with the suite or place it shows.",
    th: "ภาพถ่ายทุกภาพเป็นของโรงแรม พร้อมระบุว่าเป็นห้องสวีทหรือสถานที่ใด",
  },
  filters: {
    all: { en: "All", th: "ทั้งหมด" },
    suites: { en: "Suites", th: "ห้องสวีท" },
    dining: { en: "Dining", th: "ห้องอาหาร" },
    facilities: { en: "Facilities", th: "สิ่งอำนวยความสะดวก" },
    hotel: { en: "The hotel", th: "ตัวโรงแรม" },
  },
  filterLabel: { en: "Show photographs of", th: "เลือกดูภาพ" },
};

export const offersPage = {
  title: { en: "Offers and current rates", th: "ข้อเสนอและราคาปัจจุบัน" },
  description: {
    en: "Looking for an offer at Grand Diamond Suites, Bangkok? Current rates and any discount for your dates are on the official booking page. Check your dates.",
    th: "กำลังมองหาข้อเสนอของแกรนด์ไดมอนด์สวีท กรุงเทพฯ อยู่หรือไม่ ราคาปัจจุบันและส่วนลดสำหรับวันที่ต้องการแสดงอยู่ในหน้าจองทางการของโรงแรม ตรวจสอบห้องว่างได้ที่นั่น",
  },
  eyebrow: { en: "Offers", th: "ข้อเสนอ" },
  h1: { en: "Current rates, <em>at the source.</em>", th: "ราคาปัจจุบัน<em>จากโรงแรมโดยตรง</em>" },
  lead: {
    en: "No offers are listed here, because the hotel has not published terms for any. The rate for your dates, with any discount applied, is shown on its booking page.",
    th: "หน้านี้ไม่ได้แสดงข้อเสนอใด เพราะโรงแรมยังไม่ได้เผยแพร่เงื่อนไขของข้อเสนอ ราคาสำหรับวันที่ต้องการ รวมส่วนลดที่มี จะแสดงอยู่ในหน้าจองของโรงแรม",
  },
  whyHead: { en: "Why this page is short", th: "เหตุผลที่หน้านี้มีข้อมูลน้อย" },
  why: {
    en: "The hotel's own offers page gives no dates, benefits or conditions for any promotion. Its Thai version names three, for early booking, longer stays and weekends, and its English version names none. An offer needs all of those details to be worth acting on, so none is repeated here.",
    th: "หน้าข้อเสนอของโรงแรมไม่ได้ระบุช่วงเวลา สิทธิประโยชน์ หรือเงื่อนไขของโปรโมชั่นใดเลย ฉบับภาษาไทยระบุชื่อโปรโมชั่นไว้สามรายการ คือการจองล่วงหน้า การพักนานขึ้น และวันหยุดสุดสัปดาห์ ส่วนฉบับภาษาอังกฤษไม่ได้ระบุชื่อโปรโมชั่น ข้อเสนอที่ไม่มีรายละเอียดเหล่านี้ไม่อาจนำไปใช้ตัดสินใจได้ จึงไม่ได้นำมาแสดงซ้ำที่นี่",
  },
  howHead: { en: "How to see what applies to you", th: "วิธีดูราคาที่ใช้กับการเข้าพักของคุณ" },
  steps: {
    en: [
      "Choose your dates and guests below, or leave the dates empty.",
      "On the booking page, each room shows its price for your stay and any discount already taken off.",
      "If you have a promo code, enter it there. Conditions for each rate are shown before you confirm.",
    ],
    th: [
      "เลือกวันเข้าพักและจำนวนผู้เข้าพักด้านล่าง หรือเว้นวันที่ว่างไว้ก็ได้",
      "ในหน้าจอง แต่ละห้องจะแสดงราคาสำหรับการเข้าพักของคุณ พร้อมส่วนลดที่หักแล้ว",
      "หากมีรหัสโปรโมชั่น ให้กรอกในหน้านั้น เงื่อนไขของแต่ละราคาจะแสดงก่อนยืนยันการจอง",
    ],
  },
  official: { en: "The hotel's own offers page", th: "หน้าข้อเสนอของโรงแรม" },
  longHead: { en: "Long stays and groups", th: "การเข้าพักระยะยาวและการเข้าพักเป็นกลุ่ม" },
  long: {
    en: "For a stay of more than {maxNights} nights, several rooms or a group, ask the hotel directly. An enquiry is a question, not a reservation.",
    th: "สำหรับการเข้าพักเกิน {maxNights} คืน การจองหลายห้อง หรือการเข้าพักเป็นกลุ่ม กรุณาสอบถามโรงแรมโดยตรง การสอบถามไม่ถือเป็นการจองห้องพัก",
  },
  enquire: { en: "Prepare an enquiry", th: "เตรียมข้อความสอบถาม" },
};

export const contactPage = {
  title: { en: "Contact the hotel", th: "ติดต่อโรงแรม" },
  description: {
    en: "Contact Grand Diamond Suites, Bangkok by telephone or email, or prepare an enquiry about a family stay, a long stay or a meeting. Find the address here.",
    th: "ติดต่อแกรนด์ไดมอนด์สวีท กรุงเทพฯ ทางโทรศัพท์หรืออีเมล หรือเตรียมข้อความสอบถามเรื่องการเข้าพักแบบครอบครัว การเข้าพักระยะยาว หรือการจัดประชุม พร้อมที่อยู่และเส้นทาง",
  },
  eyebrow: { en: "Contact", th: "ติดต่อ" },
  h1: { en: "Talk to <em>the hotel.</em>", th: "ติดต่อ<em>โรงแรม</em>" },
  lead: {
    en: "The hotel says its team is available 24 hours a day for bookings, questions and special requests.",
    th: "โรงแรมระบุว่าทีมงานพร้อมให้บริการตลอด 24 ชั่วโมง สำหรับการจอง การสอบถาม และคำขอพิเศษ",
  },
  directHead: { en: "Reach the hotel directly", th: "ติดต่อโรงแรมโดยตรง" },
  composeHead: { en: "Prepare an enquiry", th: "เตรียมข้อความสอบถาม" },
  composeLead: {
    en: "This form writes a message for you to send yourself. It sends nothing, stores nothing and does not reserve a room.",
    th: "แบบฟอร์มนี้ช่วยเรียบเรียงข้อความให้คุณนำไปส่งเอง ไม่มีการส่งข้อมูล ไม่มีการจัดเก็บข้อมูล และไม่ใช่การจองห้องพัก",
  },
  nojs: {
    en: "The enquiry helper needs JavaScript. You can still write to the hotel by email or call the number shown.",
    th: "ตัวช่วยเรียบเรียงข้อความต้องใช้ JavaScript คุณยังสามารถส่งอีเมลหรือโทรหาโรงแรมตามหมายเลขที่แสดงได้",
  },
  about: { en: "What is it about?", th: "ต้องการสอบถามเรื่องใด" },
  intents: {
    stay: { en: "A stay", th: "การเข้าพัก" },
    family: { en: "A family or group", th: "ครอบครัวหรือกลุ่ม" },
    long: { en: "A long stay", th: "การเข้าพักระยะยาว" },
    meeting: { en: "A meeting", th: "การจัดประชุม" },
    access: { en: "Access needs", th: "การเข้าถึงสำหรับผู้พิการ" },
    dining: { en: "Dining", th: "ห้องอาหาร" },
  },
  name: { en: "Your name", th: "ชื่อของคุณ" },
  emailL: { en: "Your email", th: "อีเมลของคุณ" },
  phoneL: { en: "Telephone", th: "โทรศัพท์" },
  optional: { en: "optional", th: "ไม่บังคับ" },
  arrive: { en: "Arrival", th: "วันเช็คอิน" },
  depart: { en: "Departure", th: "วันเช็คเอาท์" },
  party: { en: "Who is travelling", th: "ผู้เดินทาง" },
  partyHint: { en: "For example: 2 adults, 1 child aged 5", th: "เช่น ผู้ใหญ่ 2 ท่าน เด็ก 1 คน อายุ 5 ปี" },
  suite: { en: "Suite of interest", th: "ห้องสวีทที่สนใจ" },
  noSuite: { en: "No preference", th: "ยังไม่ได้เลือก" },
  message: { en: "Your question", th: "คำถามของคุณ" },
  messageHint: {
    en: "Please do not include card numbers, passport details or medical information.",
    th: "กรุณาอย่าระบุหมายเลขบัตร ข้อมูลหนังสือเดินทาง หรือข้อมูลทางการแพทย์",
  },
  prepare: { en: "Prepare the message", th: "เรียบเรียงข้อความ" },
  readyHead: { en: "Your message is ready", th: "ข้อความของคุณพร้อมแล้ว" },
  readyNote: {
    en: "Nothing has been sent. Copy the text, or open it in your email app and press send there. An enquiry is not a confirmed reservation.",
    th: "ยังไม่มีการส่งข้อความใด ๆ คัดลอกข้อความ หรือเปิดในแอปอีเมลแล้วกดส่งจากที่นั่น การสอบถามไม่ถือเป็นการยืนยันการจอง",
  },
  copy: { en: "Copy the message", th: "คัดลอกข้อความ" },
  mail: { en: "Open in email app", th: "เปิดในแอปอีเมล" },
  js: {
    greeting: { en: "Hello Grand Diamond Suites Hotel,", th: "เรียน โรงแรมแกรนด์ไดมอนด์สวีท" },
    subject: { en: "Enquiry", th: "เรื่องที่สอบถาม" },
    mailSubject: { en: "Enquiry", th: "สอบถาม" },
    dates: { en: "Dates", th: "วันที่" },
    nights: { en: "nights", th: "คืน" },
    night: { en: "night", th: "คืน" },
    party: { en: "Guests", th: "ผู้เข้าพัก" },
    suite: { en: "Suite of interest", th: "ห้องสวีทที่สนใจ" },
    to: { en: "to", th: "ถึง" },
    copied: { en: "Message copied. It has not been sent.", th: "คัดลอกข้อความแล้ว ข้อความยังไม่ได้ถูกส่ง" },
    copyFailed: { en: "Could not copy. Select the text and copy it by hand.", th: "คัดลอกไม่สำเร็จ กรุณาเลือกข้อความแล้วคัดลอกด้วยตนเอง" },
    mailLong: { en: "This message is too long to hand to an email app. Your email app opens with the subject only: copy the message above and paste it in.", th: "ข้อความนี้ยาวเกินกว่าจะส่งต่อไปยังแอปอีเมลได้ แอปอีเมลจะเปิดขึ้นพร้อมหัวข้อเท่านั้น กรุณาคัดลอกข้อความด้านบนแล้ววางในอีเมล" },
    mailHint: { en: "Your email app should open with the message. It is sent only when you press send there.", th: "แอปอีเมลจะเปิดขึ้นพร้อมข้อความ ข้อความจะถูกส่งเมื่อคุณกดส่งในแอปเท่านั้น" },
    errEmail: { en: "Enter an email address such as name@example.com, or leave it empty.", th: "กรุณาระบุอีเมลให้ถูกต้อง เช่น name@example.com หรือเว้นว่างไว้" },
    errBoth: { en: "Give both dates, or leave both empty.", th: "กรุณาระบุทั้งสองวัน หรือเว้นว่างทั้งสองช่อง" },
    errOrder: { en: "Departure must be after arrival.", th: "วันเช็คเอาท์ต้องอยู่หลังวันเช็คอิน" },
    errMessage: { en: "Write your question, or give your dates.", th: "กรุณาเขียนคำถาม หรือระบุวันที่ต้องการ" },
  },
};

export const faqPage = {
  title: { en: "Questions before you book", th: "คำถามก่อนจองห้องพัก" },
  description: {
    en: "Answers about booking, suites, children, breakfast, parking and arrival at Grand Diamond Suites, Bangkok, each with its source, and how to ask the hotel.",
    th: "คำตอบเรื่องการจอง ห้องสวีท เด็ก อาหารเช้า ที่จอดรถ และการเดินทางมายังแกรนด์ไดมอนด์สวีท กรุงเทพฯ อ้างอิงข้อมูลที่โรงแรมเผยแพร่ และสอบถามเพิ่มเติมได้",
  },
  eyebrow: { en: "Questions", th: "คำถามที่พบบ่อย" },
  h1: { en: "Before <em>you book.</em>", th: "ก่อน<em>จองห้องพัก</em>" },
  lead: {
    en: "Where the hotel has published an answer, it is given here with its source. Where it has not, this page says so.",
    th: "หากโรงแรมเผยแพร่คำตอบไว้ จะระบุพร้อมแหล่งที่มา หากไม่มี หน้านี้จะบอกตามตรง",
  },
  jump: { en: "Jump to", th: "ไปยังหัวข้อ" },
  moreHead: { en: "Still have a question?", th: "ยังมีคำถามอื่นอีกหรือไม่" },
  more: { en: "The hotel is the authority on everything about your stay.", th: "โรงแรมเป็นผู้ให้คำตอบที่ถูกต้องเกี่ยวกับการเข้าพักของคุณทุกเรื่อง" },
};

export const privacyPage = {
  title: { en: "Privacy on this website", th: "ความเป็นส่วนตัวบนเว็บไซต์นี้" },
  description: {
    en: "How this concept website handles your information: no accounts, no tracking, no cookies. Read what stays in your browser and what the booking link carries.",
    th: "เว็บไซต์ตัวอย่างนี้จัดการข้อมูลของคุณอย่างไร ไม่มีบัญชีผู้ใช้ ไม่มีการติดตาม และไม่มีคุกกี้ อ่านว่าข้อมูลใดอยู่ในเบราว์เซอร์ของคุณ และเกิดอะไรขึ้นเมื่อไปยังหน้าจอง",
  },
  eyebrow: { en: "Privacy", th: "ความเป็นส่วนตัว" },
  h1: { en: "Privacy", th: "ความเป็นส่วนตัว" },
  lead: {
    en: "This page describes what this website does. It is written to be accurate about the site as built, and nothing more.",
    th: "หน้านี้อธิบายสิ่งที่เว็บไซต์นี้ทำ โดยเขียนให้ตรงกับการทำงานจริงของเว็บไซต์ ไม่มากไปกว่านั้น",
  },
  sections: [
    {
      h: { en: "Who publishes this website", th: "ผู้จัดทำเว็บไซต์นี้" },
      p: {
        en: ["This website is an unofficial design concept published by O2 Design Studio. It is not published by Grand Diamond Suites Hotel, and the hotel is not responsible for it."],
        th: ["เว็บไซต์นี้เป็นผลงานออกแบบตัวอย่างที่ไม่เป็นทางการ จัดทำโดย O2 Design Studio ไม่ได้จัดทำโดยโรงแรมแกรนด์ไดมอนด์สวีท และโรงแรมไม่ได้เป็นผู้รับผิดชอบเว็บไซต์นี้"],
      },
      preview: true,
    },
    {
      h: { en: "What the site collects", th: "ข้อมูลที่เว็บไซต์เก็บ" },
      p: {
        en: ["Nothing. There are no accounts, no analytics, no advertising tags and no cookies. The site has no server of its own that receives what you type."],
        th: ["ไม่มีการเก็บข้อมูลใด ๆ ไม่มีบัญชีผู้ใช้ ไม่มีระบบวิเคราะห์การใช้งาน ไม่มีแท็กโฆษณา และไม่มีคุกกี้ เว็บไซต์นี้ไม่มีเซิร์ฟเวอร์ของตนเองที่รับข้อมูลที่คุณพิมพ์"],
      },
    },
    {
      h: { en: "What stays in your browser", th: "ข้อมูลที่อยู่ในเบราว์เซอร์ของคุณ" },
      p: {
        en: [
          "So that your choices survive a change of page or language, the site keeps your stay dates, number of adults, the ages of any children you add, the suite you last opened and your comparison choices in your browser's session storage. They never leave your device and are cleared when you close the tab.",
          "If you switch language, that one choice is remembered in your browser's local storage, so the site's main address opens in the same language next time. It stays on your device until you clear your browser data.",
          "Text you type into the enquiry helper is never stored. It exists only on the page until you leave it.",
        ],
        th: [
          "เพื่อให้ตัวเลือกของคุณยังอยู่เมื่อเปลี่ยนหน้าหรือเปลี่ยนภาษา เว็บไซต์จะเก็บวันเข้าพัก จำนวนผู้ใหญ่ อายุของเด็กที่ระบุไว้ ห้องสวีทที่เปิดดูล่าสุด และตัวเลือกในการเปรียบเทียบ ไว้ในพื้นที่จัดเก็บชั่วคราวของเบราว์เซอร์ ข้อมูลเหล่านี้ไม่ถูกส่งออกจากอุปกรณ์ของคุณ และจะถูกลบเมื่อปิดแท็บ",
          "หากคุณสลับภาษา เว็บไซต์จะจำภาษาที่เลือกไว้ในพื้นที่จัดเก็บของเบราว์เซอร์ เพื่อให้หน้าแรกของเว็บไซต์เปิดเป็นภาษาเดิมในครั้งถัดไป ข้อมูลนี้อยู่ในอุปกรณ์ของคุณจนกว่าคุณจะล้างข้อมูลเบราว์เซอร์",
          "ข้อความที่พิมพ์ในตัวช่วยเรียบเรียงข้อความสอบถามจะไม่ถูกจัดเก็บ และอยู่บนหน้าเว็บเท่านั้นจนกว่าคุณจะออกจากหน้า",
        ],
      },
    },
    {
      h: { en: "When you leave for the booking page", th: "เมื่อคุณไปยังหน้าจอง" },
      p: {
        en: [
          "Choosing to check availability opens the hotel's official booking page in a new tab. The link carries the number of adults, the ages of any children you added and, if you chose dates, your arrival date and number of nights, so that page can show them. Nothing else is passed.",
          "From there on, the hotel and its booking provider handle your information under their own policies.",
        ],
        th: [
          "เมื่อเลือกตรวจสอบห้องว่าง หน้าจองทางการของโรงแรมจะเปิดขึ้นในแท็บใหม่ ลิงก์จะส่งจำนวนผู้ใหญ่ อายุของเด็กที่ระบุไว้ และหากเลือกวันที่ จะส่งวันเข้าพักและจำนวนคืนไปด้วย เพื่อให้หน้านั้นแสดงผลตามที่เลือก โดยไม่มีข้อมูลอื่นถูกส่งไป",
          "หลังจากนั้น โรงแรมและผู้ให้บริการระบบจองจะดูแลข้อมูลของคุณตามนโยบายของตนเอง",
        ],
      },
    },
    {
      h: { en: "Other places this site links to", th: "เว็บไซต์อื่นที่มีลิงก์ไปถึง" },
      p: {
        en: ["Links to maps, the hotel's social pages and its own website open those services, which apply their own policies. The map on this site is an image and loads nothing from a map service. Fonts and photographs are served by this site itself."],
        th: ["ลิงก์ไปยังแผนที่ หน้าโซเชียลของโรงแรม และเว็บไซต์ของโรงแรม จะเปิดบริการเหล่านั้นซึ่งมีนโยบายของตนเอง แผนที่ในเว็บไซต์นี้เป็นภาพนิ่งและไม่ได้โหลดข้อมูลจากผู้ให้บริการแผนที่ ส่วนแบบอักษรและภาพถ่ายให้บริการจากเว็บไซต์นี้เอง"],
      },
    },
    {
      h: { en: "Where the site is hosted", th: "ผู้ให้บริการโฮสต์เว็บไซต์" },
      p: {
        en: ["This preview is hosted on GitHub Pages. Like any web host, GitHub may record technical details such as your IP address when your browser requests a page. O2 Design Studio does not receive or use those records."],
        th: ["เว็บไซต์ตัวอย่างนี้โฮสต์บน GitHub Pages เช่นเดียวกับผู้ให้บริการโฮสต์ทั่วไป GitHub อาจบันทึกข้อมูลทางเทคนิค เช่น หมายเลข IP เมื่อเบราว์เซอร์ของคุณเรียกดูหน้าเว็บ O2 Design Studio ไม่ได้รับและไม่ได้ใช้ข้อมูลดังกล่าว"],
      },
      preview: true,
    },
    {
      h: { en: "Questions", th: "คำถามเพิ่มเติม" },
      p: {
        en: ["For questions about this concept website, contact O2 Design Studio through o2-designstudio.com. For anything about a booking or your stay, contact the hotel."],
        th: ["หากมีคำถามเกี่ยวกับเว็บไซต์ตัวอย่างนี้ ติดต่อ O2 Design Studio ได้ที่ o2-designstudio.com หากเป็นเรื่องการจองหรือการเข้าพัก กรุณาติดต่อโรงแรม"],
      },
      preview: true,
    },
  ],
};

export const termsPage = {
  title: { en: "How booking works here", th: "จากเว็บไซต์นี้สู่หน้าจองของโรงแรม" },
  description: {
    en: "This website does not take bookings. Read how it hands you to the hotel's official booking page, what is passed on, and where prices and payment live.",
    th: "เว็บไซต์นี้ไม่ได้รับจองห้องพัก อ่านขั้นตอนการส่งต่อไปยังหน้าจองทางการของโรงแรม ข้อมูลที่ถูกส่งต่อ และแหล่งที่แสดงราคา การชำระเงิน และเงื่อนไขการยกเลิก",
  },
  eyebrow: { en: "Booking terms", th: "เงื่อนไขการจอง" },
  h1: { en: "How booking <em>works here.</em>", th: "ขั้นตอน<em>การจอง</em>" },
  lead: {
    en: "This website helps you choose. The hotel's own booking page is where a reservation is made.",
    th: "เว็บไซต์นี้ช่วยให้คุณเลือกห้อง ส่วนการจองทำที่หน้าจองของโรงแรม",
  },
  sections: [
    {
      h: { en: "This site does not take bookings", th: "เว็บไซต์นี้ไม่ได้รับจองห้องพัก" },
      p: {
        en: ["No rate, availability, payment or confirmation is shown or handled here. Using the stay planner or an enquiry on this website does not reserve a room."],
        th: ["เว็บไซต์นี้ไม่ได้แสดงหรือดำเนินการเรื่องราคา ห้องว่าง การชำระเงิน หรือการยืนยันการจอง การใช้ตัววางแผนการเข้าพักหรือการสอบถามผ่านเว็บไซต์นี้ไม่ถือเป็นการจองห้องพัก"],
      },
    },
    {
      h: { en: "Where the reservation is made", th: "จองห้องพักได้ที่ใด" },
      p: {
        en: ["On the hotel's official booking page at granddiamondsuites.com, which runs on the Exely Booking Engine. The hotel and its provider own the rate, the room inventory, the payment and your confirmation."],
        th: ["ที่หน้าจองทางการของโรงแรมบนเว็บไซต์ granddiamondsuites.com ซึ่งใช้ระบบ Exely Booking Engine โรงแรมและผู้ให้บริการระบบเป็นผู้ดูแลราคา จำนวนห้องว่าง การชำระเงิน และการยืนยันการจองของคุณ"],
      },
    },
    {
      h: { en: "What is passed on", th: "ข้อมูลที่ถูกส่งต่อ" },
      p: {
        en: [
          "The number of adults, the ages of any children you add and, if you choose dates, your arrival date and number of nights. The booking page was checked on {checked} and showed each of those details as entered.",
          "Extra rooms and promo codes are entered on the booking page. You also choose the suite and rate there. Before paying, check that the dates, guests and room on that page are the ones you want.",
        ],
        th: [
          "จำนวนผู้ใหญ่ อายุของเด็กที่ระบุไว้ และหากเลือกวันที่ จะรวมวันเข้าพักและจำนวนคืน หน้าจองได้รับการตรวจสอบเมื่อวันที่ {checked} และแสดงข้อมูลแต่ละรายการตรงตามที่ระบุ",
          "การเพิ่มห้อง การกรอกรหัสโปรโมชั่น และการเลือกประเภทห้องและราคา ทำในหน้าจองทั้งหมด ก่อนชำระเงิน ควรตรวจสอบวันที่ จำนวนผู้เข้าพัก และห้องพักในหน้านั้นให้ตรงกับที่ต้องการ",
        ],
      },
    },
    {
      h: { en: "Prices, payment and cancellation", th: "ราคา การชำระเงิน และการยกเลิก" },
      p: {
        en: ["Each rate on the booking page states its price, what it includes, and its payment and cancellation conditions before you confirm. Those conditions, and the confirmation the hotel sends you, are the terms of your stay. This website does not restate them."],
        th: ["แต่ละราคาในหน้าจองจะแสดงราคาเป็นเงินบาท สิ่งที่รวมอยู่ในราคา และเงื่อนไขการชำระเงินและการยกเลิกก่อนยืนยันการจอง เงื่อนไขดังกล่าวพร้อมทั้งเอกสารยืนยันที่โรงแรมส่งให้ คือเงื่อนไขของการเข้าพัก เว็บไซต์นี้ไม่ได้นำมาแสดงซ้ำ"],
      },
    },
    {
      h: { en: "Enquiries", th: "การสอบถาม" },
      p: {
        en: ["The enquiry helper writes a message for you to send from your own email. It is a question to the hotel. A reservation exists only when the hotel or its booking page confirms one."],
        th: ["ตัวช่วยเรียบเรียงข้อความสอบถามจะเขียนข้อความให้คุณส่งจากอีเมลของคุณเอง ถือเป็นการสอบถามไปยังโรงแรมเท่านั้น การจองจะมีผลเมื่อโรงแรมหรือหน้าจองยืนยันแล้ว"],
      },
    },
    {
      h: { en: "Accuracy of details on this site", th: "ความถูกต้องของข้อมูลในเว็บไซต์นี้" },
      p: {
        en: ["Hotel details here were read from the hotel's website and booking page on {checked}. They can change, and where this site and the hotel differ, the hotel is right."],
        th: ["ข้อมูลโรงแรมในเว็บไซต์นี้อ่านจากเว็บไซต์และหน้าจองของโรงแรมเมื่อวันที่ {checked} ข้อมูลอาจเปลี่ยนแปลงได้ หากข้อมูลในเว็บไซต์นี้ไม่ตรงกับของโรงแรม ให้ยึดข้อมูลของโรงแรมเป็นหลัก"],
      },
    },
  ],
};

export const notFoundPage = {
  title: { en: "Page not found", th: "ไม่พบหน้าที่ต้องการ" },
  h1: { en: "This page is not here.", th: "ไม่พบหน้านี้" },
  text: { en: "The address may be mistyped, or the page may have moved.", th: "ที่อยู่เว็บอาจพิมพ์ผิด หรือหน้าดังกล่าวอาจถูกย้ายไปแล้ว" },
};
