// ============================================================
//  app.js — Main Application Logic
//  Dengue Surveillance App
// ============================================================

"use strict";

// ====================================================
//  GLOBALS
// ====================================================
let map = null;
let markers = [];
let radiusCircles = [];
let radiusVisible = true;
let currentEditId = null;
let epiChart = null;
let selectedMarkerId = null;    // ติดตาม marker ที่เลือกอยู่
let selectedPulseLayer = null;  // วง pulse animation

// Dashboard mini-map globals
let dashMap = null;
let dashMarkers = [];
let dashCircles = [];
let dashRadiusVisible = true;
let dashSelectedId = null;
let dashSelectedPulse = null;

// ====================================================
//  INIT
// ====================================================
document.addEventListener("DOMContentLoaded", () => {
  updateCurrentDate();
  renderDashboard();
  renderTimeline("all");
  renderCasesTable();
  // Dashboard map — short delay for DOM paint
  setTimeout(() => initDashMap(), 200);
});

function updateCurrentDate() {
  const el = document.getElementById("currentDate");
  if (!el) return;
  const now = new Date();
  const options = { year: "numeric", month: "long", day: "numeric", weekday: "long" };
  // Show as BE (Thai year = AD + 543)
  const thYear = now.getFullYear() + 543;
  const formatted = now.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" }) + " พ.ศ. " + thYear;
  el.textContent = formatted;
}

// ====================================================
//  TAB SWITCHING
// ====================================================
function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
  document.getElementById("content-" + tab).classList.add("active");

  if (tab === "map" && !map) {
    setTimeout(() => initMap(), 100);
  }
  if (tab === "cases") renderCasesTable();
  if (tab === "add" && !currentEditId) resetForm();
}

// ====================================================
//  DASHBOARD
// ====================================================
function renderDashboard() {
  const cases = loadCases();
  const total = cases.length;
  const active = cases.filter(c => c.status === "active").length;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statActive").textContent = active;
  document.getElementById("statCluster").textContent = CLUSTERS.length;
  document.getElementById("alertText").textContent = `กำลังติดตาม ${total} เคส`;

  renderClusterList();
  renderActivityLog();

  // Refresh dash map markers if already initialised
  if (dashMap) renderDashMarkers();
}

// ====================================================
//  DASHBOARD MAP
// ====================================================
function initDashMap() {
  if (dashMap) return;
  const el = document.getElementById("dashboardMap");
  if (!el) return;

  dashMap = L.map("dashboardMap", {
    center: MAP_CENTER,
    zoom: 14,
    zoomControl: true,
    scrollWheelZoom: true,
  });

  // Base layers
  const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '© Google'
  });
  
  const googleStreets = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '© Google'
  });

  googleHybrid.addTo(dashMap);

  L.control.layers({
    "ดาวเทียม (Hybrid)": googleHybrid,
    "ถนน (Streets)": googleStreets
  }).addTo(dashMap);

  renderDashMarkers();
}

function renderDashMarkers() {
  const cases = loadCases();

  dashMarkers.forEach(m => dashMap.removeLayer(m));
  dashCircles.forEach(c => dashMap.removeLayer(c));
  dashMarkers = [];
  dashCircles = [];

  cases.forEach(c => {
    if (!c.lat || !c.lng) return;
    const color = getCaseColor(c.id);

    // รัศมี 100m — ไม่รับ click/hover
    const circle = L.circle([c.lat, c.lng], {
      radius: 100,
      color: "#1a8fc4",
      fillColor: "#1a8fc4",
      fillOpacity: 0.07,
      weight: 1.5,
      dashArray: "6,4",
      interactive: false,
    }).addTo(dashMap);
    dashCircles.push(circle);

    // Marker
    const marker = L.marker([c.lat, c.lng], {
      icon: getMarkerIcon(c.type, color, false, false),
      bubblingMouseEvents: false,
    }).addTo(dashMap);

    marker._caseId = c.id;

    // Hover effect
    marker.on("mouseover", function() {
      if (dashSelectedId !== c.id) this.setIcon(getMarkerIcon(c.type, color, true, false));
      this.openTooltip();
    });
    marker.on("mouseout", function() {
      if (dashSelectedId !== c.id) this.setIcon(getMarkerIcon(c.type, color, false, false));
      this.closeTooltip();
    });

    // Rich tooltip
    const onsetFmt = c.onset ? formatDateTH(c.onset) : "-";
    marker.bindTooltip(
      `<div style="font-family:'Sarabun',sans-serif;min-width:170px">
        <div style="font-weight:800;font-size:0.88rem;color:#1a202c;margin-bottom:4px">${c.name}</div>
        <div style="display:flex;gap:4px;margin-bottom:4px">
          <span style="background:${color}18;color:${color};border:1px solid ${color}55;padding:1px 8px;border-radius:999px;font-size:0.7rem;font-weight:700">${c.type}</span>
          <span style="background:#dbeafe;color:#1a8fc4;border:1px solid #93c5fd;padding:1px 8px;border-radius:999px;font-size:0.7rem;font-weight:700">ม.${c.village}</span>
        </div>
        <div style="font-size:0.73rem;color:#4a5568">🤒 เริ่มป่วย: <b>${onsetFmt}</b></div>
        ${c.address ? `<div style="font-size:0.7rem;color:#718096;margin-top:2px">📍 ${c.address}</div>` : ""}
        <div style="margin-top:5px;font-size:0.68rem;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:4px">🖱️ คลิกเพื่อดูรายละเอียด</div>
      </div>`,
      { permanent: false, direction: "top", offset: [0, -size - 4], opacity: 1, className: "dengue-tooltip" }
    );

    marker.on("click", () => {
      // deselect previous
      if (dashSelectedId) {
        const prev = dashMarkers.find(m => m._caseId === dashSelectedId);
        if (prev) {
          const pCase = getCaseById(dashSelectedId);
          prev.setIcon(getMarkerIcon(pCase?.type, getCaseColor(pCase?.id), false, false));
          prev.setZIndexOffset(0);
        }
      }
      if (dashSelectedPulse) { dashMap.removeLayer(dashSelectedPulse); dashSelectedPulse = null; }

      dashSelectedId = c.id;
      marker.setIcon(getMarkerIcon(c.type, color, false, true));
      marker.setZIndexOffset(1000);

      // Pulse ring
      const baseR = c.type === "DHF" ? 15 : 11;
      dashSelectedPulse = L.circleMarker([c.lat, c.lng], {
        radius: baseR + 8, fillColor: "transparent", color, weight: 2,
        opacity: 0.6, fillOpacity: 0, interactive: false,
      }).addTo(dashMap);
      let grow = true; let pr = baseR + 8;
      const iv = setInterval(() => {
        if (!dashSelectedPulse || !dashMap.hasLayer(dashSelectedPulse)) { clearInterval(iv); return; }
        pr += grow ? 0.8 : -0.8;
        if (pr > baseR + 20) grow = false;
        if (pr < baseR + 8) grow = true;
        dashSelectedPulse.setRadius(pr);
        dashSelectedPulse.setStyle({ opacity: grow ? 0.3 : 0.7 });
      }, 40);
      dashSelectedPulse._iv = iv;

      showDashOverlay(c);
    });

    dashMarkers.push(marker);
  });
}

function showDashOverlay(c) {
  const overlay = document.getElementById("dashMapOverlay");
  const content = document.getElementById("dashOverlayContent");
  const color = getMarkerColor(c.type);
  const onsetFmt = c.onset ? formatDateTH(c.onset) : "-";
  const confirmFmt = c.confirm ? formatDateTH(c.confirm) : "-";

  let labHTML = "";
  if (c.wbc || c.plt || c.hct) {
    labHTML = `<div style="margin-top:8px;padding:8px;background:#f7f9fc;border-radius:6px;font-size:0.75rem;">
      <div style="font-weight:700;color:var(--text-secondary);margin-bottom:4px">🔬 Lab</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        ${c.wbc ? `<div>WBC: <b style="color:${c.wbc < 4000 ? "var(--red)" : "var(--green)"};">${c.wbc.toLocaleString()}</b></div>` : ""}
        ${c.plt ? `<div>PLT: <b style="color:${c.plt < 100000 ? "var(--red)" : "var(--green)"};">${c.plt.toLocaleString()}</b></div>` : ""}
        ${c.hct ? `<div>HCT: <b>${c.hct}%</b></div>` : ""}
        ${c.ns1 ? `<div>NS1: <b style="color:${c.ns1 === "Pos" ? "var(--red)" : "var(--green)"};">${c.ns1}</b></div>` : ""}
      </div>
    </div>`;
  }

  content.innerHTML = `
    <div style="margin-bottom:8px;display:flex;gap:6px;flex-wrap:wrap">
      <span style="background:${color}18;color:${color};border:1px solid ${color}44;padding:2px 10px;border-radius:999px;font-size:0.72rem;font-weight:700">${c.type}</span>
      <span style="background:var(--blue-soft);color:var(--blue);border:1px solid rgba(26,143,196,0.25);padding:2px 10px;border-radius:999px;font-size:0.72rem;font-weight:700">ม.${c.village}</span>
      ${c.cluster ? `<span style="background:var(--purple-soft);color:var(--purple);border:1px solid rgba(139,18,164,0.25);padding:2px 10px;border-radius:999px;font-size:0.72rem;font-weight:700">🔗 ${c.cluster}</span>` : ""}
    </div>
    <div style="font-weight:800;font-size:1.05rem;color:var(--text-primary);margin-bottom:3px">${c.name}</div>
    ${c.age ? `<div style="font-size:0.78rem;color:var(--text-secondary)">อายุ ${c.age} ปี</div>` : ""}
    <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:8px;line-height:1.6">
      🤒 เริ่มป่วย: <b>${onsetFmt}</b><br>
      🔬 พบเชื้อ: <b>${confirmFmt}</b>
      ${c.address ? `<br>📍 ${c.address}` : ""}
      ${c.hrLink ? `<br>🔗 สัมพันธ์: ${c.hrLink}` : ""}
    </div>
    ${labHTML}
    ${c.note ? `<div style="margin-top:8px;font-size:0.75rem;color:var(--yellow);background:var(--yellow-soft);padding:6px 10px;border-radius:6px;border:1px solid rgba(196,156,0,0.2)">📌 ${c.note}</div>` : ""}
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn-table btn-view" onclick="openCaseModal('${c.id}')">📋 ดูรายละเอียด</button>
      <button class="btn-table btn-edit" onclick="editCase('${c.id}')">✏️ แก้ไข</button>
    </div>`;

  overlay.style.display = "block";
  // Pan map to case
  dashMap.panTo([c.lat, c.lng], { animate: true, duration: 0.5 });
}

function closeDashOverlay() {
  document.getElementById("dashMapOverlay").style.display = "none";
  // ล้าง selection
  if (dashSelectedPulse) {
    if (dashSelectedPulse._iv) clearInterval(dashSelectedPulse._iv);
    dashMap.removeLayer(dashSelectedPulse);
    dashSelectedPulse = null;
  }
  if (dashSelectedId) {
    const prev = dashMarkers.find(m => m._caseId === dashSelectedId);
    if (prev) {
      const pc = getCaseById(dashSelectedId);
      prev.setIcon(getMarkerIcon(pc?.type, getCaseColor(pc?.id), false, false));
      prev.setZIndexOffset(0);
    }
    dashSelectedId = null;
  }
}

function resetDashMapView() {
  if (dashMap) dashMap.flyTo(MAP_CENTER, 14, { duration: 1 });
}

function toggleDashRadius() {
  dashRadiusVisible = !dashRadiusVisible;
  dashCircles.forEach(c => {
    if (dashRadiusVisible) c.addTo(dashMap);
    else dashMap.removeLayer(c);
  });
}

function renderClusterList() {
  const container = document.getElementById("clusterList");
  if (!container) return;
  container.innerHTML = "";
  CLUSTERS.forEach(cl => {
    container.innerHTML += `
      <div class="cluster-item" style="border-left-color:${cl.color}">
        <div class="cluster-name">🔗 ${cl.name}</div>
        <div class="cluster-cases">${cl.cases.length} เคส — ${cl.description}</div>
      </div>`;
  });
}

function renderActivityLog() {
  const container = document.getElementById("activityLog");
  if (!container) return;
  container.innerHTML = "";
  ACTIVITIES.forEach(a => {
    container.innerHTML += `
      <div class="activity-item">
        <div class="activity-date">📅 ${a.date}</div>
        <div class="activity-text">${a.text}</div>
      </div>`;
  });
}

// ====================================================
//  TIMELINE
// ====================================================
function renderTimeline(filter) {
  const container = document.getElementById("timelineContainer");
  if (!container) return;
  const cases = loadCases();

  let filtered = cases;
  if (filter === "DHF") filtered = cases.filter(c => c.type === "DHF");
  else if (filter === "DF") filtered = cases.filter(c => c.type === "DF");
  else if (filter === "cluster") filtered = cases.filter(c => c.cluster);

  // Sort by onset date ascending
  filtered = [...filtered].sort((a, b) => {
    if (!a.onset) return 1;
    if (!b.onset) return -1;
    return new Date(a.onset) - new Date(b.onset);
  });

  // Group by month
  const groups = {};
  filtered.forEach(c => {
    const key = c.onset ? c.onset.substring(0, 7) : "ไม่ระบุ";
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });

  container.innerHTML = "";
  Object.keys(groups).sort().forEach(month => {
    const label = month === "ไม่ระบุ" ? "ไม่ระบุวันที่" : formatMonthLabel(month);
    let groupHTML = `<div class="timeline-group">
      <div class="timeline-date-label">${label}</div>`;
    groups[month].forEach(c => {
      const typeBadge = c.type === "DHF"
        ? `<span class="badge badge-DHF">DHF 🔺</span>`
        : c.type === "DF"
        ? `<span class="badge badge-DF">DF ⬛</span>`
        : `<span class="badge badge-RO">R/O DF ⬤</span>`;
      const clusterBadge = c.cluster ? `<span class="badge badge-cluster">🔗 ${c.cluster}</span>` : "";
      const villageBadge = `<span class="badge badge-village">ม.${c.village}</span>`;
      const hrLink = c.hrLink ? `<div class="timeline-hr-link">🔗 สัมพันธ์กับ: ${c.hrLink}</div>` : "";
      const onsetFmt = c.onset ? formatDateTH(c.onset) : "-";
      const confirmFmt = c.confirm ? formatDateTH(c.confirm) : "-";
      const age = c.age ? c.age + " ปี" : "";
      groupHTML += `
        <div class="timeline-card ${c.type}" data-type="${c.type}" onclick="openCaseModal('${c.id}')">
          <div class="timeline-card-top">
            <span class="timeline-name">${c.name} ${age ? "(" + age + ")" : ""}</span>
            <div class="timeline-badges">${typeBadge} ${villageBadge} ${clusterBadge}</div>
          </div>
          <div class="timeline-meta">
            <span>🤒 เริ่มป่วย: ${onsetFmt}</span>
            <span>🔬 พบเชื้อ: ${confirmFmt}</span>
            ${c.address ? `<span>📍 ${c.address}</span>` : ""}
          </div>
          ${hrLink}
        </div>`;
    });
    groupHTML += "</div>";
    container.innerHTML += groupHTML;
  });
}

function filterTimeline(filter, btn) {
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderTimeline(filter);
}

// ====================================================
//  MAP
// ====================================================
function initMap() {
  if (map) return;

  map = L.map("dengueMap", {
    center: MAP_CENTER,
    zoom: 14,
    zoomControl: true,
  });

  // Base layers
  const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '© Google'
  });
  
  const googleStreets = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '© Google'
  });

  googleHybrid.addTo(map);

  L.control.layers({
    "ดาวเทียม (Hybrid)": googleHybrid,
    "ถนน (Streets)": googleStreets
  }).addTo(map);

  renderMapMarkers();
  renderMapCaseList();
}

const CASE_COLORS = [
  "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
  "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe",
  "#008080", "#e6beff", "#9a6324", "#fffac8", "#800000",
  "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080"
];

function getCaseColor(caseId) {
  if (!caseId) return "#1a8fc4";
  let hash = 0;
  for (let i = 0; i < caseId.length; i++) hash = caseId.charCodeAt(i) + ((hash << 5) - hash);
  return CASE_COLORS[Math.abs(hash) % CASE_COLORS.length];
}

function getMarkerIcon(type, color, hover, selected) {
  let size = type === "DHF" ? 26 : 22;
  if (hover) size += 4;
  if (selected) size += 6;
  let svg = '';
  if (type === "DHF") {
    svg = `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><polygon points="12,2 22,22 2,22" fill="${color}" stroke="#fff" stroke-width="2"/></svg>`;
  } else if (type === "DF") {
    svg = `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" fill="${color}" stroke="#fff" stroke-width="2"/></svg>`;
  } else {
    svg = `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${color}" stroke="#fff" stroke-width="2"/></svg>`;
  }
  return L.divIcon({
    html: svg,
    className: 'custom-case-marker',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
}

function renderMapMarkers() {
  const cases = loadCases();

  // Clear old layers
  markers.forEach(m => map.removeLayer(m));
  radiusCircles.forEach(c => map.removeLayer(c));
  if (selectedPulseLayer) { map.removeLayer(selectedPulseLayer); selectedPulseLayer = null; }
  markers = [];
  radiusCircles = [];
  selectedMarkerId = null;

  cases.forEach(c => {
    if (!c.lat || !c.lng) return;
    const color = getCaseColor(c.id);

    // ── รัศมี 100m: interactive:false เพื่อไม่บัง click ──
    const circle = L.circle([c.lat, c.lng], {
      radius: 100,
      color: "#1a8fc4",
      fillColor: "#1a8fc4",
      fillOpacity: 0.07,
      weight: 1.5,
      dashArray: "6,4",
      interactive: false,   // ← กุญแจสำคัญ: ไม่รับ click/hover
    }).addTo(map);
    radiusCircles.push(circle);

    // ── Marker หลัก ──
    const radius = c.type === "DHF" ? 14 : 11;
    const marker = L.marker([c.lat, c.lng], {
      icon: getMarkerIcon(c.type, color, false, false),
      bubblingMouseEvents: false,
    }).addTo(map);

    // caseId เก็บไว้กับ marker
    marker._caseId = c.id;

    // ── Hover: แสดง tooltip สวยงาม ──
    marker.on("mouseover", function(e) {
      if (selectedMarkerId !== c.id) {
        this.setIcon(getMarkerIcon(c.type, color, true, false));
      }
      this.openTooltip();
    });

    marker.on("mouseout", function() {
      if (selectedMarkerId !== c.id) {
        this.setIcon(getMarkerIcon(c.type, color, false, false));
      }
      this.closeTooltip();
    });

    // ── Tooltip (hover card) ──
    const onsetFmt = c.onset ? formatDateTH(c.onset) : "-";
    const wbcColor = (c.wbc && c.wbc < 4000) ? "#e8354a" : "#0a9e76";
    const pltColor = (c.plt && c.plt < 100000) ? "#e8354a" : "#0a9e76";
    const labLine = c.wbc
      ? `<div style="margin-top:4px;font-size:0.72rem">WBC: <b style="color:${wbcColor}">${c.wbc.toLocaleString()}</b> &middot; PLT: <b style="color:${pltColor}">${c.plt ? c.plt.toLocaleString() : "-"}</b></div>`
      : "";
    marker.bindTooltip(
      `<div style="font-family:'Sarabun',sans-serif;min-width:180px">
        <div style="font-weight:800;font-size:0.9rem;color:#1a202c;margin-bottom:4px">${c.name}</div>
        <div style="display:flex;gap:5px;margin-bottom:4px">
          <span style="background:${color}18;color:${color};border:1px solid ${color}55;padding:1px 8px;border-radius:999px;font-size:0.7rem;font-weight:700">${c.type}</span>
          <span style="background:#dbeafe;color:#1a8fc4;border:1px solid #93c5fd;padding:1px 8px;border-radius:999px;font-size:0.7rem;font-weight:700">ม.${c.village}</span>
          ${c.cluster ? `<span style="background:#f3e8ff;color:#8b12a4;border:1px solid #d8b4fe;padding:1px 8px;border-radius:999px;font-size:0.7rem;font-weight:700">🔗Cluster</span>` : ""}
        </div>
        <div style="font-size:0.75rem;color:#4a5568">🤒 เริ่มป่วย: <b>${onsetFmt}</b></div>
        ${c.age ? `<div style="font-size:0.75rem;color:#4a5568">👤 อายุ ${c.age} ปี</div>` : ""}
        ${c.address ? `<div style="font-size:0.72rem;color:#718096;margin-top:2px">📍 ${c.address}</div>` : ""}
        ${labLine}
        <div style="margin-top:6px;font-size:0.7rem;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:4px">🖱️ คลิกเพื่อดูรายละเอียดเพิ่มเติม</div>
      </div>`,
      {
        permanent: false,
        direction: "top",
        offset: [0, -radius - 4],
        opacity: 1,
        className: "dengue-tooltip",
      }
    );

    // ── Click: เลือก marker + แสดง overlay ──
    marker.on("click", function() {
      selectMapMarker(c, this, radius, color);
      showMapOverlay(c);
    });

    markers.push(marker);
  });
}

// เลือก marker + สร้าง pulse ring
function selectMapMarker(c, markerLayer, radius, color) {
  // รีเซ็ต marker เดิม
  if (selectedMarkerId) {
    const prev = markers.find(m => m._caseId === selectedMarkerId);
    if (prev) {
      const pc = getCaseById(selectedMarkerId);
      prev.setIcon(getMarkerIcon(pc?.type, getCaseColor(pc?.id), false, false));
      prev.setZIndexOffset(0);
    }
  }
  if (selectedPulseLayer) { map.removeLayer(selectedPulseLayer); selectedPulseLayer = null; }

  selectedMarkerId = c.id;

  // สไตล์ marker ที่เลือก
  markerLayer.setIcon(getMarkerIcon(c.type, color, false, true));
  markerLayer.setZIndexOffset(1000);

  // สร้าง pulse ring (circle ขยายตัว)
  selectedPulseLayer = L.circleMarker([c.lat, c.lng], {
    radius: radius + 8,
    fillColor: "transparent",
    color: color,
    weight: 2,
    opacity: 0.6,
    fillOpacity: 0,
    interactive: false,
    className: "pulse-ring",
  }).addTo(map);

  // Animate pulse ring
  let growing = true;
  let pulseRadius = radius + 8;
  const pulseInterval = setInterval(() => {
    if (!selectedPulseLayer || !map.hasLayer(selectedPulseLayer)) {
      clearInterval(pulseInterval);
      return;
    }
    if (growing) {
      pulseRadius += 0.8;
      if (pulseRadius > radius + 20) growing = false;
    } else {
      pulseRadius -= 0.8;
      if (pulseRadius < radius + 8) growing = true;
    }
    selectedPulseLayer.setRadius(pulseRadius);
    selectedPulseLayer.setStyle({ opacity: growing ? 0.3 : 0.7 });
  }, 40);

  selectedPulseLayer._pulseInterval = pulseInterval;
}

function renderMapCaseList() {
  const container = document.getElementById("mapCaseList");
  if (!container) return;
  const cases = loadCases();
  container.innerHTML = `<div style="font-size:0.78rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px">รายชื่อเคส (${cases.length} ราย)</div>`;
  cases.forEach(c => {
    const color = getCaseColor(c.id);
    container.innerHTML += `
      <div class="map-case-item" id="listItem-${c.id}" onclick="flyToCase('${c.id}')">
        <div class="map-case-dot" style="background:${color};box-shadow:0 0 6px ${color}"></div>
        <div class="map-case-info">
          <div class="map-case-name">${c.name}</div>
          <div class="map-case-sub">${c.type} · ม.${c.village} ${c.cluster ? "· 🔗" + c.cluster : ""}</div>
        </div>
        <div style="font-size:0.7rem;color:var(--text-muted);white-space:nowrap">${c.onset ? formatDateTH(c.onset) : ""}</div>
      </div>`;
  });
}

function flyToCase(id) {
  const c = getCaseById(id);
  if (!c || !c.lat || !c.lng) return;
  if (!map) { switchTab("map"); setTimeout(() => flyToCase(id), 300); return; }
  switchTab("map");
  map.flyTo([c.lat, c.lng], 17, { duration: 1.0 });

  // หลัง fly เสร็จ ค่อย select marker
  setTimeout(() => {
    const color = getCaseColor(c.id);
    const radius = c.type === "DHF" ? 14 : 11;
    const markerLayer = markers.find(m => m._caseId === id);
    if (markerLayer) selectMapMarker(c, markerLayer, radius, color);
    showMapOverlay(c);
    // highlight list item
    document.querySelectorAll(".map-case-item").forEach(el => el.classList.remove("map-case-item-active"));
    const listEl = document.getElementById("listItem-" + id);
    if (listEl) { listEl.classList.add("map-case-item-active"); listEl.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
  }, 1100);
}

function showMapOverlay(c) {
  const overlay = document.getElementById("mapOverlayInfo");
  const content = document.getElementById("overlayContent");
  const color = getCaseColor(c.id);
  const onsetFmt = c.onset ? formatDateTH(c.onset) : "-";
  const confirmFmt = c.confirm ? formatDateTH(c.confirm) : "-";

  let labHTML = "";
  if (c.wbc || c.plt || c.hct) {
    labHTML = `<div style="margin-top:8px;font-size:0.75rem;">
      <b style="color:var(--text-secondary)">🔬 Lab:</b>
      ${c.wbc ? `WBC: <b style="color:${c.wbc < 4000 ? "var(--red)" : "var(--green)"}">${c.wbc.toLocaleString()}</b>` : ""}
      ${c.plt ? `PLT: <b style="color:${c.plt < 100000 ? "var(--red)" : "var(--green)"}">${c.plt.toLocaleString()}</b>` : ""}
      ${c.hct ? `HCT: <b>${c.hct}%</b>` : ""}
      ${c.ns1 ? `NS1: <b style="color:${c.ns1 === "Pos" ? "var(--red)" : "var(--green)"}">${c.ns1}</b>` : ""}
    </div>`;
  }

  content.innerHTML = `
    <div style="margin-bottom:10px;">
      <span style="background:${color}22;color:${color};border:1px solid ${color}44;padding:3px 10px;border-radius:999px;font-size:0.72rem;font-weight:700">${c.type}</span>
      <span style="background:var(--blue-soft);color:var(--blue);border:1px solid rgba(76,201,240,0.3);padding:3px 10px;border-radius:999px;font-size:0.72rem;font-weight:700;margin-left:6px">ม.${c.village}</span>
    </div>
    <div style="font-weight:800;font-size:1rem;margin-bottom:4px">${c.name}</div>
    ${c.age ? `<div style="font-size:0.78rem;color:var(--text-secondary)">อายุ ${c.age} ปี</div>` : ""}
    <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:8px">
      🤒 เริ่มป่วย: ${onsetFmt}<br>
      🔬 พบเชื้อ: ${confirmFmt}
      ${c.address ? `<br>📍 ${c.address}` : ""}
      ${c.cluster ? `<br>🔗 Cluster: ${c.cluster}` : ""}
    </div>
    ${labHTML}
    ${c.note ? `<div style="margin-top:8px;font-size:0.75rem;color:var(--yellow);background:var(--yellow-soft);padding:6px 10px;border-radius:6px">📌 ${c.note}</div>` : ""}
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn-table btn-view" onclick="openCaseModal('${c.id}')">ดูรายละเอียด</button>
    </div>`;
  overlay.style.display = "block";
}

function closeMapOverlay() {
  document.getElementById("mapOverlayInfo").style.display = "none";
  // ล้าง selection
  if (selectedPulseLayer) {
    if (selectedPulseLayer._pulseInterval) clearInterval(selectedPulseLayer._pulseInterval);
    map.removeLayer(selectedPulseLayer);
    selectedPulseLayer = null;
  }
  if (selectedMarkerId) {
    const prev = markers.find(m => m._caseId === selectedMarkerId);
    if (prev) {
      const pc = getCaseById(selectedMarkerId);
      prev.setIcon(getMarkerIcon(pc?.type, getCaseColor(pc?.id), false, false));
      prev.setZIndexOffset(0);
    }
    selectedMarkerId = null;
  }
  document.querySelectorAll(".map-case-item").forEach(el => el.classList.remove("map-case-item-active"));
}

function resetMapView() {
  if (map) map.flyTo(MAP_CENTER, 14, { duration: 1 });
  closeMapOverlay();
}

function toggleAllRadius() {
  radiusVisible = !radiusVisible;
  radiusCircles.forEach(c => {
    if (radiusVisible) c.addTo(map);
    else map.removeLayer(c);
  });
}

// ====================================================
//  CASES TABLE
// ====================================================
function renderCasesTable() {
  const cases = loadCases();
  const tbody = document.getElementById("casesTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  cases.forEach((c, idx) => {
    const typeBadge = c.type === "DHF"
      ? `<span class="badge badge-DHF">DHF 🔺</span>`
      : c.type === "DF"
      ? `<span class="badge badge-DF">DF ⬛</span>`
      : `<span class="badge badge-RO">R/O DF ⬤</span>`;

    const statusBadge = c.status === "active"
      ? `<span style="color:var(--red);font-size:0.75rem;font-weight:700">🔴 Active</span>`
      : `<span style="color:var(--green);font-size:0.75rem;font-weight:700">✅ ฟื้นตัว</span>`;

    const wbcClass = c.wbc ? (c.wbc < 4000 ? "lab-low" : "lab-normal") : "";
    const pltClass = c.plt ? (c.plt < 100000 ? "lab-low" : "lab-normal") : "";

    tbody.innerHTML += `
      <tr>
        <td style="color:var(--text-secondary);font-weight:700">${idx + 1}</td>
        <td style="font-weight:600">${c.name}</td>
        <td>${c.age || "-"}</td>
        <td><span class="badge badge-village">ม.${c.village}</span></td>
        <td>${typeBadge}</td>
        <td>${c.onset ? formatDateTH(c.onset) : "-"}</td>
        <td>${c.confirm ? formatDateTH(c.confirm) : "-"}</td>
        <td class="lab-value ${wbcClass}">${c.wbc ? c.wbc.toLocaleString() : "-"}</td>
        <td class="lab-value ${pltClass}">${c.plt ? c.plt.toLocaleString() : "-"}</td>
        <td class="lab-value">${c.hct || "-"}</td>
        <td>${c.ns1
          ? `<span style="color:${c.ns1 === "Pos" ? "var(--red)" : "var(--green)"}; font-weight:700">${c.ns1}</span>`
          : "-"}</td>
        <td style="font-size:0.75rem;color:var(--purple)">${c.cluster || "-"}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn-table btn-view" onclick="openCaseModal('${c.id}')">👁</button>
          <button class="btn-table btn-edit" onclick="editCase('${c.id}')">✏️</button>
          <button class="btn-table btn-delete" onclick="confirmDeleteCase('${c.id}','${c.name}')">🗑</button>
        </td>
      </tr>`;
  });
}

function filterCases() {
  const search = document.getElementById("caseSearch")?.value.toLowerCase() || "";
  const typeFilter = document.getElementById("caseFilter")?.value || "all";
  const villageFilter = document.getElementById("villageFilter")?.value || "all";

  const rows = document.querySelectorAll("#casesTableBody tr");
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    const typeMatch = typeFilter === "all" || text.includes(typeFilter.toLowerCase());
    const villageMatch = villageFilter === "all" || text.includes(`ม.${villageFilter}`);
    const searchMatch = !search || text.includes(search);
    row.style.display = (typeMatch && villageMatch && searchMatch) ? "" : "none";
  });
}

// ====================================================
//  CASE MODAL
// ====================================================
function openCaseModal(id) {
  const c = getCaseById(id);
  if (!c) return;
  const modal = document.getElementById("caseModal");
  const content = document.getElementById("modalContent");
  const color = getCaseColor(c.id);
  const onsetFmt = c.onset ? formatDateTH(c.onset) : "-";
  const confirmFmt = c.confirm ? formatDateTH(c.confirm) : "-";

  const clusterInfo = CLUSTERS.find(cl => cl.cases.includes(c.id));

  content.innerHTML = `
    <div class="modal-name">${c.name}</div>
    <div class="modal-meta">
      <span style="background:${color}22;color:${color};border:1px solid ${color}44;padding:3px 12px;border-radius:999px;font-size:0.78rem;font-weight:700">${c.type}</span>
      <span style="margin-left:8px;background:var(--blue-soft);color:var(--blue);border:1px solid rgba(76,201,240,0.3);padding:3px 12px;border-radius:999px;font-size:0.78rem;font-weight:700">ม.${c.village}</span>
      ${c.cluster ? `<span style="margin-left:8px;background:var(--purple-soft);color:var(--purple);border:1px solid rgba(181,23,158,0.3);padding:3px 12px;border-radius:999px;font-size:0.78rem;font-weight:700">🔗 ${c.cluster}</span>` : ""}
    </div>

    <div class="modal-section">
      <div class="modal-section-title">ข้อมูลทั่วไป</div>
      <div class="modal-grid">
        <div class="modal-item">
          <div class="modal-item-label">อายุ</div>
          <div class="modal-item-value">${c.age ? c.age + " ปี" : "-"}</div>
        </div>
        <div class="modal-item">
          <div class="modal-item-label">ที่อยู่</div>
          <div class="modal-item-value" style="font-size:0.82rem">${c.address || "-"}</div>
        </div>
        <div class="modal-item">
          <div class="modal-item-label">วันเริ่มป่วย</div>
          <div class="modal-item-value">🤒 ${onsetFmt}</div>
        </div>
        <div class="modal-item">
          <div class="modal-item-label">วันพบเชื้อ/มา รพ.</div>
          <div class="modal-item-value">🔬 ${confirmFmt}</div>
        </div>
        <div class="modal-item">
          <div class="modal-item-label">สถานที่เรียน/ทำงาน</div>
          <div class="modal-item-value" style="font-size:0.82rem">${c.school || "-"}</div>
        </div>
        <div class="modal-item">
          <div class="modal-item-label">เบอร์โทร</div>
          <div class="modal-item-value">${c.tel || "-"}</div>
        </div>
      </div>
    </div>

    ${c.wbc || c.plt || c.hct || c.ns1 ? `
    <div class="modal-section">
      <div class="modal-section-title">🔬 ผล Laboratory</div>
      <div class="modal-grid">
        ${c.wbc ? `<div class="modal-item">
          <div class="modal-item-label">WBC</div>
          <div class="modal-item-value" style="color:${c.wbc < 4000 ? "var(--red)" : "var(--green)"}">${c.wbc.toLocaleString()} cells/mm³</div>
        </div>` : ""}
        ${c.plt ? `<div class="modal-item">
          <div class="modal-item-label">Platelet (PLT)</div>
          <div class="modal-item-value" style="color:${c.plt < 100000 ? "var(--red)" : "var(--green)"}">${c.plt.toLocaleString()} cells/mm³</div>
        </div>` : ""}
        ${c.hct ? `<div class="modal-item">
          <div class="modal-item-label">HCT</div>
          <div class="modal-item-value">${c.hct}%</div>
        </div>` : ""}
        ${c.ns1 ? `<div class="modal-item">
          <div class="modal-item-label">NS1 Antigen</div>
          <div class="modal-item-value" style="color:${c.ns1 === "Pos" ? "var(--red)" : "var(--green)"};font-size:1.1rem">${c.ns1 === "Pos" ? "🔴 Positive" : "🟢 Negative"}</div>
        </div>` : ""}
        ${c.igm ? `<div class="modal-item">
          <div class="modal-item-label">Dengue IgM</div>
          <div class="modal-item-value" style="color:${c.igm === "Pos" ? "var(--orange)" : "var(--text-secondary)"}">${c.igm}</div>
        </div>` : ""}
        ${c.igg ? `<div class="modal-item">
          <div class="modal-item-label">Dengue IgG</div>
          <div class="modal-item-value" style="color:${c.igg === "Pos" ? "var(--orange)" : "var(--text-secondary)"}">${c.igg}</div>
        </div>` : ""}
      </div>
    </div>` : ""}

    ${c.hrLink ? `
    <div class="modal-section">
      <div class="modal-section-title">🔗 ความสัมพันธ์ Epidemiological</div>
      <div style="background:var(--purple-soft);border:1px solid rgba(181,23,158,0.3);padding:12px;border-radius:8px;font-size:0.85rem;color:var(--purple)">
        สัมพันธ์กับเคส: <b>${c.hrLink}</b>
      </div>
    </div>` : ""}

    ${clusterInfo ? `
    <div class="modal-section">
      <div class="modal-section-title">📍 Cluster</div>
      <div style="background:rgba(255,154,60,0.1);border:1px solid rgba(255,154,60,0.3);padding:12px;border-radius:8px;font-size:0.85rem;color:var(--orange)">
        <b>${clusterInfo.name}</b><br>${clusterInfo.description}
      </div>
    </div>` : ""}

    ${c.note ? `
    <div class="modal-section">
      <div class="modal-section-title">📌 หมายเหตุ</div>
      <div style="background:var(--yellow-soft);border:1px solid rgba(255,209,102,0.3);padding:12px;border-radius:8px;font-size:0.85rem;color:var(--yellow)">${c.note}</div>
    </div>` : ""}

    <div style="display:flex;gap:10px;margin-top:16px">
      <button class="btn-primary" style="padding:10px 20px;font-size:0.85rem" onclick="editCase('${c.id}');closeCaseModal()">✏️ แก้ไขเคส</button>
      <button class="btn-secondary" style="padding:10px 20px;font-size:0.85rem" onclick="flyToCase('${c.id}');closeCaseModal()">🗺️ ดูบนแผนที่</button>
    </div>`;

  modal.classList.add("active");
}

function closeCaseModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById("caseModal").classList.remove("active");
}

// ====================================================
//  FORM — ADD / EDIT CASE
// ====================================================
function resetForm() {
  document.getElementById("caseForm").reset();
  document.getElementById("f_id").value = "";
  document.getElementById("submitBtn").textContent = "💾 บันทึกเคส";
  currentEditId = null;
}

function editCase(id) {
  const c = getCaseById(id);
  if (!c) return;
  currentEditId = id;
  switchTab("add");

  document.getElementById("f_id").value = c.id;
  document.getElementById("f_name").value = c.name || "";
  document.getElementById("f_age").value = c.age || "";
  document.getElementById("f_village").value = c.village || "";
  document.getElementById("f_type").value = c.type || "";
  document.getElementById("f_onset").value = c.onset || "";
  document.getElementById("f_confirm").value = c.confirm || "";
  document.getElementById("f_address").value = c.address || "";
  document.getElementById("f_school").value = c.school || "";
  document.getElementById("f_tel").value = c.tel || "";
  document.getElementById("f_cluster").value = c.cluster || "";
  document.getElementById("f_wbc").value = c.wbc || "";
  document.getElementById("f_plt").value = c.plt || "";
  document.getElementById("f_hct").value = c.hct || "";
  document.getElementById("f_ns1").value = c.ns1 || "";
  document.getElementById("f_igm").value = c.igm || "";
  document.getElementById("f_igg").value = c.igg || "";
  document.getElementById("f_lat").value = c.lat || "";
  document.getElementById("f_lng").value = c.lng || "";
  document.getElementById("f_note").value = c.note || "";

  document.getElementById("submitBtn").textContent = "✏️ อัปเดตเคส";
}

function saveCase(e) {
  e.preventDefault();

  const id = document.getElementById("f_id").value || generateId();
  const caseData = {
    id,
    name: document.getElementById("f_name").value.trim(),
    age: parseInt(document.getElementById("f_age").value) || null,
    village: document.getElementById("f_village").value,
    type: document.getElementById("f_type").value,
    onset: document.getElementById("f_onset").value,
    confirm: document.getElementById("f_confirm").value,
    address: document.getElementById("f_address").value.trim(),
    school: document.getElementById("f_school").value.trim(),
    tel: document.getElementById("f_tel").value.trim(),
    cluster: document.getElementById("f_cluster").value.trim(),
    wbc: parseFloat(document.getElementById("f_wbc").value) || null,
    plt: parseFloat(document.getElementById("f_plt").value) || null,
    hct: parseFloat(document.getElementById("f_hct").value) || null,
    ns1: document.getElementById("f_ns1").value,
    igm: document.getElementById("f_igm").value,
    igg: document.getElementById("f_igg").value,
    lat: parseFloat(document.getElementById("f_lat").value) || null,
    lng: parseFloat(document.getElementById("f_lng").value) || null,
    note: document.getElementById("f_note").value.trim(),
    hrLink: "",
    status: "active",
  };

  upsertCase(caseData);
  showToast("✅ บันทึกเคสเรียบร้อย!", "success");
  resetForm();
  renderDashboard();
  renderTimeline("all");
  renderCasesTable();

  // Refresh maps
  if (map) { renderMapMarkers(); renderMapCaseList(); }
  if (dashMap) renderDashMarkers();
}

function confirmDeleteCase(id, name) {
  if (confirm(`ต้องการลบเคส "${name}" ออกจากระบบ?`)) {
    deleteCase(id);
    showToast("🗑️ ลบเคสเรียบร้อย", "error");
    renderDashboard();
    renderCasesTable();
    renderTimeline("all");
    if (map) { renderMapMarkers(); renderMapCaseList(); }
    if (dashMap) renderDashMarkers();
  }
}

// ====================================================
//  UTILITIES
// ====================================================
function formatDateTH(isoDate) {
  if (!isoDate) return "-";
  const d = new Date(isoDate);
  const thYear = d.getFullYear() + 543;
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${d.getDate()} ${months[d.getMonth()]} ${thYear}`;
}

function formatMonthLabel(ym) {
  const [y, m] = ym.split("-");
  const monthsLong = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const thYear = parseInt(y) + 543;
  return `${monthsLong[parseInt(m) - 1]} ${thYear}`;
}

function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}
