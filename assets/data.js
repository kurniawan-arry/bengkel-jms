// data.js - Pusat Kontrol Informasi Bengkel JMS
const jmsData = {
  profil: {
    nama: "JMS (Jamal Motor Sport)",
    tagline: "Spesialis Perawatan, Tune-Up & Modifikasi Motor Performa Tinggi",
    whatsapp: "6281234567890", // Ganti nomor WhatsApp admin (Awali dengan 62 tanpa +)
    alamat: "Jl. Otomotif Raya No. 45, Jakarta Selatan",
    jamOperasional: "Senin - Sabtu: 09.00 - 18.00 WIB"
  },
  
  // Status Ketersediaan Slot Bengkel Hari Ini
  statusBooking: {
    bukaHariIni: true,
    keteranganSlot: "🟢 Status Hari Ini: Buka | 2 Slot Antrian Kosong Tersedia"
  },

  // Daftar Layanan & Harga (Sangat mudah ditambah/diedit di sini)
  layanan: [
    {
      id: "tuneup",
      nama: "Tune-Up Injeksi & Karburator",
      harga: "Rp 75.000",
      durasi: "45 Menit",
      deskripsi: "Pembersihan throttle body/karburator, cek busi, setel klep presisi, dan scan ECU.",
      kategori: "Servis Ringan"
    },
    {
      id: "gantioli",
      nama: "Ganti Oli & Perawatan Rutin",
      harga: "Rp 35.000 (Jasa)",
      durasi: "15 Menit",
      deskripsi: "Penggantian oli mesin & gardan profesional dengan pelumas original pilihan terbaik.",
      kategori: "Perawatan Rutin"
    },
    {
      id: "cvt",
      nama: "Servis CVT Matic / Kampas Ganda",
      harga: "Rp 60.000",
      durasi: "30 Menit",
      deskripsi: "Pembersihan mangkok ganda, roller, v-belt checking, dan pelumasan CVT anti-gredek.",
      kategori: "Servis CVT"
    },
    {
      id: "boredom",
      nama: "Upgrade Bore Up & Porting Polish",
      harga: "Mulai Rp 250.000",
      durasi: "1-2 Hari",
      deskripsi: "Optimalisasi lubang intake/exhaust dan peningkatan kapasitas silinder untuk akselerasi maksimal.",
      kategori: "Modifikasi Mesin"
    },
    {
      id: "overhaul",
      nama: "Overhaul / Turun Mesin Total",
      harga: "Mulai Rp 350.000",
      durasi: "2-3 Hari",
      deskripsi: "Pengecekan total komponen silinder, piston, kruk as, stang seher, dan kopling.",
      kategori: "Servis Berat"
    },
    {
      id: "dyno",
      nama: "Dyno Test & Mapping ECU",
      harga: "Rp 150.000",
      durasi: "45 Menit",
      deskripsi: "Pengujian tenaga kuda (HP) & torsi presisi serta tuning AFR (Air-Fuel Ratio) optimal.",
      kategori: "Tuning Performa"
    }
  ],

  // Galeri Foto Bengkel (Ganti URL atau tambahkan foto baru dengan mudah)
  galeri: [
    {
      url: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80",
      judul: "Area Paddock & Pit Servis Utama"
    },
    {
      url: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80",
      judul: "Pengecekan Presisi Mesin Sportbike"
    },
    {
      url: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80",
      judul: "Perawatan Motor Matic & Harian"
    }
  ]
};
