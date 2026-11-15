// script.js - Render otomatis data ke website
document.addEventListener("DOMContentLoaded", () => {
  if (typeof jmsData === 'undefined') {
    console.error("File data.js tidak ditemukan atau gagal dimuat!");
    return;
  }

  // 1. Set Informasi Profil & Footer
  document.getElementById("nav-nama-bengkel").textContent = jmsData.profil.nama;
  document.getElementById("hero-tagline").textContent = jmsData.profil.tagline;
  document.getElementById("footer-alamat").textContent = `📍 ${jmsData.profil.alamat}`;
  document.getElementById("footer-telp").textContent = `📞 WhatsApp: ${jmsData.profil.whatsappList.join(" / ")}`;
  
  // Perbaikan variabel waLink navbar
  const navWaUrl = `https://wa.me/${jmsData.profil.whatsapp}?text=Halo%20Admin%20JMS,%20saya%20ingin%20konsultasi...`;
  document.getElementById("nav-cta-wa").setAttribute("href", navWaUrl);

  // 2. Render Status Slot
  const statusEl = document.getElementById("status-slot");
  if (statusEl) {
    statusEl.innerHTML = jmsData.statusBooking.keteranganSlot;
  }

  // 3. Render Daftar Layanan di HTML
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
    `).join('');

    selectLayanan.innerHTML = jmsData.layanan.map(item => `
      <option value="${item.nama} (${item.harga})">${item.nama} - ${item.harga}</option>
    `).join('');
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
    `).join('');
  }

  // 5. Handle Submit Form Booking ke WhatsApp
  const bookingForm = document.getElementById("booking-form");
  if (bookingForm) {
    bookingForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const nama = document.getElementById("nama-pelanggan").value;
      const motor = document.getElementById("motor-pelanggan").value;
      const layanan = document.getElementById("pilihan-layanan").value;
      const catatan = document.getElementById("catatan-pelanggan").value || "Tidak ada catatan khusus.";

      const pesan = `Halo Admin JMS,%0D%0A%0D%0ASaya ingin melakukan booking servis dengan detail berikut:%0D%0A- *Nama*: ${nama}%0D%0A- *Motor / Plat*: ${motor}%0D%0A- *Layanan*: ${layanan}%0D%0A- *Catatan*: ${catatan}%0D%0A%0D%0AMohon konfirmasi ketersediaan slotnya. Terima kasih!`;
      
      const targetWhatsApp = `https://wa.me/${jmsData.profil.whatsapp}?text=${pesan}`;
      window.open(targetWhatsApp, '_blank');
    });
  }
  // Background Slideshow Otomatis untuk Hero Section
  const heroSection = document.getElementById("hero-section");
  if (heroSection) {
    const bgImages = [
      "images/1794759372257.jpg",
      "images/1794759372275.jpg"
    ];
    let currentIndex = 0;

    // Set background awal dengan transisi halus
    heroSection.style.transition = "background-image 1s ease-in-out";

    setInterval(() => {
      currentIndex = (currentIndex + 1) % bgImages.length;
      heroSection.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.85)), url('${bgImages[currentIndex]}')`;
    }, 5000); // Berganti setiap 5 detik
  }
});
