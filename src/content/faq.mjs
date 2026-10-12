/* Questions and answers. An answer states what the hotel has published and
   where; when the hotel has published nothing, it says so and points to the
   hotel. No yes or no is ever guessed.
   {contact} {terms} {compare} {location} {dining} {booking} are replaced with links at build time.
   {checked} is the day the hotel's pages were read; {bookingChecked} the day the booking page's limits were last checked. */

export const faqGroups = [
  { id: "booking", title: { en: "Booking", th: "การจอง" } },
  { id: "suites", title: { en: "Suites and guests", th: "ห้องสวีทและผู้เข้าพัก" } },
  { id: "arrival", title: { en: "Arriving", th: "การเดินทางและการเข้าพัก" } },
  { id: "hotel", title: { en: "At the hotel", th: "ภายในโรงแรม" } },
];

export const faq = [
  {
    id: "where-book", group: "booking",
    q: { en: "Where do I complete my booking?", th: "จองห้องพักให้เสร็จสมบูรณ์ได้ที่ใด" },
    a: {
      en: [
        "On the hotel's own booking page at granddiamondsuites.com. Prices, availability, payment and your confirmation all come from that page, which is run with the hotel's booking provider.",
        "This website does not take bookings. It passes on your arrival date, number of nights, number of adults and the ages of any children, and nothing else.",
      ],
      th: [
        "ที่หน้าจองของโรงแรมบนเว็บไซต์ granddiamondsuites.com ราคา ห้องว่าง การชำระเงิน และการยืนยันการจองทั้งหมดอยู่ในหน้านั้น ซึ่งดำเนินการร่วมกับผู้ให้บริการระบบจองของโรงแรม",
        "เว็บไซต์นี้ไม่ได้รับจองห้องพัก ทำหน้าที่เพียงส่งต่อวันเข้าพัก จำนวนคืน จำนวนผู้ใหญ่ และอายุของเด็กไปยังหน้าจองเท่านั้น",
      ],
    },
  },
  {
    id: "what-carries", group: "booking",
    q: { en: "Which details carry over to the booking page?", th: "ข้อมูลใดบ้างที่ถูกส่งต่อไปยังหน้าจอง" },
    a: {
      en: [
        "Your arrival date, the number of nights, the number of adults and the age of each child you add. This was checked against the booking page on {checked} and again on {bookingChecked}.",
        "Extra rooms and promo codes are added on the booking page itself. You also choose the suite there, so check that the room named on that page is the one you want.",
      ],
      th: [
        "วันเข้าพัก จำนวนคืน จำนวนผู้ใหญ่ และอายุของเด็กแต่ละคนที่ระบุไว้ ตรวจสอบกับหน้าจองแล้วเมื่อวันที่ {checked} และอีกครั้งเมื่อวันที่ {bookingChecked}",
        "การเพิ่มห้อง การใช้รหัสโปรโมชั่น และการเลือกประเภทห้อง ต้องทำในหน้าจองโดยตรง จึงควรตรวจสอบชื่อห้องในหน้านั้นให้ตรงกับที่ต้องการ",
      ],
    },
  },
  {
    id: "long-or-large", group: "booking",
    q: { en: "Can I plan a long stay or a large party here?", th: "วางแผนการเข้าพักระยะยาวหรือการเข้าพักเป็นกลุ่มใหญ่ได้หรือไม่" },
    a: {
      en: [
        "When it was checked on {bookingChecked}, the hotel's booking page took stays of up to {maxNights} nights and up to {maxGuests} guests in one search. That is what the page showed for the requests tried, not a rule the hotel has stated.",
        "For a longer stay or a larger party, the planner does not shorten the dates or drop a guest. It offers the booking page itself, where you can adjust the dates or add a room, or an enquiry with your dates and guests already filled in.",
      ],
      th: [
        "จากการตรวจสอบเมื่อวันที่ {bookingChecked} หน้าจองของโรงแรมรับการเข้าพักได้ไม่เกิน {maxNights} คืน และค้นหาได้ครั้งละไม่เกิน {maxGuests} ท่าน ข้อมูลนี้เป็นสิ่งที่หน้าจองแสดงผลจากการทดลองค้นหา ไม่ใช่เงื่อนไขที่โรงแรมประกาศไว้",
        "หากต้องการเข้าพักนานกว่านั้นหรือมีผู้เข้าพักมากกว่านั้น ตัววางแผนการเข้าพักจะไม่ลดจำนวนคืนหรือตัดจำนวนผู้เข้าพักออก แต่จะเสนอให้ไปยังหน้าจองเพื่อปรับวันที่หรือเพิ่มห้อง หรือเปิดหน้าสอบถามที่กรอกวันที่และจำนวนผู้เข้าพักให้แล้ว",
      ],
    },
  },
  {
    id: "cancellation", group: "booking",
    q: { en: "What are the payment and cancellation terms?", th: "เงื่อนไขการชำระเงินและการยกเลิกเป็นอย่างไร" },
    a: {
      en: [
        "They depend on the rate you choose. Each rate on the booking page shows its own conditions before you confirm, and those are the terms that apply.",
        "This website does not hold or summarise them. See {terms} for how the handover works.",
      ],
      th: [
        "ขึ้นอยู่กับราคาที่เลือก แต่ละราคาในหน้าจองจะแสดงเงื่อนไขของตนเองก่อนยืนยันการจอง และเงื่อนไขนั้นคือเงื่อนไขที่มีผลใช้จริง",
        "เว็บไซต์นี้ไม่ได้เก็บหรือสรุปเงื่อนไขดังกล่าว ดูขั้นตอนการส่งต่อไปยังหน้าจองได้ที่{terms}",
      ],
    },
  },
  {
    id: "deposit", group: "booking",
    q: { en: "Is a deposit taken at check-in?", th: "ต้องวางเงินมัดจำตอนเช็คอินหรือไม่" },
    a: {
      en: ["The hotel has not published a deposit policy. Each rate on the booking page shows its payment conditions before you confirm; for anything collected on arrival, {contact} before you book."],
      th: ["โรงแรมไม่ได้เผยแพร่นโยบายเรื่องเงินมัดจำ แต่ละราคาในหน้าจองจะแสดงเงื่อนไขการชำระเงินก่อนยืนยันการจอง หากต้องการทราบว่ามีการเรียกเก็บเงินใดเมื่อเข้าพัก กรุณา{contact}ก่อนจอง"],
    },
  },
  {
    id: "which-suite", group: "suites",
    q: { en: "Which suite suits a family or a group?", th: "ห้องสวีทแบบใดเหมาะกับครอบครัวหรือกลุ่ม" },
    a: {
      en: [
        "The Family Suite has one king bed and two single beds, with two bathrooms. The Deluxe and Executive suites have two bedrooms with a king and two singles. The Penthouse has two bedrooms with king beds.",
        "The hotel's booking page lists them for up to {occFamily}, {occDeluxe}, {occExecutive} and {occPenthouse} guests. {compare} shows all six side by side.",
      ],
      th: [
        "แฟมิลี่สวีทมีเตียงคิงไซส์ 1 เตียงและเตียงเดี่ยว 2 เตียง พร้อมห้องน้ำ 2 ห้อง ดีลักซ์สวีทและเอ็กเซ็กคูทีฟสวีทมี 2 ห้องนอน เตียงคิงไซส์ 1 เตียงและเตียงเดี่ยว 2 เตียง ส่วนเพนท์เฮาส์สวีทมี 2 ห้องนอนเตียงคิงไซส์",
        "หน้าจองของโรงแรมระบุจำนวนผู้เข้าพักสูงสุดไว้ที่ {occFamily}, {occDeluxe}, {occExecutive} และ {occPenthouse} ท่านตามลำดับ ดูทั้ง 6 แบบเทียบกันได้ที่{compare}",
      ],
    },
  },
  {
    id: "children", group: "suites",
    q: { en: "Do children stay free?", th: "เด็กเข้าพักฟรีหรือไม่" },
    a: {
      en: [
        "The hotel's booking page states \"Free stay for children under 7\". How that applies to bedding and breakfast is not published.",
        "Add each child and their age in the stay planner to see the price for your dates on the booking page, or {contact} first.",
      ],
      th: [
        "หน้าจองของโรงแรมระบุว่า \"พักฟรีสำหรับเด็กอายุต่ำกว่า 7 ปี\" แต่ไม่ได้ระบุรายละเอียดเรื่องเตียงและอาหารเช้า",
        "ระบุจำนวนและอายุของเด็กในตัววางแผนการเข้าพัก เพื่อดูราคาสำหรับวันที่ต้องการในหน้าจอง หรือ{contact}ก่อน",
      ],
    },
  },
  {
    id: "extra-bed", group: "suites",
    q: { en: "Can I add an extra bed or a cot?", th: "ขอเตียงเสริมหรือเตียงเด็กได้หรือไม่" },
    a: {
      en: ["The hotel has not published extra-bed or cot details, or any charge for them. Please {contact} before you book."],
      th: ["โรงแรมไม่ได้เผยแพร่ข้อมูลเรื่องเตียงเสริม เตียงเด็ก หรือค่าใช้จ่ายที่เกี่ยวข้อง กรุณา{contact}ก่อนจอง"],
    },
  },
  {
    id: "smoking", group: "suites",
    q: { en: "Are there smoking and non-smoking suites?", th: "มีห้องสูบบุหรี่ได้และห้องปลอดบุหรี่หรือไม่" },
    a: {
      en: ["The booking page lists the Junior Suite as two separate rooms, smoking and non-smoking. Nothing is published for the other suite types, so ask the hotel if this matters to you."],
      th: ["หน้าจองแยกจูเนียร์สวีทเป็นสองรายการ คือแบบสูบบุหรี่ได้และแบบปลอดบุหรี่ ส่วนห้องประเภทอื่นไม่มีข้อมูลเผยแพร่ หากเรื่องนี้สำคัญ กรุณาสอบถามโรงแรม"],
    },
  },
  {
    id: "outdoor", group: "suites",
    q: { en: "Do all suites have a balcony?", th: "ห้องสวีททุกแบบมีระเบียงหรือไม่" },
    a: {
      en: ["The hotel lists outdoor space for two suites only: a private balcony for the Executive Suite and a private terrace for the Penthouse Suite. The other four are described with city view windows and no outdoor space is listed for them, so ask the hotel if a balcony matters to you."],
      th: ["โรงแรมระบุพื้นที่กลางแจ้งไว้เพียงสองแบบ คือระเบียงส่วนตัวของเอ็กเซ็กคูทีฟสวีท และเทอร์เรซส่วนตัวของเพนท์เฮาส์สวีท ส่วนอีกสี่แบบระบุว่ามีหน้าต่างชมวิวเมือง และไม่ได้ระบุว่ามีพื้นที่กลางแจ้ง หากต้องการห้องที่มีระเบียง กรุณาสอบถามโรงแรม"],
    },
  },
  {
    id: "accessibility", group: "suites",
    q: { en: "Is the hotel suitable for wheelchair users?", th: "โรงแรมรองรับผู้ใช้รถเข็นหรือไม่" },
    a: {
      en: ["The booking page lists a lift among the hotel's amenities. The hotel has not published step-free routes, door widths or adapted bathrooms, so please {contact} before booking and describe what you need."],
      th: ["หน้าจองระบุว่าโรงแรมมีลิฟต์ แต่โรงแรมไม่ได้เผยแพร่ข้อมูลเรื่องเส้นทางที่ไม่มีขั้นบันได ความกว้างของประตู หรือห้องน้ำสำหรับผู้ใช้รถเข็น กรุณา{contact}ก่อนจองและแจ้งสิ่งที่ต้องการ"],
    },
  },
  {
    id: "times", group: "arrival",
    q: { en: "What are the check-in and check-out times?", th: "เช็คอินและเช็คเอาท์ได้เวลาใด" },
    a: {
      en: ["The hotel's website pages do not state them. The summary on its booking page shows check-in from {checkIn} and check-out until {checkOut}, read on {checked}. The front desk is open 24 hours; {contact} if you need an early arrival or a late departure."],
      th: ["หน้าเว็บไซต์ของโรงแรมไม่ได้ระบุเวลาไว้ ส่วนสรุปการจองในหน้าจองแสดงเวลาเช็คอินตั้งแต่ {checkIn} น. และเช็คเอาท์ถึง {checkOut} น. ตามที่อ่านเมื่อวันที่ {checked} แผนกต้อนรับเปิดให้บริการตลอด 24 ชั่วโมง หากต้องการเข้าพักก่อนเวลาหรือออกช้ากว่ากำหนด กรุณา{contact}"],
    },
  },
  {
    id: "airport", group: "arrival",
    q: { en: "How do I reach the hotel from the airport?", th: "เดินทางจากสนามบินมาโรงแรมอย่างไร" },
    a: {
      en: [
        "From Suvarnabhumi Airport, the Airport Rail Link runs to Ratchaprarop, the station on that line that the hotel names.",
        "The Airport Rail Link does not serve Don Mueang Airport. {location} sets out the options for both airports.",
      ],
      th: [
        "จากสนามบินสุวรรณภูมิ สามารถนั่งแอร์พอร์ต เรล ลิงก์มาลงที่สถานีราชปรารภ ซึ่งเป็นสถานีในสายนี้ที่โรงแรมกล่าวถึง",
        "แอร์พอร์ต เรล ลิงก์ไม่ได้ให้บริการที่สนามบินดอนเมือง ดูทางเลือกการเดินทางจากทั้งสองสนามบินได้ที่{location}",
      ],
    },
  },
  {
    id: "parking", group: "arrival",
    q: { en: "Is there parking?", th: "มีที่จอดรถหรือไม่" },
    a: {
      en: ["The hotel lists on-site parking, and its booking page describes it as free indoor parking. A space cannot be reserved through this website, so if you are arriving by car, confirm with the hotel."],
      th: ["โรงแรมระบุว่ามีที่จอดรถภายในโรงแรม และหน้าจองระบุว่าเป็นที่จอดรถในร่มโดยไม่มีค่าใช้จ่าย ไม่สามารถจองที่จอดรถผ่านเว็บไซต์นี้ได้ หากเดินทางด้วยรถยนต์ กรุณายืนยันกับโรงแรม"],
    },
  },
  {
    id: "breakfast", group: "hotel",
    q: { en: "Is breakfast included?", th: "ราคาห้องพักรวมอาหารเช้าหรือไม่" },
    a: {
      en: [
        "The hotel's website does not say. Each rate on the booking page lists what it includes, so check the rate you choose.",
        "Breakfast is an international buffet at Ploy Restaurant, served from {bfOpens} to {bfCloses}. See {dining}.",
      ],
      th: [
        "เว็บไซต์ของโรงแรมไม่ได้ระบุไว้ แต่ละราคาในหน้าจองจะแสดงสิ่งที่รวมอยู่ในราคา จึงควรตรวจสอบราคาที่เลือก",
        "อาหารเช้าเป็นบุฟเฟต์นานาชาติที่ร้านอาหารพลอย ให้บริการเวลา {bfOpens} ถึง {bfCloses} น. ดูเพิ่มเติมที่{dining}",
      ],
    },
  },
  {
    id: "dinner", group: "hotel",
    q: { en: "Does the restaurant serve dinner?", th: "ห้องอาหารให้บริการมื้อค่ำหรือไม่" },
    a: {
      en: ["The published times cover breakfast, {bfOpens} to {bfCloses}, and the à la carte menu, {alcOpens} to {alcCloses} with last order at {lastOrder}. The hotel also mentions dinner and room service without giving times, so ask the hotel about evening meals."],
      th: ["เวลาที่เผยแพร่ไว้ครอบคลุมอาหารเช้า {bfOpens} ถึง {bfCloses} น. และเมนูตามสั่ง {alcOpens} ถึง {alcCloses} น. โดยรับออร์เดอร์สุดท้าย {lastOrder} น. โรงแรมกล่าวถึงมื้อค่ำและรูมเซอร์วิสไว้ด้วย แต่ไม่ได้ระบุเวลา หากต้องการใช้บริการช่วงเย็น กรุณาสอบถามโรงแรม"],
    },
  },
  {
    id: "pool-hours", group: "hotel",
    q: { en: "When are the pool and fitness centre open?", th: "สระว่ายน้ำและฟิตเนสเปิดเวลาใด" },
    a: {
      en: ["Opening times are not published. Ask the front desk, which is open 24 hours."],
      th: ["โรงแรมไม่ได้เผยแพร่เวลาเปิดให้บริการ สอบถามได้ที่แผนกต้อนรับซึ่งเปิดตลอด 24 ชั่วโมง"],
    },
  },
  {
    id: "wifi", group: "hotel",
    q: { en: "Is Wi-Fi free?", th: "Wi-Fi ฟรีหรือไม่" },
    a: {
      en: ["Yes. The hotel lists free Wi-Fi throughout the property and free high-speed Wi-Fi in every suite."],
      th: ["ฟรี โรงแรมระบุว่ามี Wi-Fi ฟรีทั่วทั้งโรงแรม และ Wi-Fi ความเร็วสูงฟรีในห้องสวีททุกห้อง"],
    },
  },
  {
    id: "pets", group: "hotel",
    q: { en: "Are pets allowed?", th: "นำสัตว์เลี้ยงเข้าพักได้หรือไม่" },
    a: {
      en: ["The hotel has not published a pet policy. Please {contact} before you book."],
      th: ["โรงแรมไม่ได้เผยแพร่นโยบายเรื่องสัตว์เลี้ยง กรุณา{contact}ก่อนจอง"],
    },
  },
  {
    id: "meetings", group: "hotel",
    q: { en: "Can I hold a meeting at the hotel?", th: "จัดประชุมที่โรงแรมได้หรือไม่" },
    a: {
      en: ["The hotel lists meeting facilities for business travellers. Room sizes, layouts and equipment are not published, so {contact} with your date and number of people."],
      th: ["โรงแรมระบุว่ามีห้องประชุมสำหรับผู้เดินทางเพื่อธุรกิจ แต่ไม่ได้เผยแพร่ขนาดห้อง รูปแบบการจัดที่นั่ง หรืออุปกรณ์ กรุณา{contact}พร้อมแจ้งวันที่และจำนวนผู้เข้าร่วม"],
    },
  },
  {
    id: "this-site", group: "hotel",
    q: { en: "Who made this website?", th: "ใครเป็นผู้จัดทำเว็บไซต์นี้" },
    a: {
      en: ["O2 Design Studio, as an unofficial design concept. It is not the hotel's website. Hotel details were read from the hotel's own website and booking page on {checked}; the hotel remains the authority on all of them."],
      th: ["O2 Design Studio จัดทำขึ้นเป็นผลงานออกแบบตัวอย่างที่ไม่เป็นทางการ ไม่ใช่เว็บไซต์ของโรงแรม ข้อมูลโรงแรมอ่านจากเว็บไซต์และหน้าจองของโรงแรมเมื่อวันที่ {checked} หากข้อมูลใดไม่ตรงกัน ให้ยึดข้อมูลของโรงแรมเป็นหลัก"],
    },
  },
];

export const faqLinks = {
  contact: { path: "contact/", text: { en: "contact the hotel", th: "ติดต่อโรงแรม" } },
  terms: { path: "booking-terms/", text: { en: "Booking terms", th: "หน้าเงื่อนไขการจอง" } },
  compare: { path: "suites/compare/", text: { en: "The comparison", th: "หน้าเปรียบเทียบห้องสวีท" } },
  location: { path: "location/", text: { en: "The location page", th: "หน้าทำเลที่ตั้ง" } },
  dining: { path: "dining/", text: { en: "Dining", th: "หน้าห้องอาหาร" } },
};
