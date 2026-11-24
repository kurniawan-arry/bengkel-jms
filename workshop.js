(function () {
  const GAS_URL_KEY = "jms_gas_endpoint_v1";
  const PIN_KEY = "jms_cms_admin_pin_v1";
  const AUTH_EXPIRY_KEY = "jms_cms_admin_expiry_v1";
  const HISTORY_KEY = "jms_invoice_history_v1";
  const DEFAULT_PIN = "123456";
  const SESSION_DURATION_MS = 10 * 60 * 1000; // 10 Menit
  const MAX_DRIVE_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB untuk Google Drive
  const MAX_SHEETS_BASE64_BYTES = 35 * 1024; // 35 KB untuk Base64 langsung ke Sheets
  const LOGO_INVOICE_SRC = "images/JMS%20Mechanical%20Graffiti%20Sticker.png";

  let stateData = window.mergeJmsData({});
  let editingServiceIdx = -1;
  let invoiceItems = [];

  function getGasUrl() {
    return (
      localStorage.getItem(GAS_URL_KEY) ||
      (stateData && stateData.meta && stateData.meta.appsScriptUrl) ||
      ""
    ).trim();
  }

  function setGasUrl(url) {
    const clean = String(url || "").trim();
    localStorage.setItem(GAS_URL_KEY, clean);
    if (!stateData.meta) stateData.meta = {};
    stateData.meta.appsScriptUrl = clean;
  }

  function getPin() {
    return localStorage.getItem(PIN_KEY) || DEFAULT_PIN;
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

        const merged = window.mergeJmsData({
          meta: Object.assign({}, json.meta || {}, { appsScriptUrl: endpoint }),
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

    if (heroSec && m.heroBg) {
      heroSec.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.85)), url('${m.heroBg}')`;
    }

    const cleanWa = String(m.whatsapp || "").replace(/\D/g, "");
    if (navWa && cleanWa) {
      navWa.href = `https://wa.me/${cleanWa}?text=${encodeURIComponent(`Halo ${m.namaBengkel}, saya ingin konsultasi servis mobil.`)}`;
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
          <img src="${esc(g.gambar || "")}" alt="${esc(g.judul || "Galeri JMS")}" class="w-full h-52 object-cover">
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

      const cleanWa = String(stateData.meta.whatsapp || "").replace(/\D/g, "");
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
              <p class="text-[11px] text-slate-400">Perubahan tersimpan ke Google Sheets &amp; Drive tanpa export/commit GitHub</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" id="cms-lock-btn" class="hidden bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg">Logout</button>
            <button type="button" id="jms-cms-close" class="bg-slate-800 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Tutup ✕</button>
          </div>
        </div>

        <div id="jms-cms-login" class="p-8 max-w-md mx-auto space-y-4">
          <h4 class="text-lg font-extrabold text-slate-900">Masuk Admin Console JMS</h4>
          <p class="text-xs text-slate-500">Masukkan PIN Admin (sesi aktif 10 menit). Kelola layanan, galeri bengkel, profil, dan invoice pelanggan.</p>
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
                <p class="text-xs text-slate-500">Upload foto dari HP ke Google Drive / Sheets atau isi path gambar seperti <code>images/foto.jpg</code>, lalu simpan ke Google Sheets.</p>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start bg-white p-4 rounded-xl border border-slate-200">
                <div class="sm:col-span-3">
                  <label class="block text-xs font-bold text-slate-700 mb-1">Judul Foto *</label>
                  <input type="text" id="gal-judul" placeholder="Cth: Overhaul Mesin" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs">
                </div>
                <div class="sm:col-span-3">
                  <label class="block text-xs font-bold text-slate-700 mb-1">Keterangan</label>
                  <input type="text" id="gal-ket" placeholder="Deskripsi singkat aktivitas" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs">
                </div>
                <div class="sm:col-span-4 space-y-1.5">
                  <label class="block text-xs font-bold text-slate-700">Path / URL Foto atau Upload HP</label>
                  <input type="text" id="gal-url" placeholder="images/foto.jpg atau URL Drive" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs">
                  <div class="flex flex-wrap items-center gap-2">
                    <input type="file" id="gal-file" accept="image/*" class="text-[11px] text-slate-600 max-w-full">
                    <span class="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      Maks. 2 MB (Drive) • Maks. 35 KB (Sheets)
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
              <h4 class="font-extrabold text-slate-900 text-base">Pengaturan Profil Jamal Motor Sport &amp; WhatsApp</h4>
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
                  <label class="block text-xs font-bold text-slate-700 mb-1">PIN Admin Baru (Kosongkan jika tetap)</label>
                  <input type="password" id="prof-pin" placeholder="Biarkan kosong untuk mempertahankan PIN saat ini" class="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm">
                </div>
              </div>
              <button type="button" id="prof-save-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow">Simpan Profil ke Google Sheets</button>
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
                    <label class="block text-xs font-bold text-slate-700 mb-1">Mekanik</label>
                    <input type="text" id="inv-mekanik" value="Mas Jamal" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs">
                  </div>
                </div>

                <div class="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col sm:flex-row gap-2">
                  <select id="inv-pricelist-select" class="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"></select>
                  <button type="button" id="inv-add-from-pricelist" class="bg-red-600 hover:bg-red-700 text-white font-bold px-3.5 py-2 rounded-lg text-xs whitespace-nowrap">+ Masukkan dari Pricelist</button>
                </div>

                <div class="space-y-2">
                  <div class="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-600 px-1">
                    <span class="col-span-5">Item / Jasa</span>
                    <span class="col-span-2">Qty</span>
                    <span class="col-span-3">Harga (Rp)</span>
                    <span class="col-span-2 text-right">Hapus</span>
                  </div>
                  <div id="inv-items-editor" class="space-y-2"></div>
                  <button type="button" id="inv-add-custom" class="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2 rounded-lg text-xs">+ Tambah Baris Item Custom</button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Diskon (Rp)</label>
                    <input type="number" id="inv-diskon" value="0" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs">
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Catatan Invoice</label>
                    <input type="text" id="inv-catatan" placeholder="Cth: Garansi pengerjaan 14 hari" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs">
                  </div>
                </div>
              </div>

              <div class="lg:col-span-6 space-y-4">
                <div id="inv-preview-paper" class="bg-white border border-slate-300 rounded-2xl p-5 shadow-sm text-slate-900 space-y-4">
                  <div class="flex justify-between items-start border-b border-slate-200 pb-3 gap-2">
                    <div class="flex items-start gap-2.5">
                      <img src="${LOGO_INVOICE_SRC}" alt="Logo JMS" crossorigin="anonymous" class="w-14 h-14 object-contain rounded-lg border border-slate-200 bg-white p-1 shrink-0">
                      <div>
                        <span class="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded">INVOICE SERVIS &amp; PRICELIST</span>
                        <h4 id="prev-bengkel" class="font-extrabold text-base text-slate-900 mt-1">Jamal Motor Sport</h4>
                        <p id="prev-sub" class="text-[11px] text-slate-500">Pro Performance Workshop</p>
                        <p id="prev-alamat" class="text-[10px] text-slate-500 mt-0.5"></p>
                      </div>
                    </div>
                    <div class="text-right shrink-0">
                      <span class="text-[10px] font-bold text-slate-400 uppercase">NOMOR INVOICE</span>
                      <div id="prev-no" class="font-extrabold text-xs text-slate-900">INV-JMS-001</div>
                      <div id="prev-tgl" class="text-[11px] text-slate-500 mt-0.5">Tanggal: -</div>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <span class="text-[10px] font-bold text-red-600 uppercase">DATA PELANGGAN</span>
                      <div id="prev-nama" class="font-bold text-slate-900 mt-0.5">-</div>
                      <div id="prev-wa" class="text-slate-600">WA: -</div>
                      <div id="prev-mekanik" class="text-slate-600">Mekanik: Mas Jamal</div>
                    </div>
                    <div class="text-right">
                      <span class="text-[10px] font-bold text-red-600 uppercase">UNIT MOBIL</span>
                      <div id="prev-mobil" class="font-bold text-slate-900 mt-0.5">-</div>
                      <div id="prev-plat" class="text-slate-600">No. Plat: -</div>
                      <div id="prev-km" class="text-slate-600">Kilometers: -</div>
                    </div>
                  </div>

                  <table class="w-full text-[11px] border-collapse">
                    <thead>
                      <tr class="bg-slate-900 text-white">
                        <th class="text-left py-1.5 px-2.5 rounded-tl-lg">Deskripsi Layanan / Item</th>
                        <th class="text-center py-1.5 px-2">Qty</th>
                        <th class="text-right py-1.5 px-2.5">Harga</th>
                        <th class="text-right py-1.5 px-2.5 rounded-tr-lg">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody id="prev-items-body" class="divide-y divide-slate-200"></tbody>
                  </table>

                  <div class="flex justify-between items-start pt-2 border-t border-slate-200 text-[11px]">
                    <div class="max-w-[55%] text-slate-500">
                      <div id="prev-catatan" class="italic"></div>
                      <p class="mt-1.5 text-[10px]">Terima kasih telah mempercayakan perawatan mobil Anda di JMS.</p>
                    </div>
                    <div class="text-right space-y-1">
                      <div class="text-slate-600">Subtotal: <strong id="prev-subtotal">Rp 0</strong></div>
                      <div class="text-slate-600">Diskon: <strong id="prev-diskon">- Rp 0</strong></div>
                      <div class="text-xs font-extrabold text-red-600 pt-1 border-t border-slate-200">
                        TOTAL TAGIHAN: <span id="prev-total">Rp 0</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <div class="text-xs font-extrabold text-slate-700">Kirim Pelanggan &amp; Simpan ke Google Drive</div>
                  <button type="button" id="inv-gen-pdf-and-wa" class="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow">Generate &amp; Unduh Lampiran PDF + Kirim WA Pelanggan</button>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button type="button" id="inv-save-drive" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow">Simpan ke Google Drive</button>
                    <button type="button" id="inv-download-pdf" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow">Cetak / Download PDF Invoice</button>
                  </div>
                  <p id="inv-drive-status" class="text-xs text-slate-600"></p>
                </div>

                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-extrabold text-slate-800">Riwayat Invoice</span>
                    <button type="button" id="inv-clear-history" class="text-[11px] text-red-600 hover:underline">Bersihkan Log</button>
                  </div>
                  <div id="inv-history-list" class="space-y-1.5 max-h-40 overflow-y-auto text-xs"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 4 -->
          <div id="tab-4" class="jms-tab-pane hidden">
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-6 max-w-2xl space-y-4">
              <h4 class="font-extrabold text-slate-900 text-base">Sinkronisasi Langsung ke Google Sheets</h4>
              <p class="text-xs text-slate-600 leading-relaxed">
                Tidak perlu lagi export atau commit <code>content.json</code> ke GitHub. Semua perubahan Layanan, Galeri, dan Profil Bengkel disimpan ke tab <code>CMS_Profil</code>, <code>Pricelist</code>, dan <code>CMS_Galeri</code> pada Google Sheets dan otomatis terbaca di semua perangkat/pengunjung.
              </p>
              <div class="flex flex-wrap gap-3">
                <button type="button" id="cms-push-sheets" class="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow">Push Semua Perubahan ke Google Sheets</button>
                <button type="button" id="cms-pull-sheets" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow">Ambil Data Terbaru dari Google Sheets</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    function syncLogoutButton() {
      const lockBtn = document.getElementById("cms-lock-btn");
      if (!lockBtn) return;
      if (isLoggedIn()) {
        lockBtn.classList.remove("hidden");
      } else {
        lockBtn.classList.add("hidden");
        if (!modal.classList.contains("hidden")) {
          document.getElementById("jms-cms-login").classList.remove("hidden");
          document.getElementById("jms-cms-editor").classList.add("hidden");
        }
      }
    }

    setInterval(syncLogoutButton, 15000);

    modal.querySelectorAll(".jms-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!isLoggedIn()) {
          refreshConsoleAuth();
          return;
        }
        modal.querySelectorAll(".jms-tab-btn").forEach((b) => {
          b.className = "jms-tab-btn bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm";
        });
        btn.className = "jms-tab-btn bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-sm";
        const target = btn.getAttribute("data-tab");
        modal.querySelectorAll(".jms-tab-pane").forEach((p) => p.classList.add("hidden"));
        document.getElementById(target).classList.remove("hidden");
      });
    });

    function openModal() {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      refreshConsoleAuth();
    }

    function refreshConsoleAuth() {
      const lBox = document.getElementById("jms-cms-login");
      const eBox = document.getElementById("jms-cms-editor");
      if (isLoggedIn()) {
        lBox.classList.add("hidden");
        eBox.classList.remove("hidden");
        syncLogoutButton();
        hydrateAllTabs();
      } else {
        lBox.classList.remove("hidden");
        eBox.classList.add("hidden");
        syncLogoutButton();
      }
    }

    function hydrateAllTabs() {
      renderAdminPricelist();
      renderAdminGaleri();
      fillProfileForm();
      initInvoiceBuilder();
      renderInvoiceHistory();
    }

    function renderAdminPricelist() {
      document.getElementById("srv-count").textContent = stateData.layanan.length;
      const list = document.getElementById("srv-active-list");
      list.innerHTML = stateData.layanan
        .map(
          (item, idx) => `
          <div class="bg-white border border-slate-200 rounded-xl p-3.5 flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-extrabold uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded">${esc(item.kode)}</span>
                <span class="text-[10px] font-bold text-slate-500">${esc(item.kategori || "")}</span>
              </div>
              <div class="font-bold text-sm text-slate-900 mt-1">${esc(item.nama)}</div>
              <div class="text-xs font-extrabold text-red-600">${window.formatRupiahIdr(item.nominal)} <span class="text-slate-400 font-normal">• ${esc(item.durasi || "")}</span></div>
              <p class="text-xs text-slate-500 mt-1">${esc(item.deskripsi || "")}</p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button type="button" data-edit-srv="${idx}" class="bg-slate-900 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg">Edit</button>
              <button type="button" data-del-srv="${idx}" class="bg-red-100 hover:bg-red-600 text-red-700 hover:text-white text-xs font-bold px-2.5 py-1.5 rounded-lg">Hapus</button>
            </div>
          </div>
        `
        )
        .join("");

      list.querySelectorAll("[data-edit-srv]").forEach((b) => {
        b.addEventListener("click", () => {
          const idx = Number(b.getAttribute("data-edit-srv"));
          const it = stateData.layanan[idx];
          if (!it) return;
          editingServiceIdx = idx;
          document.getElementById("srv-form-title").textContent = "Edit Item Layanan / Pricelist";
          document.getElementById("srv-kode").value = it.kode || "";
          document.getElementById("srv-durasi").value = it.durasi || "";
          document.getElementById("srv-kategori").value = it.kategori || "";
          document.getElementById("srv-nama").value = it.nama || "";
          document.getElementById("srv-nominal").value = it.nominal || 0;
          document.getElementById("srv-deskripsi").value = it.deskripsi || "";
        });
      });

      list.querySelectorAll("[data-del-srv]").forEach((b) => {
        b.addEventListener("click", async () => {
          stateData.layanan.splice(Number(b.getAttribute("data-del-srv")), 1);
          renderAdminPricelist();
          populateInvoicePricelistDropdown();
          await saveCmsToSheets();
        });
      });
    }

    function resetServiceForm() {
      editingServiceIdx = -1;
      document.getElementById("srv-form-title").textContent = "Tambah Item Layanan / Pricelist";
      document.getElementById("srv-kode").value = `SRV-0${stateData.layanan.length + 1}`;
      document.getElementById("srv-durasi").value = "";
      document.getElementById("srv-kategori").value = "";
      document.getElementById("srv-nama").value = "";
      document.getElementById("srv-nominal").value = "";
      document.getElementById("srv-deskripsi").value = "";
    }

    document.getElementById("srv-reset-form").addEventListener("click", resetServiceForm);
    document.getElementById("srv-save-btn").addEventListener("click", async () => {
      const kode = document.getElementById("srv-kode").value.trim() || `SRV-0${stateData.layanan.length + 1}`;
      const durasi = document.getElementById("srv-durasi").value.trim() || "60 Menit";
      const kategori = document.getElementById("srv-kategori").value.trim() || "Servis Mobil";
      const nama = document.getElementById("srv-nama").value.trim();
      const nominal = Number(document.getElementById("srv-nominal").value || 0);
      const deskripsi = document.getElementById("srv-deskripsi").value.trim();

      if (!nama) {
        alert("Nama layanan wajib diisi.");
        return;
      }

      const payload = {
        kode,
        kategori,
        durasi,
        nama,
        nominal,
        harga: `IDR ${(isNaN(nominal) ? 0 : nominal).toLocaleString("id-ID")}`,
        deskripsi
      };

      if (editingServiceIdx >= 0) {
        stateData.layanan[editingServiceIdx] = payload;
      } else {
        stateData.layanan.push(payload);
      }

      resetServiceForm();
      renderAdminPricelist();
      populateInvoicePricelistDropdown();
      const ok = await saveCmsToSheets();
      if (ok) alert("Pricelist tersimpan ke Google Sheets & tampil untuk semua pengunjung.");
    });

    document.getElementById("srv-restore-default").addEventListener("click", async () => {
      await loadCmsFromSheets();
      hydrateAllTabs();
      alert("Data diperbarui dari Google Sheets.");
    });

    function renderAdminGaleri() {
      document.getElementById("gal-count").textContent = stateData.galeri.length;
      const wrap = document.getElementById("gal-admin-list");
      wrap.innerHTML = stateData.galeri
        .map(
          (g, idx) => `
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
            <div>
              <img src="${esc(g.gambar)}" alt="${esc(g.judul)}" class="w-full h-32 object-cover bg-slate-100">
              <div class="p-3">
                <div class="font-bold text-xs text-slate-900">${esc(g.judul)}</div>
                <p class="text-[11px] text-slate-500 mt-0.5">${esc(g.keterangan || "")}</p>
              </div>
            </div>
            <div class="px-3 pb-3">
              <button type="button" data-del-gal="${idx}" class="w-full bg-red-100 hover:bg-red-600 text-red-700 hover:text-white text-xs font-bold py-1.5 rounded-lg">Hapus Foto</button>
            </div>
          </div>
        `
        )
        .join("");

      wrap.querySelectorAll("[data-del-gal]").forEach((b) => {
        b.addEventListener("click", async () => {
          stateData.galeri.splice(Number(b.getAttribute("data-del-gal")), 1);
          renderAdminGaleri();
          await saveCmsToSheets();
        });
      });
    }

    document.getElementById("gal-file").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      const statusEl = document.getElementById("gal-upload-status");
      const urlInput = document.getElementById("gal-url");
      if (!file) return;

      if (file.size > MAX_DRIVE_UPLOAD_BYTES) {
        alert("Ukuran file melebihi batas maksimal 2 MB. Silakan pilih foto yang lebih kecil.");
        e.target.value = "";
        statusEl.textContent = "Ditolak: ukuran file melebihi 2 MB.";
        return;
      }

      const gasUrl = getGasUrl();
      statusEl.textContent = "⏳ Memproses gambar...";

      try {
        const compressed = await compressImageFile(file, 1080, 0.78);

        if (gasUrl) {
          statusEl.textContent = "⏳ Meng-upload ke Google Drive...";
          const resp = await fetch(gasUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              action: "upload_gallery_image",
              fileName: file.name,
              mimeType: compressed.mimeType,
              imageBase64: compressed.base64
            })
          });
          const result = await resp.json();
          if (result && result.status === "ok" && result.url) {
            urlInput.value = result.url;
            statusEl.textContent = "✅ Tersimpan ke Google Drive.";
            return;
          }
        }

        if (compressed.approxBytes <= MAX_SHEETS_BASE64_BYTES) {
          urlInput.value = compressed.dataUrl;
          statusEl.textContent = "✅ Siap disimpan ke Google Sheets (≤ 35 KB).";
        } else {
          urlInput.value = "";
          statusEl.textContent = "⚠️ File > 35 KB: isi URL Web App Apps Script untuk simpan ke Drive, atau pakai path images/.";
        }
      } catch (err) {
        statusEl.textContent = "⚠️ Gagal memproses gambar: " + err.message;
      }
    });

    document.getElementById("gal-add-btn").addEventListener("click", async () => {
      const judul = document.getElementById("gal-judul").value.trim();
      const keterangan = document.getElementById("gal-ket").value.trim();
      const gambar = document.getElementById("gal-url").value.trim();

      if (!judul || !gambar) {
        alert("Judul foto dan Path/URL gambar wajib diisi.");
        return;
      }

      stateData.galeri.push({ judul, keterangan, gambar });
      document.getElementById("gal-judul").value = "";
      document.getElementById("gal-ket").value = "";
      document.getElementById("gal-url").value = "";
      document.getElementById("gal-file").value = "";
      document.getElementById("gal-upload-status").textContent = "";
      renderAdminGaleri();
      const ok = await saveCmsToSheets();
      if (ok) alert("Foto ditambahkan & tersimpan ke Google Sheets.");
    });

    document.getElementById("gal-save-btn").addEventListener("click", async () => {
      const ok = await saveCmsToSheets();
      if (ok) alert("Perubahan galeri tersimpan ke Google Sheets.");
    });

    function fillProfileForm() {
      const m = stateData.meta;
      document.getElementById("prof-nama").value = m.namaBengkel || "";
      document.getElementById("prof-wa").value = m.whatsapp || "";
      document.getElementById("prof-sub").value = m.subBrand || "";
      document.getElementById("prof-telp").value = m.telepon || "";
      document.getElementById("prof-tagline").value = m.heroTagline || "";
      document.getElementById("prof-hero-desc").value = m.heroDeskripsi || "";
      document.getElementById("prof-alamat").value = m.alamat || "";
      document.getElementById("prof-jam").value = Array.isArray(m.jamOperasional) ? m.jamOperasional.join(", ") : "";
      document.getElementById("prof-gas").value = getGasUrl();
    }

    document.getElementById("prof-save-btn").addEventListener("click", async () => {
      const gasInput = document.getElementById("prof-gas").value.trim();
      setGasUrl(gasInput);

      stateData.meta.namaBengkel = document.getElementById("prof-nama").value.trim();
      stateData.meta.whatsapp = document.getElementById("prof-wa").value.trim();
      stateData.meta.subBrand = document.getElementById("prof-sub").value.trim();
      stateData.meta.telepon = document.getElementById("prof-telp").value.trim();
      stateData.meta.heroTagline = document.getElementById("prof-tagline").value.trim();
      stateData.meta.heroDeskripsi = document.getElementById("prof-hero-desc").value.trim();
      stateData.meta.alamat = document.getElementById("prof-alamat").value.trim();
      stateData.meta.jamOperasional = document
        .getElementById("prof-jam")
        .value.split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const newPin = document.getElementById("prof-pin").value.trim();
      if (newPin) {
        if (newPin.length < 4) {
          alert("PIN minimal 4 karakter.");
          return;
        }
        localStorage.setItem(PIN_KEY, newPin);
        document.getElementById("prof-pin").value = "";
      }

      const ok = await saveCmsToSheets();
      updateInvoicePreview();
      if (ok) alert("Profil bengkel tersimpan ke Google Sheets & otomatis aktif di semua perangkat.");
    });

    function populateInvoicePricelistDropdown() {
      const sel = document.getElementById("inv-pricelist-select");
      sel.innerHTML = stateData.layanan
        .map(
          (item, idx) =>
            `<option value="${idx}">${esc(item.nama)} — ${window.formatRupiahIdr(item.nominal)}</option>`
        )
        .join("");
    }

    function initInvoiceBuilder() {
      if (!document.getElementById("inv-no").value) {
        document.getElementById("inv-no").value = generateInvoiceNumber();
      }
      if (!document.getElementById("inv-tgl").value) {
        document.getElementById("inv-tgl").value = new Date().toISOString().slice(0, 10);
      }
      if (!invoiceItems.length && stateData.layanan.length) {
        const first = stateData.layanan[0];
        invoiceItems = [{ nama: first.nama, qty: 1, harga: first.nominal }];
      }
      populateInvoicePricelistDropdown();
      renderInvoiceItemsEditor();
      updateInvoicePreview();
    }

    function renderInvoiceItemsEditor() {
      const wrap = document.getElementById("inv-items-editor");
      wrap.innerHTML = invoiceItems
        .map(
          (it, idx) => `
          <div class="grid grid-cols-12 gap-2 items-center">
            <input type="text" data-inv-idx="${idx}" data-inv-key="nama" value="${esc(it.nama)}" class="col-span-5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs">
            <input type="number" min="1" data-inv-idx="${idx}" data-inv-key="qty" value="${it.qty}" class="col-span-2 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-center">
            <input type="number" min="0" data-inv-idx="${idx}" data-inv-key="harga" value="${it.harga}" class="col-span-3 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs">
            <button type="button" data-inv-del="${idx}" class="col-span-2 bg-red-100 hover:bg-red-600 text-red-700 hover:text-white font-bold py-1.5 rounded-lg text-xs">✕</button>
          </div>
        `
        )
        .join("");

      wrap.querySelectorAll("input[data-inv-idx]").forEach((inp) => {
        inp.addEventListener("input", () => {
          const idx = Number(inp.getAttribute("data-inv-idx"));
          const key = inp.getAttribute("data-inv-key");
          if (key === "nama") invoiceItems[idx].nama = inp.value;
          else invoiceItems[idx][key] = Number(inp.value || 0);
          updateInvoicePreview();
        });
      });

      wrap.querySelectorAll("[data-inv-del]").forEach((btn) => {
        btn.addEventListener("click", () => {
          invoiceItems.splice(Number(btn.getAttribute("data-inv-del")), 1);
          renderInvoiceItemsEditor();
          updateInvoicePreview();
        });
      });
    }

    function calcInvoiceTotals() {
      const subtotal = invoiceItems.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.harga || 0), 0);
      const diskon = Number(document.getElementById("inv-diskon").value || 0);
      const total = Math.max(0, subtotal - diskon);
      return { subtotal, diskon, total };
    }

    function updateInvoicePreview() {
      const m = stateData.meta;
      document.getElementById("prev-bengkel").textContent = m.namaBengkel || "Jamal Motor Sport";
      document.getElementById("prev-sub").textContent = m.subBrand || "Pro Performance Workshop";
      document.getElementById("prev-alamat").textContent = m.alamat || "";

      const noInv = document.getElementById("inv-no").value.trim() || "-";
      const tgl = document.getElementById("inv-tgl").value || "-";
      const nama = document.getElementById("inv-nama").value.trim() || "-";
      const wa = document.getElementById("inv-wa").value.trim() || "-";
      const mobil = document.getElementById("inv-mobil").value.trim() || "-";
      const plat = document.getElementById("inv-plat").value.trim() || "-";
      const km = document.getElementById("inv-km").value.trim() || "-";
      const mekanik = document.getElementById("inv-mekanik").value.trim() || "Mas Jamal";
      const catatan = document.getElementById("inv-catatan").value.trim();

      document.getElementById("prev-no").textContent = noInv;
      document.getElementById("prev-tgl").textContent = `Tanggal: ${tgl}`;
      document.getElementById("prev-nama").textContent = nama;
      document.getElementById("prev-wa").textContent = `WA: ${wa}`;
      document.getElementById("prev-mekanik").textContent = `Mekanik: ${mekanik}`;
      document.getElementById("prev-mobil").textContent = mobil;
      document.getElementById("prev-plat").textContent = `No. Plat: ${plat}`;
      document.getElementById("prev-km").textContent = `Kilometers: ${km}`;
      document.getElementById("prev-catatan").textContent = catatan ? `Catatan: ${catatan}` : "";

      const tbody = document.getElementById("prev-items-body");
      tbody.innerHTML = invoiceItems
        .map((it) => {
          const jumlah = Number(it.qty || 0) * Number(it.harga || 0);
          return `
            <tr>
              <td class="py-1.5 px-2.5">${esc(it.nama)}</td>
              <td class="py-1.5 px-2 text-center">${it.qty}</td>
              <td class="py-1.5 px-2.5 text-right">${window.formatRupiahIdr(it.harga)}</td>
              <td class="py-1.5 px-2.5 text-right font-bold">${window.formatRupiahIdr(jumlah)}</td>
            </tr>
          `;
        })
        .join("");

      const { subtotal, diskon, total } = calcInvoiceTotals();
      document.getElementById("prev-subtotal").textContent = window.formatRupiahIdr(subtotal);
      document.getElementById("prev-diskon").textContent = `- ${window.formatRupiahIdr(diskon)}`;
      document.getElementById("prev-total").textContent = window.formatRupiahIdr(total);
    }

    ["inv-no", "inv-tgl", "inv-nama", "inv-wa", "inv-mobil", "inv-plat", "inv-km", "inv-mekanik", "inv-diskon", "inv-catatan"].forEach((id) => {
      document.getElementById(id).addEventListener("input", updateInvoicePreview);
    });

    document.getElementById("inv-new-no").addEventListener("click", () => {
      document.getElementById("inv-no").value = generateInvoiceNumber();
      updateInvoicePreview();
    });

    document.getElementById("inv-add-from-pricelist").addEventListener("click", () => {
      const idx = Number(document.getElementById("inv-pricelist-select").value);
      const item = stateData.layanan[idx];
      if (!item) return;
      invoiceItems.push({ nama: item.nama, qty: 1, harga: item.nominal });
      renderInvoiceItemsEditor();
      updateInvoicePreview();
    });

    document.getElementById("inv-add-custom").addEventListener("click", () => {
      invoiceItems.push({ nama: "Item / Jasa Tambahan", qty: 1, harga: 0 });
      renderInvoiceItemsEditor();
      updateInvoicePreview();
    });

    function recordInvoiceLog(driveUrl) {
      const { total } = calcInvoiceTotals();
      const noInv = document.getElementById("inv-no").value.trim();
      const nowMs = Date.now();
      const hist = getHistory();

      const top = hist[0];
      if (
        top &&
        top.noInvoice === noInv &&
        Number(top.total) === Number(total) &&
        nowMs - Number(top._ts || 0) < 5000
      ) {
        if (driveUrl && !top.driveUrl) {
          top.driveUrl = driveUrl;
          saveHistory(hist);
          renderInvoiceHistory();
        }
        return;
      }

      const entry = {
        _ts: nowMs,
        noInvoice: noInv,
        tanggal: document.getElementById("inv-tgl").value,
        pelanggan: document.getElementById("inv-nama").value.trim() || "Pelanggan",
        mobil: document.getElementById("inv-mobil").value.trim(),
        plat: document.getElementById("inv-plat").value.trim(),
        total,
        driveUrl: driveUrl || ""
      };
      hist.unshift(entry);
      saveHistory(hist.slice(0, 50));
      renderInvoiceHistory();
    }

    function renderInvoiceHistory() {
      const wrap = document.getElementById("inv-history-list");
      const hist = getHistory();
      if (!hist.length) {
        wrap.innerHTML = `<div class="text-slate-400">Belum ada riwayat invoice tersimpan.</div>`;
        return;
      }
      wrap.innerHTML = hist
        .map(
          (h) => `
          <div class="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
            <div>
              <span class="font-bold text-slate-900">${esc(h.noInvoice)}</span> • ${esc(h.pelanggan)} (${esc(h.plat || h.mobil || "-")})
              <div class="text-[11px] text-slate-500">${esc(h.tanggal)} • <strong>${window.formatRupiahIdr(h.total)}</strong></div>
            </div>
            ${h.driveUrl ? `<a href="${esc(h.driveUrl)}" target="_blank" class="text-[11px] font-bold text-blue-600 hover:underline">Buka PDF Drive ↗</a>` : `<span class="text-[10px] text-slate-400">Tersimpan Lokal</span>`}
          </div>
        `
        )
        .join("");
    }

    document.getElementById("inv-clear-history").addEventListener("click", () => {
      localStorage.removeItem(HISTORY_KEY);
      renderInvoiceHistory();
    });

    function buildCustomerInvoiceWaMessage() {
      const namaPelanggan = document.getElementById("inv-nama").value.trim() || "Pelanggan";
      const noInv = document.getElementById("inv-no").value.trim() || generateInvoiceNumber();

      return [
        `Halo ${namaPelanggan}`,
        ``,
        `Terima kasih telah memilih Jamal Motor Sport (JMS) sebagai bengkel kepercayaan anda.`,
        `Berikut Lampiran Invoice yang kami lampirkan ke anda.`,
        ``,
        `Nomor Invoice`,
        `#${noInv}`,
        ``,
        `Tips:`,
        `-   Gunakan metode Pembayaran Instan (Virtual Account dan Transfer).`,
        `-   Anda wajib melakukan konfirmasi melalui wa.link/jp3ufp apabila menggunakan Metode Pembayaran Manual.`,
        `-  Berikut No. Rekening 8831665246 BCA a.n Damaris Butar Butar`,
        ``,
        `Salam JMS,`,
        `Terima Kasih`
      ].join("\n");
    }

    document.getElementById("inv-gen-pdf-and-wa").addEventListener("click", async () => {
      const waTarget = String(document.getElementById("inv-wa").value || "").replace(/\D/g, "");
      if (!waTarget) {
        alert("Masukkan No. WA Pelanggan terlebih dahulu (contoh: 62812...).");
        return;
      }

      const noInv = document.getElementById("inv-no").value.trim() || "INV-JMS";
      const nama = document.getElementById("inv-nama").value.trim() || "Pelanggan";
      const filename = `${noInv} - ${nama}.pdf`;

      if (window.html2pdf) {
        const built = await renderPdfWorker(filename);
        if (built) {
          await built.worker.save();
          if (built.host && built.host.parentNode) built.host.parentNode.removeChild(built.host);
        }
      } else {
        window.print();
      }

      recordInvoiceLog("");
      const pesan = buildCustomerInvoiceWaMessage();
      window.open(`https://wa.me/${waTarget}?text=${encodeURIComponent(pesan)}`, "_blank");
    });

    document.getElementById("inv-download-pdf").addEventListener("click", async () => {
      const noInv = document.getElementById("inv-no").value.trim() || "INV-JMS";
      const nama = document.getElementById("inv-nama").value.trim() || "Pelanggan";
      const filename = `${noInv} - ${nama}.pdf`;

      if (window.html2pdf) {
        const built = await renderPdfWorker(filename);
        if (built) {
          await built.worker.save();
          if (built.host && built.host.parentNode) built.host.parentNode.removeChild(built.host);
          recordInvoiceLog("");
        }
      } else {
        window.print();
      }
    });

    document.getElementById("inv-save-drive").addEventListener("click", async () => {
      const gasUrl = getGasUrl();
      const statusEl = document.getElementById("inv-drive-status");
      if (!gasUrl) {
        alert("Isi terlebih dahulu 'URL Web App Google Apps Script' di Tab 2 (Profil Bengkel & WA).");
        return;
      }

      statusEl.textContent = "⏳ Sedang membuat PDF penuh & mengirim ke Google Drive (folder JMS)...";
      const noInv = document.getElementById("inv-no").value.trim() || "INV-JMS";
      const nama = document.getElementById("inv-nama").value.trim() || "Pelanggan";
      const { total } = calcInvoiceTotals();

      let pdfBase64 = "";
      if (window.html2pdf) {
        const built = await renderPdfWorker(`${noInv} - ${nama}.pdf`);
        if (built) {
          const dataUri = await built.worker.outputPdf("datauristring");
          if (built.host && built.host.parentNode) built.host.parentNode.removeChild(built.host);
          pdfBase64 = dataUri.split(",")[1] || "";
        }
      }

      try {
        await fetch(gasUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "save_invoice_pdf",
            noInvoice: noInv,
            tanggal: document.getElementById("inv-tgl").value,
            pelanggan: nama,
            waPelanggan: document.getElementById("inv-wa").value.trim(),
            kendaraan: document.getElementById("inv-mobil").value.trim(),
            nopol: document.getElementById("inv-plat").value.trim(),
            total: total,
            pdfBase64: pdfBase64
          })
        });

        recordInvoiceLog("");
        statusEl.innerHTML = `✅ Permintaan simpan PDF terkirim ke Google Apps Script (cek folder <strong>JMS</strong> di Google Drive &amp; tab <strong>Riwayat Invoice</strong> di Spreadsheet).`;
      } catch (err) {
        statusEl.textContent = `⚠️ Gagal mengirim ke Apps Script: ${err.message}`;
      }
    });

    document.getElementById("cms-push-sheets").addEventListener("click", async () => {
      const ok = await saveCmsToSheets();
      if (ok) alert("Semua data CMS berhasil dikirim ke Google Sheets.");
    });

    document.getElementById("cms-pull-sheets").addEventListener("click", async () => {
      await loadCmsFromSheets();
      hydrateAllTabs();
      alert("Data terbaru berhasil dimuat dari Google Sheets.");
    });

    trigger.addEventListener("click", openModal);
    document.getElementById("jms-cms-close").addEventListener("click", () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    });
    document.getElementById("cms-lock-btn").addEventListener("click", () => {
      clearAdminSession();
      refreshConsoleAuth();
    });
    document.getElementById("jms-cms-enter").addEventListener("click", () => {
      const val = document.getElementById("jms-cms-pin").value.trim();
      const err = document.getElementById("jms-cms-err");
      if (val === getPin()) {
        startAdminSession();
        err.classList.add("hidden");
        document.getElementById("jms-cms-pin").value = "";
        refreshConsoleAuth();
      } else {
        err.classList.remove("hidden");
      }
    });
    document.getElementById("jms-cms-pin").addEventListener("keydown", (e) => {
      if (e.key === "Enter") document.getElementById("jms-cms-enter").click();
    });

    if (new URLSearchParams(window.location.search).get("admin") === "1") {
      openModal();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadCmsFromSheets();
    bindForm();
    initAdmin();
  });
})();
