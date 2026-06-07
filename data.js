// ============================================================
//  data.js — Dengue Case Database (LocalStorage + seed data)
//  ต.หนองตาคง, อ.โป่งน้ำร้อน, จ.จันทบุรี
// ============================================================

// Base GPS center: Nong Ta Khong subdistrict area
const MAP_CENTER = [12.9580, 102.1910];

// Approximate GPS coordinates per village / location
// (Fine-tuned around Nong Ta Khong, Pong Nam Ron, Chanthaburi)
const VILLAGE_COORDS = {
  "1": [12.9620, 102.1870],
  "2": [12.9565, 102.1830],
  "3": [12.9610, 102.1950],
  "4": [12.9640, 102.2010],
  "5": [12.9490, 102.1880],
  "6": [12.9540, 102.1900],
  "7": [12.9500, 102.1940],
};

// Seed / initial case data
const SEED_CASES = [
  {
    id: "case-001",
    name: "นายอัมรินทร์ เอี่ยมพิทักษ์สกุล",
    age: 32,
    village: "6",
    type: "DF",
    onset: "2026-04-25",
    confirm: "2026-04-27",
    address: "บ้านเลขที่ 32 ม.6",
    hospital: "รพ.กรุงเทพ-จันทบุรี",
    school: "-",
    tel: "-",
    cluster: "",
    hrLink: "",
    wbc: null, plt: null, hct: null,
    ns1: "Pos", igm: "Neg", igg: "Neg",
    lat: 12.9542, lng: 102.1905,
    note: "เคสแรกของปี 2569",
    status: "recovered"
  },
  {
    id: "case-002",
    name: "ด.ญ.ชิชญา ผ่านบุตร",
    age: null,
    village: "1",
    type: "DF",
    onset: "2026-04-29",
    confirm: "2026-04-30",
    address: "ม.1",
    hospital: "รพ.กรุงเทพ-จันทบุรี",
    school: "-",
    tel: "-",
    cluster: "",
    hrLink: "",
    wbc: null, plt: null, hct: null,
    ns1: "Pos", igm: "Neg", igg: "Neg",
    lat: 12.9622, lng: 102.1868,
    note: "",
    status: "recovered"
  },
  {
    id: "case-003",
    name: "ด.ญ.ชนม์ณกานต์ การุณ",
    age: 4,
    village: "7",
    type: "DHF",
    onset: "2026-05-10",
    confirm: "2026-05-16",
    address: "100/4 ม.7 คลองตาซิ่ว",
    hospital: "Admit",
    school: "-",
    tel: "-",
    cluster: "คลองตาซิ่ว ม.7",
    hrLink: "",
    wbc: null, plt: null, hct: null,
    ns1: "Pos", igm: "Neg", igg: "Neg",
    lat: 12.9502, lng: 102.1945,
    note: "ดัชนี DHF / Admit",
    status: "recovered"
  },
  {
    id: "case-004",
    name: "ด.ญ.วิภาดา เหลาซื่อ",
    age: 7,
    village: "7",
    type: "DF",
    onset: "2026-05-12",
    confirm: "2026-05-17",
    address: "บ้านสวน ม.7 คลองตาซิ่ว",
    hospital: "Admit",
    school: "-",
    tel: "-",
    cluster: "คลองตาซิ่ว ม.7",
    hrLink: "ชนม์ณกานต์ การุณ",
    wbc: null, plt: null, hct: null,
    ns1: "Pos", igm: "Neg", igg: "Neg",
    lat: 12.9505, lng: 102.1948,
    note: "บ้านห่างเคส 3 ในระยะ 50 เมตร",
    status: "recovered"
  },
  {
    id: "case-005",
    name: "นายเขต เพิน",
    age: 21,
    village: "7",
    type: "DF",
    onset: "2026-05-19",
    confirm: "2026-05-20",
    address: "บ้านสวน ม.7 คลองตาซิ่ว",
    hospital: "Admit",
    school: "-",
    tel: "-",
    cluster: "คลองตาซิ่ว ม.7",
    hrLink: "วิภาดา เหลาซื่อ",
    wbc: null, plt: null, hct: null,
    ns1: "Pos", igm: "Neg", igg: "Neg",
    lat: 12.9507, lng: 102.1950,
    note: "บ้านติดกันในระยะ 50 เมตรกับเคส 3, 4",
    status: "recovered"
  },
  {
    id: "case-006",
    name: "น.ส.เพชรสวรรค์ คำหนองยาง",
    age: 20,
    village: "6",
    type: "DF",
    onset: "2026-05-25",
    confirm: "2026-05-27",
    address: "95/1 ม.6 ซอยข้างอนามัย",
    hospital: "Admit",
    school: "กศน./สกร.",
    tel: "093-5984059",
    cluster: "ม.6",
    hrLink: "",
    wbc: 4150, plt: 187000, hct: 32.8,
    ns1: "Pos", igm: "Neg", igg: "Neg",
    lat: 12.9545, lng: 102.1908,
    note: "CI รัศมี 100 ม. = 0.5 (Day7), CI บ้าน = 0",
    ciHome: 0, ciRadius: 0.5,
    status: "recovered"
  },
  {
    id: "case-007",
    name: "ด.ช.เคน เพิน",
    age: 13,
    village: "7",
    type: "DF",
    onset: "2026-05-25",
    confirm: "2026-05-28",
    address: "บ้านสวน ม.7 คลองตาซิ่ว",
    hospital: "Admit",
    school: "รร.หนองตาคง ม.1/5",
    tel: "098-2355484",
    cluster: "คลองตาซิ่ว ม.7",
    hrLink: "เขต เพิน",
    wbc: 1920, plt: 141000, hct: 39.5,
    ns1: "Pos", igm: "Neg", igg: "Neg",
    lat: 12.9507, lng: 102.1952,
    note: "บ้านเดียวกับนายเขต เพิน, WBC ต่ำมาก",
    status: "active"
  },
  {
    id: "case-008",
    name: "ด.ช.ชนาธิป เนียมหอม",
    age: 10,
    village: "2",
    type: "R/O DF",
    onset: "2026-05-30",
    confirm: "2026-06-01",
    address: "17/3 ม.2",
    hospital: "Admit",
    school: "รร.บ้านคลองคต ป.5",
    tel: "-",
    cluster: "ม.2",
    hrLink: "",
    wbc: 2600, plt: 174000, hct: 35.2,
    ns1: "Neg", igm: "Neg", igg: "Neg",
    lat: 12.9568, lng: 102.1833,
    note: "TT=Pos, NS1=Neg, CI ที่บ้าน=0, CI รร.บ้านคลองคต=29.4 (สูงมาก!)",
    ciHome: 0, ciSchool: 29.4,
    status: "active"
  },
  {
    id: "case-009",
    name: "ด.ญ.พิชชานันท์ มาจุ่ม",
    age: 8,
    village: "2",
    type: "DF",
    onset: "2026-06-05",
    confirm: "2026-06-05",
    address: "26/6 ม.2 หมู่บ้านจางวาง (เลยร้านยายคำ 3 หลัง)",
    hospital: "Admit - มา รพ. 5 และ 6 มิ.ย. 69",
    school: "รร.บ้านจางวาง ป.3",
    tel: "092-3340731",
    cluster: "จางวาง ม.2",
    hrLink: "",
    wbc: 8450, plt: 414000, hct: 29.0,
    ns1: "Pos", igm: "Neg", igg: "Neg",
    lat: 12.9570, lng: 102.1838,
    note: "N 90.5 / L 5.7 / TT=Neg / NS1=Pos / IgM=Neg / IgG=Neg | บ้านอยู่ขวามือ บ้านชั้นเดียว ตรงข้ามอิฐแดง / สวนซอยเกษตรไทย เข้าไป 4 กม. เข้าซอยสะพานน้ำข้ามคลองสวนที่ 5 บ้านพี่กิ้ฟ",
    status: "active"
  },
  {
    id: "case-010",
    name: "น.ส.มนัสวี ทุมโพธิ์",
    age: 15,
    village: "2",
    type: "DF",
    onset: "2026-06-06",
    confirm: "2026-06-07",
    address: "17 ม.2 หมู่บ้านจางวาง (เลยร้านยายคำ 1 หลัง)",
    hospital: "มา รพ. 7 มิ.ย. 69 (DF ไม่ Admit)",
    school: "สกร. (ไม่ได้เดินทางไปเรียน)",
    tel: "063-4944973",
    cluster: "จางวาง ม.2",
    hrLink: "พิชชานันท์ มาจุ่ม",
    wbc: 4790, plt: 172000, hct: 33.3,
    ns1: "Pos", igm: "Neg", igg: "Neg",
    lat: 12.9572, lng: 102.1836,
    note: "N 70.6 / L 19.6 / TT=ไม่ได้ทำ / NS1=Pos / IgM=Neg / IgG=Neg | บ้านห่างจาก ด.ญ.พิชชานันท์ 1 หลัง (ประมาณ 10-15 เมตร)",
    status: "active"
  }
];

// CI data
const CI_DATA = [
  { location: "บ้านเพชรสวรรค์ (ม.6)", ciHome: 0, ciRadius: 0.5, date: "2/6/69", note: "Day 7" },
  { location: "รร.บ้านคลองคต (ม.2)", ciHome: 0, ciSchool: 29.4, date: "2/6/69", note: "เคสชนาธิป - สูงมาก!" },
  { location: "บ้านชนาธิป (ม.2)", ciHome: 0, ciRadius: null, date: "2/6/69", note: "หลังปรับมาตรการ" },
];

// Activity log
const ACTIVITIES = [
  {
    date: "7/6/69",
    text: "แจ้งเคสใหม่: น.ส.มนัสวี ทุมโพธิ์ ม.2 (DF) บ้านห่างจากพิชชานันท์ 1 หลัง — เข้าข่าย Cluster จางวาง"
  },
  {
    date: "6/6/69",
    text: "แจ้งเคสใหม่: ด.ญ.พิชชานันท์ มาจุ่ม ม.2 (DF Admit) เรียน รร.บ้านจางวาง ป.3"
  },
  {
    date: "2/6/69",
    text: "ลงพื้นที่ควบคุมโรคเคสชนาธิป — ขอบคุณนายกบุญเลี้ยง นนทรัตน์, เทศบาลตำบลหนองตาคง, สาธารณสุขอำเภอ, อสม.ม.7 และ อสม.ม.2"
  },
  {
    date: "2/6/69",
    text: "CI บ้านเพชรสวรรค์ Day7 = 0 (pass) | CI รัศมี 100 ม. = 0.5 | CI รร.บ้านคลองคต = 29.4 (อันตราย!)"
  },
  {
    date: "2/6/69",
    text: "พ่นยาควบคุมโรค ม.6 ในวันที่พบเคส — ดำเนินมาตรการ 3-3-1"
  },
  {
    date: "28/5/69",
    text: "แจ้งเคส ด.ช.เคน เพิน ม.7 (DF Admit) — WBC 1920, PLT 141000, NS1 Pos | บ้านเดียวกับนายเขต เพิน"
  },
  {
    date: "27/5/69",
    text: "แจ้งเคส น.ส.เพชรสวรรค์ คำหนองยาง ม.6 (DF) — เริ่มป่วย 25/5 บ้านซอยข้างอนามัย"
  },
];

// Cluster definitions
const CLUSTERS = [
  {
    name: "คลองตาซิ่ว ม.7",
    color: "#ff4d6d",
    cases: ["case-003","case-004","case-005","case-007"],
    description: "4 เคส บ้านใกล้กัน ระยะ 50 เมตร — เคส 3,4,5,7 วงเดียวกัน"
  },
  {
    name: "จางวาง ม.2",
    color: "#b5179e",
    cases: ["case-009","case-010"],
    description: "2 เคสใหม่ มิ.ย.69 บ้านห่างกัน 1 หลัง — ต้องเฝ้าระวัง รร.บ้านจางวาง"
  },
];

// Village summary
const VILLAGE_SUMMARY = {
  "1": 1, "2": 3, "3": 0, "4": 0, "5": 0, "6": 2, "7": 4
};

// ====================================================
//  LocalStorage helpers
// ====================================================
function loadCases() {
  try {
    const stored = localStorage.getItem("dengue_cases_2569_v2");
    if (stored) return JSON.parse(stored);
  } catch(e) {}
  // Return seed data on first load
  saveCases(SEED_CASES);
  return SEED_CASES;
}

function saveCases(cases) {
  localStorage.setItem("dengue_cases_2569_v2", JSON.stringify(cases));
}

function getCaseById(id) {
  return loadCases().find(c => c.id === id);
}

function upsertCase(caseData) {
  let cases = loadCases();
  const idx = cases.findIndex(c => c.id === caseData.id);
  if (idx >= 0) {
    cases[idx] = caseData;
  } else {
    cases.push(caseData);
  }
  saveCases(cases);
}

function deleteCase(id) {
  let cases = loadCases().filter(c => c.id !== id);
  saveCases(cases);
}

function generateId() {
  return "case-" + Date.now().toString(36);
}
