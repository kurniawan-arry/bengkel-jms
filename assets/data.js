// data.js - Pusat Kontrol Informasi Bengkel JMS (Jamal Motor Sport)
const jmsData = {
  profil: {
    nama: "JMS (Jamal Motor Sport)",
    tagline: "Spesialis Perawatan, Tune-Up & Modifikasi Mesin Kendaraan Performa Tinggi",
    whatsapp: "6281286276830",
    whatsappList: ["0812-8627-6830", "0896-7582-7820"],
    alamat: "Jl. Jabal Mina Raya No.18 Kelapa Dua, Kecamatan Kelapa Dua, Kabupaten Tangerang, Banten 15810",
    jamOperasional: "Senin - Minggu: 15.00 - 02.00 WIB"
  },
  
  statusBooking: {
    bukaHariIni: true,
    keteranganSlot: "🟢 Status Hari Ini: Buka | 2 Slot Antrian Kosong Tersedia"
  },

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

  // Path gambar disesuaikan dari sudut pandang index.html (di root)
  galeri: [
    {
      url: "images/1794759372257.jpg",
      judul: "Corner & Mural Resmi JMS Workshop"
    },
    {
      url: "images/jms1.jpg",
      judul: "Pengerjaan & Pembersihan Ruang Mesin"
    },
    {
      url: "images/jms2.jpg",
      judul: "Komponen Blok Mesin & Kruk As Presisi"
    },
    {
      url: "images/jms3.jpg",
      judul: "Pengecekan Timing Belt & Komponen Internal"
    },
    {
      url: "images/jms4.jpg",
      judul: "Suasana Pit Servis & Penanganan Kendaraan"
    },
    {
      url: "images/jms5.jpg",
      judul: "Kalibrasi & Pengecekan Sistem AC / Tekanan"
    },
    {
      url: "images/jms6.jpg",
      judul: "Inspeksi Silinder & Pengecekan Detail Mesin"
    },
    {
      url: "images/jms7.jpg",
      judul: "Proses Servis Malam di Paddock JMS"
    }
  ]
};
