// script.js - Sinkronisasi status slot GET, kirim booking POST ke Google Sheets & buka WhatsApp
const SHEET_SLOT_URL = "TEMPEL_WEB_APP_URL_ANDA_DI_SINI";

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

function kirimBookingKeSheet(payload) {
  if (!SHEET_SLOT_URL || SHEET_SLOT_URL.includes("TEMPEL_WEB_APP_URL")) return;

  try {
    fetch(SHEET_SLOT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(err => {
      console.warn("Gagal mengirim data booking ke Google Sheets:", err);
    });
  } catch (err) {
    console.warn("Error saat memanggil fetch POST ke Google Sheets:", err);
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

  // 3. Render Daftar Layanan di HTML (Tanpa Estimasi Biaya / undefined + Tombol Konsultasi WA)
  const layananContainer = document.getElementById("daftar-layanan");
  const selectLayanan = document.getElementById("pilihan-layanan");

  if (layananContainer && selectLayanan) {
    layananContainer.innerHTML = jmsData.layanan.map(item => {
      const kategori = item.kategori || "Layanan Bengkel";
      const namaLayanan = item.nama || "Layanan Servis";
      const deskripsi = item.deskripsi || "";
      const pesanKonsultasi = encodeURIComponent(
        `Halo Admin JMS, saya ingin konsultasi mengenai layanan *${namaLayanan}*. Mohon informasinya.`
      );
      const waKonsultasiUrl = `https://wa.me/${nomorWA}?text=${pesanKonsultasi}`;

      return `
        <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-red-500/50 hover:bg-slate-900/80 transition-all flex flex-col justify-between">
          <div>
            <span class="text-xs font-bold text-red-500 uppercase tracking-widest bg-red-500/10 px-2.5 py-1 rounded-md inline-block mb-3">${kategori}</span>
            <h3 class="text-xl font-bold text-white mb-2">${namaLayanan}</h3>
            <p class="text-slate-400 text-sm mb-6 leading-relaxed">${deskripsi}</p>
          </div>
          <div class="pt-4 border-t border-slate-800/80">
            <a href="${waKonsultasiUrl}" target="_blank" rel="noopener noreferrer"
               class="w-full inline-flex items-center justify-center gap-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 rounded-xl transition-colors">
              💬 Konsultasikan via WhatsApp
            </a>
          </div>
        </div>
      `;
    }).join("");

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

  // 5. Handle Submit Form, Sinkronisasi .href, Kirim POST ke Sheet & Buka WhatsApp
  const bookingForm = document.getElementById("booking-form");
  const btnKirimWa = document.getElementById("btn-kirim-wa");

  function ambilDataBooking() {
    return {
      nama: document.getElementById("nama-pelanggan")?.value.trim() || "",
      mobil: document.getElementById("mobil-pelanggan")?.value.trim() || "",
      layanan: document.getElementById("pilihan-layanan")?.value || "Lain-Lain",
      catatan: document.getElementById("catatan-pelanggan")?.value.trim() || "Tidak ada catatan khusus."
    };
  }

  function buatUrlBookingWA(data) {
    const teksPesan = [
      "Halo JMS,",
      "",
      "Saya ingin melakukan booking servis dengan detail berikut:",
      `- Nama: ${data.nama}`,
      `- Mobil / Plat: ${data.mobil}`,
      `- Layanan: ${data.layanan}`,
      `- Catatan: ${data.catatan}`,
      "",
      "Mohon konfirmasi ketersediaan slotnya. Terima kasih!"
    ].join("\n");

    return `https://wa.me/${nomorWA}?text=${encodeURIComponent(teksPesan)}`;
  }

  if (bookingForm && btnKirimWa && btnKirimWa.tagName === "A") {
    const updateHref = () => {
      btnKirimWa.href = buatUrlBookingWA(ambilDataBooking());
    };
    bookingForm.addEventListener("input", updateHref);
    bookingForm.addEventListener("change", updateHref);
    updateHref();
  }

  if (bookingForm) {
    bookingForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const dataBooking = ambilDataBooking();
      const waUrl = buatUrlBookingWA(dataBooking);

      if (btnKirimWa && btnKirimWa.tagName === "A") {
        btnKirimWa.href = waUrl;
      }

      // Kirim hanya kolom Nama, Jenis Mobil & Plat, dan Layanan ke Google Sheet via POST
      kirimBookingKeSheet({
        nama: dataBooking.nama,
        mobil: dataBooking.mobil,
        layanan: dataBooking.layanan
      });

      const opened = window.open(waUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        window.location.href = waUrl;
      }
    });
  }
});
