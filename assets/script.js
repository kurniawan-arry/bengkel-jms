(function () {
  const STORAGE_DRAFT_KEY = "jms_cms_draft_v1";
  const STORAGE_PIN_KEY = "jms_cms_admin_pin_v1";
  const STORAGE_SESSION_KEY = "jms_cms_admin_auth_v1";
  const DEFAULT_PIN = "123456";

  const FALLBACK_DATA = {
    meta: {
      namaBengkel: "Jamal Motor Sport",
      subBrand: "Pro Performance Workshop",
      whatsapp: "6281234567890",
      heroBg: "images/1794759372257.jpg",
      heroTagline: "Spesialis Perawatan, Tune-Up & Modifikasi Motor Performa Tinggi",
      heroDeskripsi:
        "Ditangani oleh mekanik berpengalaman profesional dengan peralatan diagnostik modern. Menjaga tarikan mobil Anda selalu bertenaga, responsif, dan siap harian maupun balap.",
      footerDeskripsi:
        "Bengkel rujukan pencinta kecepatan dan perawatan mobil harian berkualitas tinggi.",
      jamOperasional: [
        "Senin - Minggu: 15.00 - 02.00 WIB",
        "Hari Libur Tetap Buka"
      ],
      alamat: "📍 Jl. Raya Bengkel JMS No. 12",
      telepon: "📞 +62 812-3456-7890",
      appsScriptUrl: ""
    },
    layanan: [],
    galeri: []
  };

  let appData = JSON.parse(JSON.stringify(FALLBACK_DATA));

  function getAdminPin() {
    return localStorage.getItem(STORAGE_PIN_KEY) || DEFAULT_PIN;
  }

  function isAdminAuthenticated() {
    return sessionStorage.getItem(STORAGE_SESSION_KEY) === "true";
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function initData() {
    const draft = localStorage.getItem(STORAGE_DRAFT_KEY);
    if (draft) {
      try {
        appData = mergeData(JSON.parse(draft));
        renderAll();
        return;
      } catch (_) {}
    }

    try {
      const resp = await fetch(`./content.json?t=${Date.now()}`);
      if (resp.ok) {
        const json = await resp.json();
        appData = mergeData(json);
      } else if (window.JMS_DATA) {
        appData = mergeData(window.JMS_DATA);
      }
    } catch (_) {
      if (window.JMS_DATA) {
        appData = mergeData(window.JMS_DATA);
      }
    }

    renderAll();
  }

  function mergeData(raw) {
    return {
      meta: Object.assign({}, FALLBACK_DATA.meta, raw && raw.meta ? raw.meta : {}),
      layanan: Array.isArray(raw && raw.layanan) ? raw.layanan : [],
      galeri: Array.isArray(raw && raw.galeri) ? raw.galeri : []
    };
  }

  function renderAll() {
    const m = appData.meta;

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
      const msg = encodeURIComponent(`Halo ${m.namaBengkel}, saya ingin konsultasi servis.`);
      navWa.href = `https://wa.me/${cleanWa}?text=${msg}`;
    }

    if (footerJam && Array.isArray(m.jamOperasional)) {
      footerJam.innerHTML = m.jamOperasional
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join("");
    }

    renderLayanan();
    renderSelectLayanan();
    renderGaleri();
    loadSlotStatus(m.appsScriptUrl);
  }

  function renderLayanan() {
    const container = document.getElementById("daftar-layanan");
    if (!container) return;

    if (!appData.layanan.length) {
      container.innerHTML = `<p class="text-slate-400 text-sm col-span-full text-center">Belum ada daftar layanan.</p>`;
      return;
    }

    container.innerHTML = appData.layanan
      .map(
        (item) => `
        <div class="bg-slate-900/90 border border-slate-800 hover:border-red-500/50 rounded-2xl p-6 transition-all flex flex-col justify-between shadow-lg">
          <div>
            <div class="flex items-center justify-between gap-2 mb-3">
              <span class="text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-md">${escapeHtml(item.kode || "SRV")}</span>
              <span class="text-sm font-extrabold text-emerald-400">${escapeHtml(item.harga || "")}</span>
            </div>
            <h3 class="text-lg font-bold text-white mb-2">${escapeHtml(item.nama || "")}</h3>
            <p class="text-slate-400 text-sm leading-relaxed">${escapeHtml(item.deskripsi || "")}</p>
          </div>
          <div class="mt-6 pt-4 border-t border-slate-800/80">
            <a href="#kalkulator" data-pilih-kode="${escapeHtml(item.kode || "")}" data-pilih-nama="${escapeHtml(item.nama || "")}" class="pilih-layanan-btn text-xs font-bold text-red-400 hover:text-red-300 inline-flex items-center gap-1">
              <span>Pilih Layanan Ini →</span>
            </a>
          </div>
        </div>
      `
      )
      .join("");

    container.querySelectorAll(".pilih-layanan-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const select = document.getElementById("pilihan-layanan");
        const nama = btn.getAttribute("data-pilih-nama");
        if (select && nama) {
          select.value = nama;
        }
      });
    });
  }

  function renderSelectLayanan() {
    const select = document.getElementById("pilihan-layanan");
    if (!select) return;

    const currentVal = select.value;
    const options = appData.layanan
      .map(
        (item) =>
          `<option value="${escapeHtml(item.nama)}" data-kode="${escapeHtml(item.kode || "")}">${escapeHtml(item.nama)}</option>`
      )
      .join("");

    select.innerHTML =
      `<option value="" disabled selected>-- Pilih Jenis Layanan --</option>` +
      options +
      `<option value="Lain-Lain" data-kode="">Lain-Lain</option>`;

    if (currentVal) {
      select.value = currentVal;
    }
  }

  function renderGaleri() {
    const container = document.getElementById("galeri-container");
    if (!container) return;

    if (!appData.galeri.length) {
      container.innerHTML = `<p class="text-slate-400 text-sm col-span-full text-center">Belum ada dokumentasi galeri.</p>`;
      return;
    }

    container.innerHTML = appData.galeri
      .map(
        (g) => `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <img src="${escapeHtml(g.gambar || "")}" alt="${escapeHtml(g.judul || "Galeri JMS")}" class="w-full h-52 object-cover">
          <div class="p-5">
            <h4 class="font-bold text-white text-base mb-1">${escapeHtml(g.judul || "")}</h4>
            <p class="text-slate-400 text-xs leading-relaxed">${escapeHtml(g.keterangan || "")}</p>
          </div>
        </div>
      `
      )
      .join("");
  }

  async function loadSlotStatus(scriptUrl) {
    const banner = document.getElementById("status-slot");
    if (!banner) return;

    if (!scriptUrl) {
      banner.textContent = "🟢 Bengkel Siap Menerima Booking Servis";
      return;
    }

    try {
      const resp = await fetch(scriptUrl);
      const data = await resp.json();
      if (data && data.keteranganSlot) {
        banner.textContent = data.keteranganSlot;
      }
    } catch (_) {
      banner.textContent = "🟢 Bengkel Siap Menerima Booking Servis";
    }
  }

  function bindBookingForm() {
    const form = document.getElementById("booking-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nama = document.getElementById("nama-pelanggan").value.trim();
      const mobil = document.getElementById("mobil-pelanggan").value.trim();
      const select = document.getElementById("pilihan-layanan");
      const layanan = select.value;
      const selectedOpt = select.options[select.selectedIndex];
      const kodePerbaikan = selectedOpt ? selectedOpt.getAttribute("data-kode") || "" : "";
      const catatan = document.getElementById("catatan-pelanggan").value.trim();

      if (appData.meta.appsScriptUrl) {
        try {
          fetch(appData.meta.appsScriptUrl, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nama,
              mobil,
              layanan,
              kodePerbaikan,
              status: "Antri"
            })
          });
        } catch (_) {}
      }

      const cleanWa = String(appData.meta.whatsapp || "").replace(/\D/g, "");
      const teks = [
        `Halo *${appData.meta.namaBengkel}*, saya ingin booking servis:`,
        `• Nama: ${nama}`,
        `• Mobil & Plat: ${mobil}`,
        `• Layanan: ${layanan}${kodePerbaikan ? ` (${kodePerbaikan})` : ""}`,
        catatan ? `• Catatan: ${catatan}` : ""
      ]
        .filter(Boolean)
        .join("\n");

      if (cleanWa) {
        window.open(`https://wa.me/${cleanWa}?text=${encodeURIComponent(teks)}`, "_blank");
      }

      form.reset();
    });
  }

  // --- ADMIN LOGIN & CMS EDITOR (Tanpa mengubah desain template utama) ---
  function initAdminCMS() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "jms-admin-btn";
    btn.textContent = "🔒 Admin CMS";
    btn.className =
      "fixed bottom-4 left-4 z-40 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold px-3.5 py-2 rounded-full shadow-lg transition-all";
    btn.addEventListener("click", openModal);
    document.body.appendChild(btn);

    const modal = document.createElement("div");
    modal.id = "jms-admin-modal";
    modal.className =
      "fixed inset-0 z-50 hidden bg-black/80 backdrop-blur-sm items-center justify-center p-4";
    modal.innerHTML = `
      <div class="bg-slate-900 border border-slate-700 text-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <h3 class="text-lg font-extrabold text-white">JMS Admin CMS (content.json)</h3>
          <button type="button" id="jms-close-modal" class="text-slate-400 hover:text-white text-xl font-bold px-2">✕</button>
        </div>

        <div id="jms-login-box" class="space-y-4">
          <p class="text-xs text-slate-400">Masukkan PIN Admin untuk menambah/mengubah konten tanpa edit kode.</p>
          <input type="password" id="jms-pin-input" placeholder="Masukkan PIN Admin" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white">
          <p id="jms-pin-err" class="text-xs text-red-400 hidden">PIN salah.</p>
          <button type="button" id="jms-pin-submit" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm">Masuk Admin</button>
        </div>

        <div id="jms-panel-box" class="hidden space-y-5 text-sm">
          <div class="flex flex-wrap gap-2">
            <button type="button" id="jms-save-preview" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-lg text-xs">Simpan Pratinjau</button>
            <button type="button" id="jms-export-json" class="bg-red-600 hover:bg-red-700 text-white font-bold px-3.5 py-2 rounded-lg text-xs">Download content.json</button>
            <label class="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3.5 py-2 rounded-lg text-xs cursor-pointer">
              Upload content.json
              <input type="file" id="jms-import-json" accept=".json" class="hidden">
            </label>
            <button type="button" id="jms-reset-draft" class="bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold px-3.5 py-2 rounded-lg text-xs">Reset Draft</button>
            <button type="button" id="jms-logout-btn" class="ml-auto bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-3 py-2 rounded-lg text-xs">Logout</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-slate-400 mb-1">Nama Bengkel</label>
              <input type="text" id="edit-nama" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">No. WhatsApp (628...)</label>
              <input type="text" id="edit-wa" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs text-slate-400 mb-1">Tagline Hero</label>
              <input type="text" id="edit-tagline" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Alamat</label>
              <input type="text" id="edit-alamat" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Kontak / Telepon</label>
              <input type="text" id="edit-telp" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs text-slate-400 mb-1">URL Web App Google Apps Script</label>
              <input type="text" id="edit-gas" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-xs uppercase tracking-wider text-red-400">Daftar Layanan & Harga</span>
              <button type="button" id="jms-add-service" class="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1 rounded-lg text-xs">+ Tambah Layanan</button>
            </div>
            <div id="edit-layanan-list" class="space-y-2"></div>
          </div>

          <div class="pt-3 border-t border-slate-800 flex items-center gap-2">
            <input type="password" id="edit-new-pin" placeholder="PIN baru (min 4 karakter)" class="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white">
            <button type="button" id="jms-save-pin" class="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs">Ubah PIN</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("jms-close-modal").addEventListener("click", () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    });

    document.getElementById("jms-pin-submit").addEventListener("click", () => {
      const val = document.getElementById("jms-pin-input").value.trim();
      const err = document.getElementById("jms-pin-err");
      if (val === getAdminPin()) {
        sessionStorage.setItem(STORAGE_SESSION_KEY, "true");
        err.classList.add("hidden");
        document.getElementById("jms-pin-input").value = "";
        toggleView();
      } else {
        err.classList.remove("hidden");
      }
    });

    document.getElementById("jms-logout-btn").addEventListener("click", () => {
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
      toggleView();
    });

    document.getElementById("jms-add-service").addEventListener("click", () => {
      appData.layanan.push({
        kode: `SRV-0${appData.layanan.length + 1}`,
        nama: "Layanan Baru",
        harga: "IDR 0",
        deskripsi: ""
      });
      renderServiceInputs();
    });

    document.getElementById("jms-save-preview").addEventListener("click", () => {
      collectForm();
      localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(appData));
      renderAll();
      alert("Pratinjau disimpan di browser. Klik 'Download content.json' lalu upload ke GitHub agar publik terupdate.");
    });

    document.getElementById("jms-export-json").addEventListener("click", () => {
      collectForm();
      const blob = new Blob([JSON.stringify(appData, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "content.json";
      a.click();
    });

    document.getElementById("jms-import-json").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          appData = mergeData(JSON.parse(reader.result));
          localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(appData));
          fillForm();
          renderAll();
          alert("content.json berhasil dimuat.");
        } catch (_) {
          alert("File JSON tidak valid.");
        }
      };
      reader.readAsText(file);
    });

    document.getElementById("jms-reset-draft").addEventListener("click", () => {
      localStorage.removeItem(STORAGE_DRAFT_KEY);
      initData().then(fillForm);
    });

    document.getElementById("jms-save-pin").addEventListener("click", () => {
      const pin = document.getElementById("edit-new-pin").value.trim();
      if (pin.length < 4) {
        alert("PIN minimal 4 karakter.");
        return;
      }
      localStorage.setItem(STORAGE_PIN_KEY, pin);
      document.getElementById("edit-new-pin").value = "";
      alert("PIN Admin berhasil diperbarui.");
    });

    if (new URLSearchParams(window.location.search).get("admin") === "1") {
      openModal();
    }

    function openModal() {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      toggleView();
    }

    function toggleView() {
      const loginBox = document.getElementById("jms-login-box");
      const panelBox = document.getElementById("jms-panel-box");
      if (isAdminAuthenticated()) {
        loginBox.classList.add("hidden");
        panelBox.classList.remove("hidden");
        fillForm();
      } else {
        loginBox.classList.remove("hidden");
        panelBox.classList.add("hidden");
      }
    }

    function fillForm() {
      document.getElementById("edit-nama").value = appData.meta.namaBengkel || "";
      document.getElementById("edit-wa").value = appData.meta.whatsapp || "";
      document.getElementById("edit-tagline").value = appData.meta.heroTagline || "";
      document.getElementById("edit-alamat").value = appData.meta.alamat || "";
      document.getElementById("edit-telp").value = appData.meta.telepon || "";
      document.getElementById("edit-gas").value = appData.meta.appsScriptUrl || "";
      renderServiceInputs();
    }

    function renderServiceInputs() {
      const wrap = document.getElementById("edit-layanan-list");
      wrap.innerHTML = appData.layanan
        .map(
          (item, i) => `
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input type="text" data-i="${i}" data-k="kode" value="${escapeHtml(item.kode || "")}" placeholder="Kode" class="sm:col-span-2 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white">
              <input type="text" data-i="${i}" data-k="nama" value="${escapeHtml(item.nama || "")}" placeholder="Nama Layanan" class="sm:col-span-6 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white">
              <input type="text" data-i="${i}" data-k="harga" value="${escapeHtml(item.harga || "")}" placeholder="Harga" class="sm:col-span-3 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white">
              <button type="button" data-del="${i}" class="sm:col-span-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded text-xs font-bold py-1.5">✕</button>
            </div>
            <input type="text" data-i="${i}" data-k="deskripsi" value="${escapeHtml(item.deskripsi || "")}" placeholder="Deskripsi layanan" class="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white">
          </div>
        `
        )
        .join("");

      wrap.querySelectorAll("button[data-del]").forEach((b) => {
        b.addEventListener("click", () => {
          appData.layanan.splice(Number(b.getAttribute("data-del")), 1);
          renderServiceInputs();
        });
      });
    }

    function collectForm() {
      appData.meta.namaBengkel = document.getElementById("edit-nama").value.trim();
      appData.meta.whatsapp = document.getElementById("edit-wa").value.trim();
      appData.meta.heroTagline = document.getElementById("edit-tagline").value.trim();
      appData.meta.alamat = document.getElementById("edit-alamat").value.trim();
      appData.meta.telepon = document.getElementById("edit-telp").value.trim();
      appData.meta.appsScriptUrl = document.getElementById("edit-gas").value.trim();

      document.querySelectorAll("#edit-layanan-list input[data-i]").forEach((inp) => {
        const i = Number(inp.getAttribute("data-i"));
        const k = inp.getAttribute("data-k");
        if (appData.layanan[i]) {
          appData.layanan[i][k] = inp.value;
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initData();
    bindBookingForm();
    initAdminCMS();
  });
})();
