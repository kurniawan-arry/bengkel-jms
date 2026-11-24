(function () {
  const DRAFT_KEY = "jms_cms_draft_v1";
  const PIN_KEY = "jms_cms_admin_pin_v1";
  const AUTH_KEY = "jms_cms_admin_auth_v1";
  const DEFAULT_PIN = "123456";

  let stateData = window.mergeJmsData ? window.mergeJmsData({}) : { meta: {}, layanan: [], galeri: [] };

  function getPin() {
    return localStorage.getItem(PIN_KEY) || DEFAULT_PIN;
  }

  function isLoggedIn() {
    return sessionStorage.getItem(AUTH_KEY) === "true";
  }

  function esc(str) {
    return window.JMS_PRICELIST
      ? window.JMS_PRICELIST.escapeHtml(str)
      : String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  async function loadJmsData() {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        stateData = window.mergeJmsData(JSON.parse(draft));
        renderPage();
        return;
      } catch (_) {}
    }

    try {
      const res = await fetch(`./assets/content.json?v=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        stateData = window.mergeJmsData(json);
      }
    } catch (_) {}

    renderPage();
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
      navWa.href = `https://wa.me/${cleanWa}?text=${encodeURIComponent(`Halo ${m.namaBengkel}, saya ingin konsultasi servis.`)}`;
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
    syncSlot(m.appsScriptUrl);
  }

  function renderGaleri() {
    const wrap = document.getElementById("galeri-container");
    if (!wrap) return;
    if (!stateData.galeri.length) {
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

  async function syncSlot(url) {
    const el = document.getElementById("status-slot");
    if (!el) return;
    if (!url) {
      el.textContent = "🟢 Bengkel Siap Menerima Booking Servis";
      return;
    }
    try {
      const r = await fetch(url);
      const j = await r.json();
      if (j && j.keteranganSlot) el.textContent = j.keteranganSlot;
    } catch (_) {
      el.textContent = "🟢 Bengkel Siap Menerima Booking Servis";
    }
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

      if (stateData.meta.appsScriptUrl) {
        try {
          fetch(stateData.meta.appsScriptUrl, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nama, mobil, layanan, kodePerbaikan, status: "Antri" })
          });
        } catch (_) {}
      }

      const cleanWa = String(stateData.meta.whatsapp || "").replace(/\D/g, "");
      const msg = [
        `Halo *${stateData.meta.namaBengkel}*, saya ingin booking servis:`,
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

  function initAdmin() {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.textContent = "🔒 Admin CMS";
    trigger.className =
      "fixed bottom-4 left-4 z-40 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold px-3.5 py-2 rounded-full shadow-lg transition-all";
    document.body.appendChild(trigger);

    const modal = document.createElement("div");
    modal.id = "jms-cms-modal";
    modal.className = "fixed inset-0 z-50 hidden bg-black/80 backdrop-blur-sm items-center justify-center p-4";
    modal.innerHTML = `
      <div class="bg-slate-900 border border-slate-700 text-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <h3 class="text-lg font-extrabold text-white">JMS Admin CMS (assets/content.json)</h3>
          <button type="button" id="jms-cms-close" class="text-slate-400 hover:text-white text-xl font-bold px-2">✕</button>
        </div>

        <div id="jms-cms-login" class="space-y-4">
          <p class="text-xs text-slate-400">Masukkan PIN Admin untuk menambah/mengubah konten tanpa edit kode.</p>
          <input type="password" id="jms-cms-pin" placeholder="PIN Admin" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white">
          <p id="jms-cms-err" class="text-xs text-red-400 hidden">PIN salah.</p>
          <button type="button" id="jms-cms-enter" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm">Masuk Admin</button>
        </div>

        <div id="jms-cms-editor" class="hidden space-y-5 text-sm">
          <div class="flex flex-wrap gap-2">
            <button type="button" id="cms-preview" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-lg text-xs">Simpan Pratinjau</button>
            <button type="button" id="cms-export" class="bg-red-600 hover:bg-red-700 text-white font-bold px-3.5 py-2 rounded-lg text-xs">Export content.json</button>
            <label class="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3.5 py-2 rounded-lg text-xs cursor-pointer">
              Import content.json
              <input type="file" id="cms-import" accept=".json" class="hidden">
            </label>
            <button type="button" id="cms-reset" class="bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold px-3.5 py-2 rounded-lg text-xs">Reset Draft</button>
            <button type="button" id="cms-logout" class="ml-auto bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-3 py-2 rounded-lg text-xs">Logout</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-slate-400 mb-1">Nama Bengkel</label>
              <input type="text" id="f-nama" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">No. WhatsApp (628...)</label>
              <input type="text" id="f-wa" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs text-slate-400 mb-1">Tagline Hero</label>
              <input type="text" id="f-tagline" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Alamat</label>
              <input type="text" id="f-alamat" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Kontak / Telepon</label>
              <input type="text" id="f-telp" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs text-slate-400 mb-1">URL Web App Google Apps Script</label>
              <input type="text" id="f-gas" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-xs uppercase tracking-wider text-red-400">Daftar Layanan & Harga</span>
              <button type="button" id="cms-add-item" class="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1 rounded-lg text-xs">+ Tambah Layanan</button>
            </div>
            <div id="cms-items" class="space-y-2"></div>
          </div>

          <div class="pt-3 border-t border-slate-800 flex items-center gap-2">
            <input type="password" id="f-new-pin" placeholder="PIN baru (min 4 karakter)" class="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white">
            <button type="button" id="cms-save-pin" class="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs">Update PIN</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    function openM() {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      toggleM();
    }

    function toggleM() {
      const lBox = document.getElementById("jms-cms-login");
      const eBox = document.getElementById("jms-cms-editor");
      if (isLoggedIn()) {
        lBox.classList.add("hidden");
        eBox.classList.remove("hidden");
        fillM();
      } else {
        lBox.classList.remove("hidden");
        eBox.classList.add("hidden");
      }
    }

    function fillM() {
      document.getElementById("f-nama").value = stateData.meta.namaBengkel || "";
      document.getElementById("f-wa").value = stateData.meta.whatsapp || "";
      document.getElementById("f-tagline").value = stateData.meta.heroTagline || "";
      document.getElementById("f-alamat").value = stateData.meta.alamat || "";
      document.getElementById("f-telp").value = stateData.meta.telepon || "";
      document.getElementById("f-gas").value = stateData.meta.appsScriptUrl || "";
      renderItemsM();
    }

    function renderItemsM() {
      const wrap = document.getElementById("cms-items");
      wrap.innerHTML = stateData.layanan
        .map(
          (item, i) => `
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input type="text" data-i="${i}" data-k="kode" value="${esc(item.kode || "")}" placeholder="Kode" class="sm:col-span-2 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white">
              <input type="text" data-i="${i}" data-k="nama" value="${esc(item.nama || "")}" placeholder="Nama Layanan" class="sm:col-span-6 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white">
              <input type="text" data-i="${i}" data-k="harga" value="${esc(item.harga || "")}" placeholder="Harga" class="sm:col-span-3 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white">
              <button type="button" data-del="${i}" class="sm:col-span-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded text-xs font-bold py-1.5">✕</button>
            </div>
            <input type="text" data-i="${i}" data-k="deskripsi" value="${esc(item.deskripsi || "")}" placeholder="Deskripsi layanan" class="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white">
          </div>
        `
        )
        .join("");

      wrap.querySelectorAll("button[data-del]").forEach((b) => {
        b.addEventListener("click", () => {
          stateData.layanan.splice(Number(b.getAttribute("data-del")), 1);
          renderItemsM();
        });
      });
    }

    function collectM() {
      stateData.meta.namaBengkel = document.getElementById("f-nama").value.trim();
      stateData.meta.whatsapp = document.getElementById("f-wa").value.trim();
      stateData.meta.heroTagline = document.getElementById("f-tagline").value.trim();
      stateData.meta.alamat = document.getElementById("f-alamat").value.trim();
      stateData.meta.telepon = document.getElementById("f-telp").value.trim();
      stateData.meta.appsScriptUrl = document.getElementById("f-gas").value.trim();

      document.querySelectorAll("#cms-items input[data-i]").forEach((inp) => {
        const i = Number(inp.getAttribute("data-i"));
        const k = inp.getAttribute("data-k");
        if (stateData.layanan[i]) stateData.layanan[i][k] = inp.value;
      });
    }

    trigger.addEventListener("click", openM);
    document.getElementById("jms-cms-close").addEventListener("click", () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    });

    document.getElementById("jms-cms-enter").addEventListener("click", () => {
      const p = document.getElementById("jms-cms-pin").value.trim();
      const err = document.getElementById("jms-cms-err");
      if (p === getPin()) {
        sessionStorage.setItem(AUTH_KEY, "true");
        err.classList.add("hidden");
        document.getElementById("jms-cms-pin").value = "";
        toggleM();
      } else {
        err.classList.remove("hidden");
      }
    });

    document.getElementById("cms-logout").addEventListener("click", () => {
      sessionStorage.removeItem(AUTH_KEY);
      toggleM();
    });

    document.getElementById("cms-add-item").addEventListener("click", () => {
      stateData.layanan.push({
        kode: `SRV-0${stateData.layanan.length + 1}`,
        nama: "Layanan Baru",
        harga: "IDR 0",
        deskripsi: ""
      });
      renderItemsM();
    });

    document.getElementById("cms-preview").addEventListener("click", () => {
      collectM();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(stateData));
      renderPage();
      alert("Pratinjau disimpan di browser. Export content.json lalu upload ke assets/content.json di GitHub agar live untuk semua pengunjung.");
    });

    document.getElementById("cms-export").addEventListener("click", () => {
      collectM();
      const blob = new Blob([JSON.stringify(stateData, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "content.json";
      a.click();
    });

    document.getElementById("cms-import").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          stateData = window.mergeJmsData(JSON.parse(reader.result));
          localStorage.setItem(DRAFT_KEY, JSON.stringify(stateData));
          fillM();
          renderPage();
          alert("content.json berhasil di-import.");
        } catch (_) {
          alert("File JSON tidak valid.");
        }
      };
      reader.readAsText(file);
    });

    document.getElementById("cms-reset").addEventListener("click", () => {
      localStorage.removeItem(DRAFT_KEY);
      loadJmsData().then(fillM);
    });

    document.getElementById("cms-save-pin").addEventListener("click", () => {
      const np = document.getElementById("f-new-pin").value.trim();
      if (np.length < 4) {
        alert("PIN minimal 4 karakter.");
        return;
      }
      localStorage.setItem(PIN_KEY, np);
      document.getElementById("f-new-pin").value = "";
      alert("PIN Admin berhasil diperbarui.");
    });

    if (new URLSearchParams(window.location.search).get("admin") === "1") {
      openM();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadJmsData();
    bindForm();
    initAdmin();
  });
})();
