// script.js - Sinkronisasi status slot GET, kirim booking POST ke Google Sheets, logo WA + teks & buka WhatsApp
const SHEET_SLOT_URL = "https://script.google.com/macros/s/AKfycbytJZSrv1o4WhofS7OJgGc1X4X14kxP3G6gd2OjHk7HyU4jkX48R6M_Juo0-Q7vLP9q/execc";
const TEKS_TOMBOL_WA = "Konsultasi Via Whatsapp";

function ikonWhatsApp(className = "w-4 h-4 shrink-0") {
  return `
    <svg class="${className}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.52 3.48A11.82 11.82 0 0 0 12.07 0C5.5 0 .16 5.34.16 11.91c0 2.1.55 4.15 1.6 5.96L0 24l6.3-1.65a11.87 11.87 0 0 0 5.77 1.47h.01c6.57 0 11.91-5.34 11.91-11.91 0-3.18-1.24-6.17-3.47-8.43zm-8.44 18.33h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.85 9.85 0 0 1-1.51-5.29c0-5.45 4.44-9.89 9.9-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.9 7c0 5.45-4.44 9.89-9.9 9.89zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5s1.07 2.9 1.22 3.1c.15.2 2.11 3.22 5.11 4.52.71.31 1.27.49 1.71.63.72.23 1.37.2 1.89.12.58-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"/>
    </svg>
  `;
}

function setLogoDanTeksWa(el, labelText = TEKS_TOMBOL_WA, iconClass = "w-4 h-4 shrink-0") {
  if (!el) return;
  const teks = labelText || TEKS_TOMBOL_WA;
  el.setAttribute("aria-label", teks);
  el.setAttribute("title", teks);
  el.innerHTML = `${ikonWhatsApp(iconClass)}<span>${teks}</span>`;
}

function terapkanLogoDanTeksWaKeTombol() {
  const targetIds = ["nav-cta-wa", "btn-kirim-wa"];
  targetIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) setLogoDanTeksWa(el, TEKS_TOMBOL_WA);
  });

  document.querySelectorAll("a, button").forEach((el) => {
    // Jangan sentuh link navigasi menu utama
    if (el.closest("nav")) return;

    const teks = (el.textContent || "").trim().toLowerCase();
    const href = (el.getAttribute("href") || "").toLowerCase();
    const cocokWa =
      href.includes("wa.me") ||
      href.includes("whatsapp") ||
      el.id === "nav-cta-wa" ||
      el.id === "btn-kirim-wa" ||
      teks.includes("whatsapp") ||
      teks.includes("konsultasi");

    if (cocokWa) {
      setLogoDanTeksWa(el, TEKS_TOMBOL_WA);
    }
  });
}

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
  // Hapus tombol "Lihat Daftar Harga" jika ada di luar <nav>
  document.querySelectorAll("a, button").forEach((el) => {
    if (el.closest("nav")) return;
    const teks = (el.textContent || "").trim().toLowerCase();
    const href = (el.getAttribute("href") || "").toLowerCase();
    if (teks.includes("lihat daftar harga") || href.includes("daftar-harga")) {
      if (!teks.includes("whatsapp") && !teks.includes("konsultasi")) {
        el.remove();
      }
    }
  });

  if (typeof jmsData === "undefined") {
    console.error("File data.js tidak ditemukan atau gagal dimuat!");
    terapkanLogoDanTeksWaKeTombol();
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
  if (navCtaWa) {
    navCtaWa.setAttribute("href", navWaUrl);
    setLogoDanTeksWa(navCtaWa, TEKS_TOMBOL_WA);
  }

  // 2. Render Status Slot (Otomatis sinkron dengan Google Sheets)
  muatStatusSlot();

  // 3. Render Daftar Layanan di HTML (Tanpa Estimasi Biaya / undefined + Logo WA + Teks) & Dropdown
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
               aria-label="${TEKS_TOMBOL_WA} - ${namaLayanan}"
               title="${TEKS_TOMBOL_WA} - ${namaLayanan}"
               class="w-full inline-flex items-center justify-center gap-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 rounded-xl transition-colors">
              ${ikonWhatsApp("w-4 h-4 shrink-0")}
              <span>${TEKS_TOMBOL_WA}</span>
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
  if (btnKirimWa) {
    setLogoDanTeksWa(btnKirimWa, TEKS_TOMBOL_WA);
  }

  terapkanLogoDanTeksWaKeTombol();

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
      "Halo Admin JMS,",
      "",
      "Saya ingin melakukan booking servis mobil dengan detail berikut:",
      `- Nama: ${data.nama}`,
      `- Mobil & Plat: ${data.mobil}`,
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

      // Kirim hanya kolom Nama, Jenis Mobil & Plat, Layanan, dan Status ke Google Sheet via POST
      kirimBookingKeSheet({
        nama: dataBooking.nama,
        mobil: dataBooking.mobil,
        layanan: dataBooking.layanan,
        status: "Antri"
      });

      const opened = window.open(waUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        window.location.href = waUrl;
      }
    });
  }
});
