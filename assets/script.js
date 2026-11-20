// script.js - Render otomatis data & slot Google Sheets ke website
const SHEET_SLOT_URL = "https://script.google.com/macros/s/AKfycbywdlANrv6tT9_De8-nYfiBa5VgKI_qSSmqjmEgps82g8jkwmjBeYhaDEA3y5W3C3Gm/exec";

async function muatStatusSlot() {
  const statusEl = document.getElementById("status-slot");
  if (!statusEl) return;

  // Tampilkan status bawaan dari data.js terlebih dahulu agar tidak kosong saat loading
  if (typeof jmsData !== "undefined" && jmsData.statusBooking) {
    statusEl.innerHTML = jmsData.statusBooking.keteranganSlot;
  }

  // Lewati fetch jika URL Web App Google Sheets belum diisi
  if (!SHEET_SLOT_URL || SHEET_SLOT_URL.includes("TEMPEL_WEB_APP_URL")) return;

  try {
    const response = await fetch(SHEET_SLOT_URL, { cache: "no-store" });
    if (!response.ok) return;

    const liveStatus = await response.json();
    if (liveStatus && liveStatus.keteranganSlot) {
      statusEl.innerHTML = liveStatus.keteranganSlot;
    }
  } catch (err) {
    console.warn("Gagal mengambil status slot dari Google Sheets, menggunakan data lokal.", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof jmsData === "undefined") {
    console.error("File data.js tidak ditemukan atau gagal dimuat!");
    return;
  }

  // 1. Set Informasi Profil & Footer
  const navNama = document.getElementById("nav-nama-bengkel");
  if (navNama) navNama.textContent = jmsData.profil.nama;

  const heroTagline = document.getElementById("hero-tagline");
  if (heroTagline) heroTagline.textContent = jmsData.profil.tagline;

  const footerAlamat = document.getElementById("footer-alamat");
  if (footerAlamat) footerAlamat.textContent = `📍 ${jmsData.profil.alamat}`;

  const footerTelp = document.getElementById("footer-telp");
  if (footerTelp) {
    footerTelp.textContent = `📞 WhatsApp: ${jmsData.profil.whatsappList.join(" / ")}`;
  }

  const nomorWA = (jmsData?.profil?.whatsapp || "6281286276830").replace(/\D/g, "");
  const navWaUrl = `https://wa.me/${nomorWA}?text=${encodeURIComponent("Halo Admin JMS, saya ingin konsultasi...")}`;
  const navCtaWa = document.getElementById("nav-cta-wa");
  if (navCtaWa) navCtaWa.setAttribute("href", navWaUrl);

  // 2. Render Status Slot (Otomatis sinkron dengan Google Sheets)
  muatStatusSlot();

  // 3. Render Daftar Layanan di HTML & Dropdown Tanpa Harga + Opsi Lain-Lain
  const layananContainer = document.getElementById("daftar-layanan");
  const selectLayanan = document.getElementById("pilihan-layanan");

  if (layananContainer && selectLayanan) {
    layananContainer.innerHTML = jmsData.layanan.map(item => `
      <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-red-500/50 hover:bg-slate-900/80 transition-all flex flex-col justify-between">
        <div>
          <span class="text-xs font-bold text-red-500 uppercase tracking-widest bg-red-500/10 px-2.5 py-1 rounded-md inline-block mb-3">${item.kategori}</span>
          <h3 class="text-xl font-bold text-white mb-2">${item.nama}</h3>
          <p class="text-slate-400 text-sm mb-6 leading-relaxed">${item.deskripsi}</p>
        </div>
        <div class="flex items-center justify-between pt-4 border-t border-slate-800/80">
          <div>
            <span class="text-xs text-slate-500 block">Estimasi Biaya</span>
            <span class="text-red-400 font-extrabold text-lg">${item.harga}</span>
          </div>
          <span class="text-xs font-semibold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg">⏱️ ${item.durasi}</span>
        </div>
      </div>
    `).join("");

    // Dropdown tanpa harga + opsi Lain-Lain
    selectLayanan.innerHTML = `
      <option value="" disabled selected>-- Pilih Jenis Layanan --</option>
      ${jmsData.layanan.map(item => `
        <option value="${item.nama}">${item.nama}</option>
      `).join("")}
      <option value="Lain-Lain / Konsultasi Khusus">Lain-Lain / Konsultasi Khusus</option>
    `;
  }

  // 4. Render Galeri Foto
  const galeriContainer = document.getElementById("galeri-container");
  if (galeriContainer) {
    galeriContainer.innerHTML = jmsData.galeri.map(foto => `
      <div class="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 aspect-video">
        <img src="${foto.url}" alt="${foto.judul}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90 sm:opacity-0 group-hover:opacity-90 transition-opacity flex items-end p-5">
          <p class="text-white font-bold text-sm">${foto.judul}</p>
        </div>
      </div>
    `).join("");
  }

  // 5. Handle Submit Form Booking ke WhatsApp
  const bookingForm = document.getElementById("booking-form");
  if (bookingForm) {
    bookingForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const nama = document.getElementById("nama-pelanggan")?.value.trim() || "";
      const mobil = document.getElementById("mobil-pelanggan")?.value.trim() || "";
      const layanan = document.getElementById("pilihan-layanan")?.value || "Lain-Lain";
      const catatan = document.getElementById("catatan-pelanggan")?.value.trim() || "Tidak ada catatan khusus.";

      const teksPesan = [
        "Halo JMS,",
        "",
        "Saya ingin melakukan booking servis dengan detail berikut:",
        `- Nama: ${nama}`,
        `- Motor / Plat: ${mobil}`,
        `- Layanan: ${layanan}`,
        `- Catatan: ${catatan}`,
        "",
        "Mohon konfirmasi ketersediaan slotnya. Terima kasih!"
      ].join("\n");

      const waUrl = `https://wa.me/${nomorWA}?text=${encodeURIComponent(teksPesan)}`;

      const opened = window.open(waUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        window.location.href = waUrl;
      }
    });
  }
});
