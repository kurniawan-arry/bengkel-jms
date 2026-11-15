// data.js - Pusat Kontrol Informasi Bengkel JMS (Jamal Motor Sport)
const jmsData = {
  profil: {
    nama: "JMS (Jamal Motor Sport)",
    tagline: "Spesialis Perawatan, Tune-Up & Modifikasi Mesin Kendaraan Performa Tinggi",
    // Menggunakan nomor WhatsApp pertama sebagai kontak utama/link cepat
    whatsapp: "6281286276830", 
    whatsappList: ["0812-8627-6830", "0896-7582-7820"],
    alamat: "Jl. Jabal Mina Raya No.18 Kelapa Dua, Kecamatan Kelapa Dua, Kabupaten Tangerang, Banten 15810",
    jamOperasional: "Senin - Sabtu: 09.00 - 18.00 WIB"
  },
  
  // Status Ketersediaan Slot Bengkel Hari Ini
  statusBooking: {
    bukaHariIni: true,
    keteranganSlot: "🟢 Status Hari Ini: Buka | 2 Slot Antrian Kosong Tersedia"
  },

  // Daftar Layanan & Harga
  layanan: [
    {
      id: "tuneup",
      nama: "Tune-Up Mesin & Injeksi",
      harga: "Rp 75.000",
      durasi: "45 Menit",
      deskripsi: "Pembersihan komponen bakar, cek busi, setel klep presisi, dan diagnostik optimal.",
      kategori: "Servis Ringan"
    },
    {
      id: "gantioli",
      nama: "Ganti Oli & Perawatan Rutin",
      harga: "Rp 35.000 (Jasa)",
      durasi: "15 Menit",
      deskripsi: "Penggantian oli mesin profesional dengan pelumas original pilihan terbaik.",
      kategori: "Perawatan Rutin"
    },
    {
      id: "ac-diagnostik",
      nama: "Pengecekan & Servis AC / Sistem Pendingin",
      harga: "Mulai Rp 100.000",
      durasi: "45-60 Menit",
      deskripsi: "Manifold gauge testing, cek tekanan freon, dan perbaikan sistem pendingin.",
      kategori: "Kaki-Kaki & AC"
    },
    {
      id: "overhaul",
      nama: "Overhaul / Turun Mesin Total",
      harga: "Mulai Rp 350.000",
      durasi: "2-3 Hari",
      deskripsi: "Pengecekan total komponen silinder, piston, kruk as, timing belt, dan blok mesin.",
      kategori: "Servis Berat"
    }
  ],

  // Galeri Foto Dokumentasi Bengkel JMS (Sesuai foto yang Anda unggah)
  galeri: [
    {
      url: "jms1.jpg",
      judul: "Pengerjaan & Pembersihan Ruang Mesin"
    },
    {
      url: "jms2.jpg",
      judul: "Komponen Blok Mesin & Kruk As Presisi"
    },
    {
      url: "jms3.jpg",
      judul: "Pengecekan Timing Belt & Komponen Internal"
    },
    {
      url: "jms4.jpg",
      judul: "Suasana Pit Servis & Penanganan Kendaraan"
    },
    {
      url: "jms5.jpg",
      judul: "Kalibrasi & Pengecekan Sistem AC / Tekanan"
    },
    {
      url: "jms6.jpg",
      judul: "Inspeksi Silinder & Pengecekan Detail Mesin"
    },
    {
      url: "jms7.jpg",
      judul: "Proses Servis Malam di Paddock JMS"
    }
  ]
};
