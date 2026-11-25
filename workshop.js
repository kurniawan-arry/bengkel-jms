(function () {
  const GAS_URL_KEY = "jms_gas_endpoint_v1";
  const PIN_KEY = "jms_cms_admin_pin_v1";
  const AUTH_EXPIRY_KEY = "jms_cms_admin_expiry_v1";
  const HISTORY_KEY = "jms_invoice_history_v1";
  const DEFAULT_WA_NUMBER = "6281286276830";
  const DEFAULT_PIN = "123456";
  const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbwhZnM1-ALdxz83s_ZtKqt_pUpHnDw-Ob4-7GCKa0GcVV2zob1sVOBtDQESEx_ywKPw/exec";
  const SESSION_DURATION_MS = 10 * 60 * 1000; // 10 Menit
  const MAX_DRIVE_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB untuk Google Drive
  const LOGO_INVOICE_SRC = "images/JMS%20Mechanical%20Graffiti%20Sticker.png";
  const FALLBACK_IMG_SRC = "images/1794759372257.jpg";
  const DEFAULT_MAPS_QUERY = "Jl. Jabal Mina Raya No.18, Kelapa Dua, Kecamatan Kelapa Dua, Kabupaten Tangerang, Banten 15810";

  let stateData = window.mergeJmsData({});
  let editingServiceIdx = -1;
  let invoiceItems = [];
  let pendingGalleryUpload = null;
  let activeAdminPin = DEFAULT_PIN;

  function getGasUrl() {
    const stored = String(localStorage.getItem(GAS_URL_KEY) || "").trim();
    const metaUrl = String((stateData && stateData.meta && stateData.meta.appsScriptUrl) || "").trim();
    const fallback = String(DEFAULT_GAS_URL || "").trim();
    return stored || metaUrl || fallback;
  }

  function setGasUrl(url) {
    const clean = String(url || "").trim();
    localStorage.setItem(GAS_URL_KEY, clean);
    if (!stateData.meta) stateData.meta = {};
    stateData.meta.appsScriptUrl = clean;
  }

  function getPin() {
    return String(activeAdminPin || localStorage.getItem(PIN_KEY) || DEFAULT_PIN).trim();
  }

  function syncPinToSheetsMeta(pinValue) {
    const cleanPin = String(pinValue || "").trim();
    if (!cleanPin) return;
    activeAdminPin = cleanPin;
    localStorage.setItem(PIN_KEY, cleanPin);
    if (!stateData.meta) stateData.meta = {};
    stateData.meta.adminPin = cleanPin;
  }

  function startAdminSession() {
    const expiry = Date.now() + SESSION_DURATION_MS;
    localStorage.setItem(AUTH_EXPIRY_KEY, String(expiry));
  }

  function clearAdminSession() {
    localStorage.removeItem(AUTH_EXPIRY_KEY);
  }

  function isLoggedIn() {
    const raw = Number(localStorage.getItem(AUTH_EXPIRY_KEY) || 0);
    if (!raw) return false;
    if (Date.now() >= raw) {
      clearAdminSession();
      return false;
    }
    return true;
  }

  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeImageSrc(rawSrc) {
    const s = String(rawSrc || "").trim();
    if (!s || s.startsWith("drive://")) return FALLBACK_IMG_SRC;

    const driveMatch = s.match(/(?:\/d\/|[?&]id=|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
    }
    return s;
  }

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  function saveHistory(list) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  }

  async function loadCmsFromSheets() {
    const endpoint = getGasUrl();
    if (!endpoint) {
      renderPage();
      return;
    }

    try {
      const sep = endpoint.includes("?") ? "&" : "?";
      const resp = await fetch(`${endpoint}${sep}action=get_cms&t=${Date.now()}`);
      const json = await resp.json();
      if (json && json.status === "ok") {
        const nextLayanan =
          Array.isArray(json.layanan) && json.layanan.length
            ? json.layanan
            : stateData.layanan;
        const nextGaleri =
          Array.isArray(json.galeri) && json.galeri.length
            ? json.galeri
            : stateData.galeri;

        const sheetPin = json.meta && json.meta.adminPin ? String(json.meta.adminPin).trim() : "";
        if (sheetPin) {
          activeAdminPin = sheetPin;
          localStorage.setItem(PIN_KEY, sheetPin);
        }

        const merged = window.mergeJmsData({
          meta: Object.assign({}, json.meta || {}, {
            appsScriptUrl: endpoint,
            adminPin: getPin()
          }),
          layanan: nextLayanan,
          galeri: nextGaleri
        });
        if (json.meta && Array.isArray(json.meta.jamOperasionalList) && json.meta.jamOperasionalList.length) {
          merged.meta.jamOperasional = json.meta.jamOperasionalList;
        }
        stateData = merged;
        if (json.slot && json.slot.keteranganSlot) {
          stateData._slotText = json.slot.keteranganSlot;
        }
      }
    } catch (err) {
      console.warn("Gagal memuat CMS dari Google Sheets:", err);
    }

    renderPage();
  }

  async function saveCmsToSheets() {
    const endpoint = getGasUrl();
    if (!endpoint) {
      alert("Isi terlebih dahulu 'URL Web App Google Apps Script' di Tab 2 (Profil Bengkel & WA).");
      return false;
    }

    if (!stateData.meta) stateData.meta = {};
    stateData.meta.adminPin = getPin();

    try {
      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "save_cms_all",
          meta: stateData.meta,
          layanan: stateData.layanan,
          galeri: stateData.galeri
        })
      });
      renderPage();
      return true;
    } catch (err) {
      alert("Gagal menyimpan ke Google Sheets: " + err.message);
      return false;
    }
  }

  function renderPage() {
    const m = stateData.meta;

    const navNama = document.getElementById("nav-nama-bengkel");
    const navSub = document.getElementById("nav-sub-brand");
    const heroSec = document.getElementById("hero-section");
    const heroTag = document.getElementById("hero-tagline");
    const heroDesc = document.getElementById("hero-deskripsi");
    const footerNama = document.getElementById("footer-nama-bengkel");
    const footerDesc = document.getElementById("footer-deskripsi");
    const footerJam = document.getElementById("footer-jam");
    const footerAlamat = document.getElementById("footer-alamat");
    const footerTelp = document.getElementById("footer-telp");
    const navWa = document.getElementById("nav-cta-wa");

    if (navNama) navNama.textContent = m.namaBengkel;
    if (navSub) navSub.textContent = m.subBrand;
    if (heroTag) heroTag.textContent = m.heroTagline;
    if (heroDesc) heroDesc.textContent = m.heroDeskripsi;
    if (footerNama) footerNama.textContent = m.namaBengkel;
    if (footerDesc) footerDesc.textContent = m.footerDeskripsi;
    if (footerAlamat) footerAlamat.textContent = m.alamat;
    if (footerTelp) footerTelp.textContent = m.telepon;

    const cleanWa = String(m.whatsapp || DEFAULT_WA_NUMBER).replace(/\D/g, "");
    if (navWa && cleanWa) {
      navWa.href = `https://wa.me/${cleanWa}?text=${encodeURIComponent(`Halo ${m.namaBengkel}, saya ingin konsultasi servis mobil.`)}`;
    }

    const mapsQuery = String(m.alamat || "")
      .replace(/^📍\s*/, "")
      .trim() || DEFAULT_MAPS_QUERY;
    const gmapsBtn = document.getElementById("btn-buka-gmaps");
    if (gmapsBtn) {
      gmapsBtn.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;
    }

    if (heroSec && m.heroBg) {
      heroSec.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.85)), url('${m.heroBg}')`;
    }

    if (footerJam && Array.isArray(m.jamOperasional)) {
      footerJam.innerHTML = m.jamOperasional.map((j) => `<li>${esc(j)}</li>`).join("");
    }

    if (window.JMS_PRICELIST) {
      window.JMS_PRICELIST.renderCards("daftar-layanan", stateData.layanan, (namaLayanan) => {
        const sel = document.getElementById("pilihan-layanan");
        if (sel && namaLayanan) sel.value = namaLayanan;
      });
      window.JMS_PRICELIST.renderSelect("pilihan-layanan", stateData.layanan);
    }

    renderGaleri();

    const banner = document.getElementById("status-slot");
    if (banner) {
      banner.textContent = stateData._slotText || "🟢 Bengkel Siap Menerima Booking Servis";
    }
  }

  function renderGaleri() {
    const wrap = document.getElementById("galeri-container");
    if (!wrap) return;
    if (!stateData.galeri || !stateData.galeri.length) {
      wrap.innerHTML = `<p class="text-slate-400 text-sm col-span-full text-center">Belum ada dokumentasi galeri.</p>`;
      return;
    }
    wrap.innerHTML = stateData.galeri
      .map(
        (g) => `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <img src="${esc(normalizeImageSrc(g.gambar))}" alt="${esc(g.judul || "Galeri JMS")}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_IMG_SRC}';" class="w-full h-52 object-cover bg-slate-800">
          <div class="p-5">
            <h4 class="font-bold text-white text-base mb-1">${esc(g.judul || "")}</h4>
            <p class="text-slate-400 text-xs leading-relaxed">${esc(g.keterangan || "")}</p>
          </div>
        </div>
      `
      )
      .join("");
  }

  function bindForm() {
    const form = document.getElementById("booking-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const nama = document.getElementById("nama-pelanggan").value.trim();
      const mobil = document.getElementById("mobil-pelanggan").value.trim();
      const sel = document.getElementById("pilihan-layanan");
      const layanan = sel.value;
      const opt = sel.options[sel.selectedIndex];
      const kodePerbaikan = opt ? opt.getAttribute("data-kode") || "" : "";
      const catatan = document.getElementById("catatan-pelanggan").value.trim();

      const endpoint = getGasUrl();
      if (endpoint) {
        try {
          fetch(endpoint, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ nama, mobil, layanan, kodePerbaikan, status: "Antri" })
          });
        } catch (_) {}
      }

      const cleanWa = String(stateData.meta.whatsapp || DEFAULT_WA_NUMBER).replace(/\D/g, "");
      const msg = [
        `Halo *${stateData.meta.namaBengkel}*, saya ingin booking servis mobil:`,
        `• Nama: ${nama}`,
        `• Mobil & Plat: ${mobil}`,
        `• Layanan: ${layanan}${kodePerbaikan ? ` (${kodePerbaikan})` : ""}`,
        catatan ? `• Catatan: ${catatan}` : ""
      ]
        .filter(Boolean)
        .join("\n");

      if (cleanWa) {
        window.open(`https://wa.me/${cleanWa}?text=${encodeURIComponent(msg)}`, "_blank");
      }
      form.reset();
    });
  }

  function generateInvoiceNumber() {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const rand = String(Math.floor(100 + Math.random() * 900));
    return `INV-JMS-${ymd}-${rand}`;
  }

  function createFullInvoiceClone() {
    const sourceEl = document.getElementById("inv-preview-paper");
    if (!sourceEl) return null;

    const host = document.createElement("div");
    host.id = "jms-pdf-render-host";
    host.style.cssText =
      "position:fixed;left:-12000px;top:0;width:680px;background:#ffffff;z-index:-1;padding:0;margin:0;overflow:visible;";

    const clone = sourceEl.cloneNode(true);
    clone.style.cssText =
      "width:680px;max-width:680px;min-width:680px;background:#ffffff;color:#0f172a;padding:18px;border:1px solid #cbd5e1;border-radius:10px;box-shadow:none;overflow:visible;height:auto;font-size:11px;line-height:1.35;";

    clone.querySelectorAll("table th, table td").forEach((cell) => {
      cell.style.padding = "6px 8px";
    });

    host.appendChild(clone);
    document.body.appendChild(host);
    return { host, clone };
  }

  async function renderPdfWorker(filename) {
    const built = createFullInvoiceClone();
    if (!built) return null;
    const { host, clone } = built;

    try {
      await new Promise((r) => setTimeout(r, 150));
      const worker = window.html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: filename,
          image: { type: "jpeg", quality: 0.96 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 680,
            width: 680,
            height: clone.scrollHeight + 16
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        })
        .from(clone);

      return { worker, host };
    } catch (err) {
      if (host && host.parentNode) host.parentNode.removeChild(host);
      throw err;
    }
  }

  function compressImageFile(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          const base64 = dataUrl.split(",")[1] || "";
          const approxBytes = Math.ceil((base64.length * 3) / 4);
          resolve({ dataUrl, base64, approxBytes, mimeType: "image/jpeg" });
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function uploadGalleryImageToDrive(pendingObj) {
    const endpoint = getGasUrl();
    if (!endpoint || !pendingObj || !pendingObj.imageBase64) return "";

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "upload_gallery_image",
          fileName: pendingObj.fileName,
          mimeType: pendingObj.mimeType || "image/jpeg",
          imageBase64: pendingObj.imageBase64
        })
      });
      const json = await resp.json();
      if (json && json.status === "ok" && json.url) {
        return String(json.url).trim();
      }
    } catch (_) {}

    try {
      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "upload_gallery_image",
          fileName: pendingObj.fileName,
          mimeType: pendingObj.mimeType || "image/jpeg",
          imageBase64: pendingObj.imageBase64
        })
      });
    } catch (_) {}

    return "";
  }

  function initAdmin() {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.textContent = "🔒 Admin JMS";
    trigger.className =
      "fixed bottom-4 left-4 z-40 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold px-3.5 py-2 rounded-full shadow-lg transition-all";
    document.body.appendChild(trigger);

    const modal = document.createElement("div");
    modal.id = "jms-cms-modal";
    modal.className = "fixed inset-0 z-50 hidden bg-black/80 backdrop-blur-sm items-center justify-center p-2 sm:p-4";
    modal.innerHTML = `
      <div class="bg-white text-slate-900 w-full max-w-6xl max-h-[94vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200">
        <div class="bg-slate-950 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-20 gap-2">
          <div class="flex items-center gap-3">
            <img src="${LOGO_INVOICE_SRC}" alt="Logo JMS" class="w-10 h-10 rounded-lg object-contain bg-white p-0.5">
            <div>
              <h3 class="text-base sm:text-lg font-extrabold leading-tight">JMS Admin Console (Database Google Sheets)</h3>
              <p class="text-[11px] text-slate-400">Perubahan &amp; PIN tersinkronisasi ke Google Sheets &amp; Drive lintas perangkat</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" id="cms-lock-btn" class="hidden bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg">Logout</button>
            <button type="button" id="jms-cms-close" class="bg-slate-800 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Tutup ✕</button>
          </div>
        </div>

        <div id="jms-cms-login" class="p-8 max-w-md mx-auto space-y-4">
          <h4 class="text-lg font-extrabold text-slate-900">Masuk Admin Console JMS</h4>
          <p class="text-xs text-slate-500">Masukkan PIN Admin (sesi aktif 10 menit, dan otomatis terkunci saat ditutup). PIN tersinkronisasi lewat Google Sheets.</p>
          <input type="password" id="jms-cms-pin" placeholder="Masukkan PIN Admin" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-600">
          <p id="jms-cms-err" class="text-xs text-red-600 font-semibold hidden">PIN salah. Silakan coba lagi.</p>
          <button type="button" id="jms-cms-enter" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm shadow">Masuk Admin</button>
        </div>

        <div id="jms-cms-editor" class="hidden p-4 sm:p-6 space-y-6">
          <div class="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
            <button type="button" data-tab="tab-1" class="jms-tab-btn bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-sm">1. Layanan, Pricelist &amp; Galeri</button>
            <button type="button" data-tab="tab-2" class="jms-tab-btn bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm">2. Profil Bengkel &amp; WA</button>
            <button type="button" data-tab="tab-3" class="jms-tab-btn bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm">3. Pricelist &amp; Invoice Builder</button>
            <button type="button" data-tab="tab-4" class="jms-tab-btn bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm">4. Sinkronisasi Google Sheets</button>
          </div>

          <!-- TAB 1 -->
          <div id="tab-1" class="jms-tab-pane space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div class="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 h-fit">
                <div class="flex items-center justify-between">
                  <h4 id="srv-form-title" class="font-extrabold text-slate-900 text-base">Tambah Item Layanan / Pricelist</h4>
                  <button type="button" id="srv-reset-form" class="text-xs font-bold text-red-600 hover:underline">Reset Form</button>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Kode *</label>
                    <input type="text" id="srv-kode" placeholder="Cth: SRV-05" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs">
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Estimasi Durasi</label>
                    <input type="text" id="srv-durasi" placeholder="Cth: 60 - 90 Menit" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs">
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Kategori *</label>
                  <input type="text" id="srv-kategori" placeholder="Cth: Mesin &amp; ECU / Sparepart / Tune-Up" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Nama Layanan / Paket *</label>
                  <input type="text" id="srv-nama" placeholder="Cth: Tune-Up &amp; Carbon Clean Mobil" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Harga / Estimasi (Angka Rupiah) *</label>
                  <input type="number" id="srv-nominal" placeholder="Cth: 650000" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Deskripsi Singkat *</label>
                  <textarea id="srv-deskripsi" rows="2" placeholder="Detail pekerjaan atau komponen..." class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"></textarea>
                </div>
                <button type="button" id="srv-save-btn" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs shadow">Simpan ke Pricelist &amp; Google Sheets</button>
              </div>

              <div class="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="font-extrabold text-slate-900 text-base">Daftar Pricelist Aktif (<span id="srv-count">0</span>)</h4>
                  <button type="button" id="srv-restore-default" class="text-xs font-semibold text-blue-600 hover:underline">Refresh dari Google Sheets</button>
                </div>
                <div id="srv-active-list" class="space-y-2.5 max-h-[380px] overflow-y-auto pr-1"></div>
              </div>
            </div>

            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div>
                <h4 class="font-extrabold text-slate-900 text-base">Kelola Foto Galeri Aktivitas JMS (<span id="gal-count">0</span>)</h4>
                <p class="text-xs text-slate-500">Pilih foto (otomatis dikecilkan &amp; dikonversi ke .jpg), klik <strong>+ Tambah Foto</strong> untuk disimpan ke Drive (<code>JMS/galeri</code>) &amp; link-nya ke <code>CMS_Galeri</code>.</p>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start bg-white p-4 rounded-xl border border-slate-200">
                <div class="sm:col-span-3">
                  <label class="block text-xs font-bold text-slate-700 mb-1">Judul Foto *</label>
                  <input type="text" id="gal-judul" placeholder="Cth: Pemeriksaan Transmisi BMW F30" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs">
                </div>
                <div class="sm:col-span-3">
                  <label class="block text-xs font-bold text-slate-700 mb-1">Keterangan</label>
                  <input type="text" id="gal-ket" placeholder="Deskripsi singkat aktivitas" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs">
                </div>
                <div class="sm:col-span-4 space-y-1.5">
                  <label class="block text-xs font-bold text-slate-700">Path / URL Foto atau Upload HP</label>
                  <input type="text" id="gal-url" placeholder="Otomatis terisi saat upload atau isi URL" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs">
                  <div class="flex flex-wrap items-center gap-2">
                    <input type="file" id="gal-file" accept="image/*" class="text-[11px] text-slate-600 max-w-full">
                    <span class="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      Maks. 2 MB (Auto-convert .jpg ke Drive JMS/galeri)
                    </span>
                  </div>
                  <p id="gal-upload-status" class="text-[11px] text-slate-500"></p>
                </div>
                <div class="sm:col-span-2 flex flex-col gap-2">
                  <button type="button" id="gal-add-btn" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl text-xs">+ Tambah Foto</button>
                  <button type="button" id="gal-save-btn" class="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 rounded-xl text-xs">Simpan Galeri</button>
                </div>
              </div>
              <div id="gal-admin-list" class="grid grid-cols-1 sm:grid-cols-3 gap-3"></div>
            </div>
          </div>

          <!-- TAB 2 -->
          <div id="tab-2" class="jms-tab-pane hidden">
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-6 max-w-4xl space-y-4">
              <h4 class="font-extrabold text-slate-900 text-base">Pengaturan Profil Jamal Motor Sport, WhatsApp &amp; PIN Lintas Perangkat</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Nama Bengkel *</label>
                  <input type="text" id="prof-nama" class="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp (Format Internasional, cth: 62812...) *</label>
                  <input type="text" id="prof-wa" class="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Sub-Brand / Badge Navbar</label>
                  <input type="text" id="prof-sub" class="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Kontak / Telepon Footer</label>
                  <input type="text" id="prof-telp" class="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm">
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-slate-700 mb-1">Headline Utama Hero *</label>
                  <input type="text" id="prof-tagline" class="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm">
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-slate-700 mb-1">Subheadline / Deskripsi Hero *</label>
                  <textarea id="prof-hero-desc" rows="2" class="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"></textarea>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Alamat Bengkel</label>
                  <input type="text" id="prof-alamat" class="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Jam Operasional (Pisahkan dengan koma)</label>
                  <input type="text" id="prof-jam" class="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm">
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-slate-700 mb-1">URL Web App Google Apps Script (Database CMS, Antrian, Galeri &amp; Drive Invoice)</label>
                  <input type="text" id="prof-gas" placeholder="https://script.google.com/macros/s/.../exec" class="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm">
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-slate-700 mb-1">Ganti PIN Admin (Sinkron ke Google Sheets untuk HP &amp; Laptop)</label>
                  <input type="password" id="prof-pin" placeholder="Kosongkan jika tidak ingin mengganti PIN saat ini" class="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm">
                </div>
              </div>
              <button type="button" id="prof-save-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow">Simpan Profil &amp; PIN ke Google Sheets</button>
            </div>
          </div>

          <!-- TAB 3 -->
          <div id="tab-3" class="jms-tab-pane hidden space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div class="lg:col-span-6 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-extrabold text-slate-900 text-base">Pricelist &amp; Invoice Builder</h4>
                    <p class="text-xs text-slate-500">Pilih item dari pricelist atau tambah item custom, lalu generate invoice.</p>
                  </div>
                  <button type="button" id="inv-new-no" class="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs">No. Invoice Baru</button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">No. Invoice</label>
                    <input type="text" id="inv-no" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold">
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Tanggal</label>
                    <input type="date" id="inv-tgl" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs">
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Nama Pelanggan</label>
                    <input type="text" id="inv-nama" placeholder="Nama customer" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs">
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">No. WA Pelanggan</label>
                    <input type="text" id="inv-wa" placeholder="62812..." class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs">
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Tipe Mobil</label>
                    <input type="text" id="inv-mobil" placeholder="Cth: Toyota Camry" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs">
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">No. Plat</label>
                    <input type="text" id="inv-plat" placeholder="Cth: B 123 JMS" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs">
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Kilometers (KM)</label>
                    <input type="text" id="inv-km" placeholder="Cth: 45.000 km" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs">
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Pilih Item Pricelist</label>
                    <div class="flex gap-2">
                      <select id="inv-price-select" class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs"></select>
                      <button type="button" id="inv-add-price-btn" class="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-2 rounded-lg text-xs shrink-0">+ Tambah</button>
                    </div>
                  </div>
                </div>

                <div class="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                  <p class="text-xs font-bold text-slate-700">Tambah Item Jasa / Sparepart Custom</p>
                  <div class="grid grid-cols-12 gap-2">
                    <input type="text" id="inv-custom-nama" placeholder="Nama item / jasa" class="col-span-6 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs">
                    <input type="number" id="inv-custom-qty" value="1" min="1" placeholder="Qty" class="col-span-2 border border-slate-300 rounded-lg px-2 py-1.5 text-xs">
                    <input type="number" id="inv-custom-harga" placeholder="Harga" class="col-span-4 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs">
                  </div>
                  <button type="button" id="inv-add-custom-btn" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-1.5 rounded-lg text-xs border border-slate-300">+ Tambah Item Custom</button>
                </div>

                <div id="inv-items-list" class="space-y-1.5 max-h-40 overflow-y-auto"></div>

                <div class="flex flex-wrap gap-2 pt-2">
                  <button type="button" id="inv-save-pdf-drive-btn" class="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs shadow">Simpan PDF ke Drive &amp; Riwayat</button>
                  <button type="button" id="inv-download-pdf-btn" class="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-3 rounded-xl text-xs">Download PDF</button>
                  <button type="button" id="inv-send-wa-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs">Kirim WA</button>
                </div>
              </div>

              <div class="lg:col-span-6 bg-slate-100 border border-slate-200 rounded-2xl p-4 overflow-x-auto">
                <div id="inv-preview-paper" class="bg-white text-slate-900 p-5 rounded-xl border border-slate-300 shadow-sm space-y-4 min-w-[460px]">
                  <div class="flex items-start justify-between border-b border-slate-200 pb-3">
                    <div class="flex items-center gap-3">
                      <img src="${LOGO_INVOICE_SRC}" alt="JMS" class="w-12 h-12 object-contain">
                      <div>
                        <h5 id="prev-bengkel" class="font-extrabold text-sm text-slate-900">Jamal Motor Sport</h5>
                        <p id="prev-alamat" class="text-[11px] text-slate-500 max-w-xs">Jl. Jabal Mina Raya No.18, Kelapa Dua, Kab. Tangerang</p>
                      </div>
                    </div>
                    <div class="text-right text-xs">
                      <p class="font-extrabold text-red-600">INVOICE SERVIS</p>
                      <p id="prev-no" class="font-bold text-slate-800">INV-JMS-0000</p>
                      <p id="prev-tgl" class="text-slate-500 text-[11px]">-</p>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <p><span class="text-slate-500">Pelanggan:</span> <strong id="prev-nama">-</strong></p>
                      <p><span class="text-slate-500">No. WA:</span> <span id="prev-wa">-</span></p>
                    </div>
                    <div>
                      <p><span class="text-slate-500">Kendaraan:</span> <strong id="prev-mobil">-</strong></p>
                      <p><span class="text-slate-500">No. Plat / KM:</span> <span id="prev-plat-km">-</span></p>
                    </div>
                  </div>

                  <table class="w-full text-xs border-collapse">
                    <thead>
                      <tr class="bg-slate-900 text-white">
                        <th class="text-left py-1.5 px-2">Item / Jasa</th>
                        <th class="text-center py-1.5 px-2">Qty</th>
                        <th class="text-right py-1.5 px-2">Harga</th>
                        <th class="text-right py-1.5 px-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody id="prev-items-body" class="divide-y divide-slate-200"></tbody>
                  </table>

                  <div class="flex justify-end border-t border-slate-300 pt-2 text-sm font-extrabold text-slate-900">
                    <span>Total Tagihan: <span id="prev-total" class="text-red-600">Rp 0</span></span>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <h4 class="font-extrabold text-slate-900 text-base">Riwayat Invoice Tersimpan di Perangkat Ini</h4>
              <div id="inv-history-list" class="space-y-2 max-h-48 overflow-y-auto text-xs"></div>
            </div>
          </div>

          <!-- TAB 4 -->
          <div id="tab-4" class="jms-tab-pane hidden">
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-6 max-w-3xl space-y-4">
              <h4 class="font-extrabold text-slate-900 text-base">Sinkronisasi &amp; Backup Google Sheets</h4>
              <p class="text-xs text-slate-600">Paksa sinkronisasi ulang data profil, pricelist, galeri, dan sisa slot antrian dari Google Sheets ke tampilan web.</p>
              <div class="flex flex-wrap gap-3">
                <button type="button" id="sync-pull-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs">Muat Ulang dari Google Sheets</button>
                <button type="button" id="sync-push-btn" class="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs">Simpan Semua State ke Google Sheets</button>
              </div>
              <p id="sync-status-msg" class="text-xs text-slate-600 font-semibold"></p>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const loginBox = document.getElementById("jms-cms-login");
    const editorBox = document.getElementById("jms-cms-editor");
    const pinInput = document.getElementById("jms-cms-pin");
    const errMsg = document.getElementById("jms-cms-err");
    const lockBtn = document.getElementById("cms-lock-btn");

    function showLoginView() {
      loginBox.classList.remove("hidden");
      editorBox.classList.add("hidden");
      lockBtn.classList.add("hidden");
      pinInput.value = "";
      errMsg.classList.add("hidden");
    }

    function showEditorView() {
      loginBox.classList.add("hidden");
      editorBox.classList.remove("hidden");
      lockBtn.classList.remove("hidden");
      fillProfileForm();
      renderServicesList();
      renderGaleriAdminList();
      renderInvoicePriceSelect();
      renderInvoicePreview();
      renderInvoiceHistory();
    }

    function openModal() {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      if (isLoggedIn()) {
        showEditorView();
      } else {
        showLoginView();
        setTimeout(() => pinInput.focus(), 50);
      }
    }

    function closeModal() {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      clearAdminSession();
      showLoginView();
    }

    trigger.addEventListener("click", openModal);
    document.getElementById("jms-cms-close").addEventListener("click", closeModal);
    lockBtn.addEventListener("click", () => {
      clearAdminSession();
      showLoginView();
    });

    document.getElementById("jms-cms-enter").addEventListener("click", () => {
      if (pinInput.value.trim() === getPin()) {
        startAdminSession();
        showEditorView();
      } else {
        errMsg.classList.remove("hidden");
      }
    });

    pinInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        document.getElementById("jms-cms-enter").click();
      }
    });

    document.querySelectorAll(".jms-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-tab");
        document.querySelectorAll(".jms-tab-btn").forEach((b) => {
          b.className = "jms-tab-btn bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm";
        });
        btn.className = "jms-tab-btn bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-sm";
        document.querySelectorAll(".jms-tab-pane").forEach((pane) => pane.classList.add("hidden"));
        document.getElementById(targetId).classList.remove("hidden");
      });
    });

    function resetServiceForm() {
      editingServiceIdx = -1;
      document.getElementById("srv-form-title").textContent = "Tambah Item Layanan / Pricelist";
      document.getElementById("srv-kode").value = "";
      document.getElementById("srv-durasi").value = "";
      document.getElementById("srv-kategori").value = "";
      document.getElementById("srv-nama").value = "";
      document.getElementById("srv-nominal").value = "";
      document.getElementById("srv-deskripsi").value = "";
    }

    function renderServicesList() {
      const listEl = document.getElementById("srv-active-list");
      const countEl = document.getElementById("srv-count");
      const items = stateData.layanan || [];
      countEl.textContent = items.length;
      listEl.innerHTML = items
        .map(
          (item, idx) => `
          <div class="bg-white border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-2">
            <div>
              <p class="text-xs font-extrabold text-slate-900">[${esc(item.kode)}] ${esc(item.nama)}</p>
              <p class="text-[11px] text-slate-500">${esc(item.kategori)} • ${esc(item.durasi)} • <strong class="text-red-600">${esc(item.harga)}</strong></p>
              <p class="text-[11px] text-slate-600 mt-0.5">${esc(item.deskripsi)}</p>
            </div>
            <div class="flex gap-1.5 shrink-0">
              <button type="button" data-edit-srv="${idx}" class="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-lg">Edit</button>
              <button type="button" data-del-srv="${idx}" class="bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-bold px-2.5 py-1 rounded-lg">Hapus</button>
            </div>
          </div>
        `
        )
        .join("");

      listEl.querySelectorAll("[data-edit-srv]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const i = Number(btn.getAttribute("data-edit-srv"));
          const it = stateData.layanan[i];
          if (!it) return;
          editingServiceIdx = i;
          document.getElementById("srv-form-title").textContent = "Edit Item Layanan / Pricelist";
          document.getElementById("srv-kode").value = it.kode || "";
          document.getElementById("srv-durasi").value = it.durasi || "";
          document.getElementById("srv-kategori").value = it.kategori || "";
          document.getElementById("srv-nama").value = it.nama || "";
          document.getElementById("srv-nominal").value = it.nominal || 0;
          document.getElementById("srv-deskripsi").value = it.deskripsi || "";
        });
      });

      listEl.querySelectorAll("[data-del-srv]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const i = Number(btn.getAttribute("data-del-srv"));
          stateData.layanan.splice(i, 1);
          renderServicesList();
          renderInvoicePriceSelect();
          await saveCmsToSheets();
        });
      });
    }

    document.getElementById("srv-reset-form").addEventListener("click", resetServiceForm);
    document.getElementById("srv-save-btn").addEventListener("click", async () => {
      const kode = document.getElementById("srv-kode").value.trim();
      const durasi = document.getElementById("srv-durasi").value.trim() || "60 Menit";
      const kategori = document.getElementById("srv-kategori").value.trim() || "Servis Mobil";
      const nama = document.getElementById("srv-nama").value.trim();
      const nominal = Number(document.getElementById("srv-nominal").value || 0);
      const deskripsi = document.getElementById("srv-deskripsi").value.trim();

      if (!kode || !nama) {
        alert("Kode dan Nama Layanan wajib diisi.");
        return;
      }

      const entry = {
        kode,
        kategori,
        durasi,
        nama,
        nominal,
        harga: `IDR ${nominal.toLocaleString("id-ID")}`,
        deskripsi
      };

      if (editingServiceIdx >= 0) {
        stateData.layanan[editingServiceIdx] = entry;
      } else {
        stateData.layanan.push(entry);
      }

      resetServiceForm();
      renderServicesList();
      renderInvoicePriceSelect();
      const ok = await saveCmsToSheets();
      if (ok) alert("Item layanan tersimpan.");
    });

    document.getElementById("srv-restore-default").addEventListener("click", async () => {
      await loadCmsFromSheets();
      renderServicesList();
      renderInvoicePriceSelect();
    });

    function renderGaleriAdminList() {
      const wrap = document.getElementById("gal-admin-list");
      const countEl = document.getElementById("gal-count");
      const items = stateData.galeri || [];
      countEl.textContent = items.length;
      wrap.innerHTML = items
        .map(
          (g, idx) => `
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
            <img src="${esc(normalizeImageSrc(g.gambar))}" alt="${esc(g.judul)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_IMG_SRC}';" class="w-full h-32 object-cover bg-slate-100">
            <div class="p-3 space-y-1">
              <p class="text-xs font-extrabold text-slate-900">${esc(g.judul)}</p>
              <p class="text-[11px] text-slate-500">${esc(g.keterangan)}</p>
              <button type="button" data-del-gal="${idx}" class="mt-2 bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-bold px-2.5 py-1 rounded-lg">Hapus</button>
            </div>
          </div>
        `
        )
        .join("");

      wrap.querySelectorAll("[data-del-gal]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const idx = Number(btn.getAttribute("data-del-gal"));
          stateData.galeri.splice(idx, 1);
          renderGaleriAdminList();
          renderGaleri();
          await saveCmsToSheets();
        });
      });
    }

    document.getElementById("gal-file").addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      const statusEl = document.getElementById("gal-upload-status");
      if (!file) {
        pendingGalleryUpload = null;
        return;
      }
      try {
        statusEl.textContent = "Mengompresi gambar ke .jpg...";
        const compressed = await compressImageFile(file, 1280, 0.82);
        if (compressed.approxBytes > MAX_DRIVE_UPLOAD_BYTES) {
          statusEl.textContent = "Ukuran gambar tetap melebihi 2 MB setelah kompresi.";
          pendingGalleryUpload = null;
          return;
        }
        pendingGalleryUpload = {
          fileName: file.name,
          mimeType: compressed.mimeType,
          imageBase64: compressed.base64
        };
        statusEl.textContent = `Siap upload (${Math.round(compressed.approxBytes / 1024)} KB). Klik '+ Tambah Foto'.`;
      } catch (_) {
        statusEl.textContent = "Gagal memproses file gambar.";
        pendingGalleryUpload = null;
      }
    });

    document.getElementById("gal-add-btn").addEventListener("click", async () => {
      const judul = document.getElementById("gal-judul").value.trim();
      const keterangan = document.getElementById("gal-ket").value.trim();
      let gambar = document.getElementById("gal-url").value.trim();
      const statusEl = document.getElementById("gal-upload-status");

      if (!judul) {
        alert("Judul foto wajib diisi.");
        return;
      }

      if (pendingGalleryUpload) {
        statusEl.textContent = "Mengunggah ke Google Drive (JMS/galeri)...";
        const uploadedUrl = await uploadGalleryImageToDrive(pendingGalleryUpload);
        if (uploadedUrl) {
          gambar = uploadedUrl;
          document.getElementById("gal-url").value = uploadedUrl;
          statusEl.textContent = "Berhasil diunggah ke Google Drive.";
        } else {
          statusEl.textContent = "Terkirim ke Drive (cek link di sheet CMS_Galeri jika belum muncul).";
        }
        pendingGalleryUpload = null;
      }

      if (!gambar) gambar = FALLBACK_IMG_SRC;
      stateData.galeri.push({ judul, keterangan, gambar });
      document.getElementById("gal-judul").value = "";
      document.getElementById("gal-ket").value = "";
      document.getElementById("gal-url").value = "";
      document.getElementById("gal-file").value = "";

      renderGaleriAdminList();
      renderGaleri();
      await saveCmsToSheets();
    });

    document.getElementById("gal-save-btn").addEventListener("click", async () => {
      const ok = await saveCmsToSheets();
      if (ok) alert("Galeri tersimpan ke Google Sheets.");
    });

    function fillProfileForm() {
      const m = stateData.meta || {};
      document.getElementById("prof-nama").value = m.namaBengkel || "";
      document.getElementById("prof-wa").value = m.whatsapp || DEFAULT_WA_NUMBER;
      document.getElementById("prof-sub").value = m.subBrand || "";
      document.getElementById("prof-telp").value = m.telepon || "";
      document.getElementById("prof-tagline").value = m.heroTagline || "";
      document.getElementById("prof-hero-desc").value = m.heroDeskripsi || "";
      document.getElementById("prof-alamat").value = m.alamat || "";
      document.getElementById("prof-jam").value = Array.isArray(m.jamOperasional)
        ? m.jamOperasional.join(", ")
        : m.jamOperasional || "";
      document.getElementById("prof-gas").value = getGasUrl();
      document.getElementById("prof-pin").value = "";
    }

    document.getElementById("prof-save-btn").addEventListener("click", async () => {
      if (!stateData.meta) stateData.meta = {};
      stateData.meta.namaBengkel = document.getElementById("prof-nama").value.trim() || "Jamal Motor Sport";
      stateData.meta.whatsapp = document.getElementById("prof-wa").value.trim() || DEFAULT_WA_NUMBER;
      stateData.meta.subBrand = document.getElementById("prof-sub").value.trim();
      stateData.meta.telepon = document.getElementById("prof-telp").value.trim();
      stateData.meta.heroTagline = document.getElementById("prof-tagline").value.trim();
      stateData.meta.heroDeskripsi = document.getElementById("prof-hero-desc").value.trim();
      stateData.meta.alamat = document.getElementById("prof-alamat").value.trim();
      const jamRaw = document.getElementById("prof-jam").value.trim();
      stateData.meta.jamOperasional = jamRaw ? jamRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

      const newGas = document.getElementById("prof-gas").value.trim();
      setGasUrl(newGas);

      const newPin = document.getElementById("prof-pin").value.trim();
      if (newPin) {
        syncPinToSheetsMeta(newPin);
        document.getElementById("prof-pin").value = "";
      }

      const ok = await saveCmsToSheets();
      if (ok) alert("Profil, WhatsApp & PIN tersimpan ke Google Sheets.");
    });

    function renderInvoicePriceSelect() {
      const sel = document.getElementById("inv-price-select");
      if (!sel) return;
      const items = stateData.layanan || [];
      sel.innerHTML = items
        .map((it, i) => `<option value="${i}">${esc(it.kode)} - ${esc(it.nama)} (${esc(it.harga)})</option>`)
        .join("");
    }

    function renderInvoicePreview() {
      const m = stateData.meta || {};
      const noInv = document.getElementById("inv-no").value.trim() || generateInvoiceNumber();
      const tgl = document.getElementById("inv-tgl").value || new Date().toISOString().slice(0, 10);
      const nama = document.getElementById("inv-nama").value.trim() || "-";
      const wa = document.getElementById("inv-wa").value.trim() || "-";
      const mobil = document.getElementById("inv-mobil").value.trim() || "-";
      const plat = document.getElementById("inv-plat").value.trim() || "-";
      const km = document.getElementById("inv-km").value.trim() || "-";

      document.getElementById("prev-bengkel").textContent = m.namaBengkel || "Jamal Motor Sport";
      document.getElementById("prev-alamat").textContent = String(m.alamat || "").replace(/^📍\s*/, "");
      document.getElementById("prev-no").textContent = noInv;
      document.getElementById("prev-tgl").textContent = tgl;
      document.getElementById("prev-nama").textContent = nama;
      document.getElementById("prev-wa").textContent = wa;
      document.getElementById("prev-mobil").textContent = mobil;
      document.getElementById("prev-plat-km").textContent = `${plat} / ${km}`;

      const tbody = document.getElementById("prev-items-body");
      const listEl = document.getElementById("inv-items-list");
      let total = 0;

      tbody.innerHTML = invoiceItems
        .map((it) => {
          const sub = Number(it.qty || 1) * Number(it.harga || 0);
          total += sub;
          return `
            <tr>
              <td class="py-1.5 px-2">${esc(it.nama)}</td>
              <td class="py-1.5 px-2 text-center">${Number(it.qty || 1)}</td>
              <td class="py-1.5 px-2 text-right">Rp ${Number(it.harga || 0).toLocaleString("id-ID")}</td>
              <td class="py-1.5 px-2 text-right font-semibold">Rp ${sub.toLocaleString("id-ID")}</td>
            </tr>
          `;
        })
        .join("");

      listEl.innerHTML = invoiceItems
        .map(
          (it, idx) => `
          <div class="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-1.5">
            <span><strong>${esc(it.nama)}</strong> (x${it.qty}) - Rp ${(it.qty * it.harga).toLocaleString("id-ID")}</span>
            <button type="button" data-rm-inv="${idx}" class="text-red-600 font-bold text-xs">✕</button>
          </div>
        `
        )
        .join("");

      listEl.querySelectorAll("[data-rm-inv]").forEach((btn) => {
        btn.addEventListener("click", () => {
          invoiceItems.splice(Number(btn.getAttribute("data-rm-inv")), 1);
          renderInvoicePreview();
        });
      });

      document.getElementById("prev-total").textContent = `Rp ${total.toLocaleString("id-ID")}`;
      return total;
    }

    document.getElementById("inv-no").value = generateInvoiceNumber();
    document.getElementById("inv-tgl").value = new Date().toISOString().slice(0, 10);

    ["inv-no", "inv-tgl", "inv-nama", "inv-wa", "inv-mobil", "inv-plat", "inv-km"].forEach((id) => {
      document.getElementById(id).addEventListener("input", renderInvoicePreview);
    });

    document.getElementById("inv-new-no").addEventListener("click", () => {
      document.getElementById("inv-no").value = generateInvoiceNumber();
      renderInvoicePreview();
    });

    document.getElementById("inv-add-price-btn").addEventListener("click", () => {
      const idx = Number(document.getElementById("inv-price-select").value);
      const item = (stateData.layanan || [])[idx];
      if (!item) return;
      invoiceItems.push({ nama: item.nama, qty: 1, harga: Number(item.nominal || 0) });
      renderInvoicePreview();
    });

    document.getElementById("inv-add-custom-btn").addEventListener("click", () => {
      const nama = document.getElementById("inv-custom-nama").value.trim();
      const qty = Math.max(1, Number(document.getElementById("inv-custom-qty").value || 1));
      const harga = Math.max(0, Number(document.getElementById("inv-custom-harga").value || 0));
      if (!nama) return;
      invoiceItems.push({ nama, qty, harga });
      document.getElementById("inv-custom-nama").value = "";
      document.getElementById("inv-custom-qty").value = "1";
      document.getElementById("inv-custom-harga").value = "";
      renderInvoicePreview();
    });

    function renderInvoiceHistory() {
      const wrap = document.getElementById("inv-history-list");
      const list = getHistory();
      if (!list.length) {
        wrap.innerHTML = `<p class="text-slate-400">Belum ada riwayat invoice.</p>`;
        return;
      }
      wrap.innerHTML = list
        .slice()
        .reverse()
        .map(
          (h) => `
          <div class="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-2">
            <div>
              <strong>${esc(h.noInvoice)}</strong> • ${esc(h.pelanggan)} (${esc(h.kendaraan)}) — <span class="text-red-600 font-bold">Rp ${Number(h.total || 0).toLocaleString("id-ID")}</span>
            </div>
            ${h.fileUrl ? `<a href="${esc(h.fileUrl)}" target="_blank" class="text-blue-600 font-bold underline shrink-0">Buka PDF</a>` : ""}
          </div>
        `
        )
        .join("");
    }

    document.getElementById("inv-download-pdf-btn").addEventListener("click", async () => {
      if (!window.html2pdf) {
        alert("Library html2pdf belum termuat.");
        return;
      }
      const noInv = document.getElementById("inv-no").value.trim() || "INV-JMS";
      const nama = document.getElementById("inv-nama").value.trim() || "Pelanggan";
      const rendered = await renderPdfWorker(`${noInv} - ${nama}.pdf`);
      if (!rendered) return;
      await rendered.worker.save();
      if (rendered.host && rendered.host.parentNode) rendered.host.parentNode.removeChild(rendered.host);
    });

    document.getElementById("inv-save-pdf-drive-btn").addEventListener("click", async () => {
      const endpoint = getGasUrl();
      if (!endpoint) {
        alert("URL Web App Google Apps Script belum diatur.");
        return;
      }
      if (!window.html2pdf) {
        alert("Library html2pdf belum termuat.");
        return;
      }

      const total = renderInvoicePreview();
      const noInvoice = document.getElementById("inv-no").value.trim() || generateInvoiceNumber();
      const tanggal = document.getElementById("inv-tgl").value;
      const pelanggan = document.getElementById("inv-nama").value.trim() || "Pelanggan";
      const waPelanggan = document.getElementById("inv-wa").value.trim() || "-";
      const kendaraan = document.getElementById("inv-mobil").value.trim() || "-";
      const nopol = document.getElementById("inv-plat").value.trim() || "-";

      const rendered = await renderPdfWorker(`${noInvoice} - ${pelanggan}.pdf`);
      if (!rendered) return;

      let pdfBase64 = "";
      try {
        const dataUri = await rendered.worker.outputPdf("datauristring");
        pdfBase64 = String(dataUri || "").split(",")[1] || "";
      } finally {
        if (rendered.host && rendered.host.parentNode) rendered.host.parentNode.removeChild(rendered.host);
      }

      try {
        await fetch(endpoint, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "save_invoice_pdf",
            noInvoice,
            tanggal,
            pelanggan,
            waPelanggan,
            kendaraan,
            nopol,
            total,
            pdfBase64
          })
        });

        const hist = getHistory();
        hist.push({ noInvoice, tanggal, pelanggan, waPelanggan, kendaraan, nopol, total, fileUrl: "" });
        saveHistory(hist);
        renderInvoiceHistory();
        alert("Invoice dikirim untuk disimpan ke Google Drive & Riwayat Invoice.");
      } catch (err) {
        alert("Gagal menyimpan invoice: " + err.message);
      }
    });

    document.getElementById("inv-send-wa-btn").addEventListener("click", () => {
      const total = renderInvoicePreview();
      const targetWa = String(document.getElementById("inv-wa").value || "").replace(/\D/g, "");
      if (!targetWa) {
        alert("Isi Nomor WA Pelanggan terlebih dahulu.");
        return;
      }
      const noInv = document.getElementById("inv-no").value.trim();
      const nama = document.getElementById("inv-nama").value.trim() || "Pelanggan";
      const mobil = document.getElementById("inv-mobil").value.trim() || "-";
      const text = `Halo *${nama}*, berikut rincian Invoice *${noInv}* dari *${stateData.meta.namaBengkel}* untuk kendaraan *${mobil}* dengan total *Rp ${total.toLocaleString("id-ID")}*. Terima kasih.`;
      window.open(`https://wa.me/${targetWa}?text=${encodeURIComponent(text)}`, "_blank");
    });

    document.getElementById("sync-pull-btn").addEventListener("click", async () => {
      const msgEl = document.getElementById("sync-status-msg");
      msgEl.textContent = "Memuat data dari Google Sheets...";
      await loadCmsFromSheets();
      fillProfileForm();
      renderServicesList();
      renderGaleriAdminList();
      renderInvoicePriceSelect();
      msgEl.textContent = "Data berhasil diperbarui dari Google Sheets.";
    });

    document.getElementById("sync-push-btn").addEventListener("click", async () => {
      const msgEl = document.getElementById("sync-status-msg");
      msgEl.textContent = "Menyimpan state ke Google Sheets...";
      const ok = await saveCmsToSheets();
      msgEl.textContent = ok ? "Semua data tersimpan ke Google Sheets." : "Gagal menyimpan.";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderPage();
    bindForm();
    initAdmin();
    loadCmsFromSheets();
  });
})();
