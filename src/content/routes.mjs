/* Getting to the hotel from Bangkok's two airports.

   Checked on 2026-10-08 against: Airports of Thailand (station on Level B1,
   station list), the BTS route map (Airport Rail Link from Phaya Thai to
   Suvarnabhumi; Don Mueang on the SRT Red Line), the Red Line operator's
   station list, the MRT operator's interchange pages and the Bangkok Mass
   Transit Authority's bus listing (routes A1 and A2).

   Deliberately left out: operators' names, fares, journey times, frequencies
   and boarding gates. All of them were changing or disputed between official
   sources on the day they were checked. {d} is replaced with the straight-line
   distance worked out from the coordinates in src/data/places.mjs.

   `steps` are one journey in order. `alt` is a different way to make the
   same journey and is shown after the steps, never as one of them. */

export const routes = [
  {
    id: "suvarnabhumi",
    code: "BKK",
    title: { en: "Suvarnabhumi Airport", th: "สนามบินสุวรรณภูมิ" },
    mode: { en: "By Airport Rail Link", th: "เดินทางด้วยแอร์พอร์ต เรล ลิงก์" },
    intro: null,
    steps: {
      en: [
        "Find the Airport Rail Link station on Level B1 of the terminal.",
        "Take the train towards Phaya Thai and leave at Ratchaprarop. It is the seventh of the line's eight stations, the stop before Phaya Thai.",
        "Ratchaprarop station is {d} from the hotel in a straight line. Walk from there, or take a taxi if you have luggage.",
      ],
      th: [
        "สถานีแอร์พอร์ต เรล ลิงก์อยู่ที่ชั้น B1 ของอาคารผู้โดยสาร",
        "ขึ้นรถไฟมุ่งหน้าพญาไท แล้วลงที่สถานีราชปรารภ ซึ่งเป็นสถานีที่เจ็ดจากทั้งหมดแปดสถานี ก่อนถึงสถานีพญาไทหนึ่งสถานี",
        "สถานีราชปรารภอยู่ห่างจากโรงแรม{d} เมื่อวัดเป็นเส้นตรง เดินต่อจากสถานี หรือนั่งแท็กซี่หากมีสัมภาระ",
      ],
    },
    alt: null,
    note: {
      en: "Check that the line is running to its usual timetable on the day you travel, especially for an early or late flight.",
      th: "ควรตรวจสอบว่ารถไฟให้บริการตามตารางเวลาปกติในวันเดินทาง โดยเฉพาะเที่ยวบินช่วงเช้าตรู่หรือดึก",
    },
    place: "ratchaprarop",
  },
  {
    id: "don-mueang",
    code: "DMK",
    title: { en: "Don Mueang Airport", th: "สนามบินดอนเมือง" },
    mode: { en: "By train or airport bus", th: "เดินทางด้วยรถไฟฟ้าหรือรถโดยสารสนามบิน" },
    intro: {
      en: "The Airport Rail Link does not serve Don Mueang.",
      th: "แอร์พอร์ต เรล ลิงก์ไม่ได้ให้บริการที่สนามบินดอนเมือง",
    },
    steps: {
      en: [
        "By train, take the SRT Red Line from Don Mueang station to Krung Thep Aphiwat Central Terminal.",
        "Change to the MRT Blue Line at Bang Sue and ride to Chatuchak Park.",
        "Change to the BTS at Mo Chit and ride south to Ratchathewi, the BTS station the hotel names.",
      ],
      th: [
        "หากเดินทางด้วยรถไฟฟ้า ขึ้นรถไฟชานเมืองสายสีแดงจากสถานีดอนเมืองไปยังสถานีกลางกรุงเทพอภิวัฒน์",
        "เปลี่ยนเป็นรถไฟฟ้า MRT สายสีน้ำเงินที่สถานีบางซื่อ แล้วลงที่สถานีสวนจตุจักร",
        "เปลี่ยนเป็นรถไฟฟ้า BTS ที่สถานีหมอชิต แล้วนั่งไปทางทิศใต้จนถึงสถานีราชเทวี ซึ่งเป็นสถานี BTS ที่โรงแรมกล่าวถึง",
      ],
    },
    alt: {
      en: "By bus instead: the city transit authority runs airport routes A1 and A2 from Don Mueang. A1 passes Mo Chit BTS station, where you can join the BTS as in step 3. A2 ends at Victory Monument, two BTS stops north of Ratchathewi.",
      th: "หากเลือกเดินทางด้วยรถโดยสารแทน ขสมก. ให้บริการรถโดยสารสนามบินสาย A1 และ A2 จากดอนเมือง สาย A1 ผ่านสถานี BTS หมอชิต ซึ่งต่อรถไฟฟ้า BTS ได้เช่นเดียวกับขั้นตอนที่ 3 ส่วนสาย A2 สิ้นสุดที่อนุสาวรีย์ชัยสมรภูมิ ซึ่งอยู่เหนือสถานีราชเทวีขึ้นไปสองสถานี",
    },
    note: {
      en: "The rail route uses three lines and two changes, so a taxi may be simpler with luggage. Bus routes and boarding points change. Confirm them at the airport on the day.",
      th: "เส้นทางรถไฟฟ้าต้องใช้สามสายและเปลี่ยนขบวนสองครั้ง หากมีสัมภาระ การนั่งแท็กซี่อาจสะดวกกว่า เส้นทางและจุดขึ้นรถโดยสารอาจเปลี่ยนแปลงได้ ควรตรวจสอบที่สนามบินในวันเดินทาง",
    },
    place: "ratchathewi",
  },
];

export const routesMeta = {
  checked: "2026-10-08",
  checkedNote: {
    en: "Routes checked against the airport, rail and bus operators' own published information on {date}. No fares or journey times are given because they vary.",
    th: "ตรวจสอบเส้นทางกับข้อมูลที่สนามบินและผู้ให้บริการรถไฟฟ้าและรถโดยสารเผยแพร่ ณ วันที่ {date} ไม่ได้ระบุค่าโดยสารหรือเวลาเดินทาง เนื่องจากเปลี่ยนแปลงได้",
  },
};
