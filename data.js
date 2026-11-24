window.JMS_DEFAULT_DATA = {
  meta: {
    namaBengkel: "Jamal Motor Sport",
    subBrand: "Pro Performance Workshop",
    whatsapp: "6281234567890",
    heroBg: "images/1794759372257.jpg",
    heroTagline: "Spesialis Perawatan, Tune-Up & Modifikasi Mobil Performa Tinggi",
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
  layanan: [
    {
      kode: "SRV-01",
      kategori: "Mesin & ECU",
      durasi: "60 - 90 Menit",
      nama: "Service ECU Engine & General Cek",
      harga: "IDR 2.900.000",
      nominal: 2900000,
      deskripsi: "Pemeriksaan menyeluruh ECU, sensor mesin, dan diagnostik performa mobil."
    },
    {
      kode: "PRT-02",
      kategori: "Sparepart",
      durasi: "45 - 60 Menit",
      nama: "Pompa Bensin A/M",
      harga: "IDR 785.000",
      nominal: 785000,
      deskripsi: "Penggantian pompa bensin aftermarket berkualitas untuk suplai bahan bakar optimal."
    },
    {
      kode: "PRT-03",
      kategori: "Sparepart",
      durasi: "30 - 45 Menit",
      nama: "Seal dan Clip Fuel Pump",
      harga: "IDR 385.000",
      nominal: 385000,
      deskripsi: "Penggantian seal serta clip pengunci fuel pump agar bebas bocor dan tekanan stabil."
    },
    {
      kode: "SRV-04",
      kategori: "Perawatan Berkala",
      durasi: "30 - 60 Menit",
      nama: "Ganti Oli & Perawatan Rutin",
      harga: "IDR 150.000",
      nominal: 150000,
      deskripsi: "Penggantian oli mesin, pengecekan cairan, dan inspeksi berkala mobil harian."
    }
  ],
  galeri: [
    {
      judul: "Pit Servis & Diagnostik JMS",
      keterangan: "Penanganan teliti pada sistem mesin dan kaki-kaki mobil.",
      gambar: "images/1794759372257.jpg"
    }
  ]
};

window.parseRupiahNumber = function (val) {
  if (typeof val === "number" && !isNaN(val)) return val;
  const digits = String(val || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
};

window.formatRupiahIdr = function (num) {
  const n = Number(num || 0);
  return "Rp " + n.toLocaleString("id-ID");
};

window.mergeJmsData = function (raw) {
  const base = window.JMS_DEFAULT_DATA;
  const rawLayanan = Array.isArray(raw && raw.layanan) && raw.layanan.length
    ? raw.layanan
    : base.layanan;

  const normalizedLayanan = rawLayanan.map((item, idx) => {
    const nominal = window.parseRupiahNumber(
      item.nominal !== undefined ? item.nominal : item.harga
    );
    return {
      kode: item.kode || `SRV-0${idx + 1}`,
      kategori: item.kategori || "Servis Mobil",
      durasi: item.durasi || "60 Menit",
      nama: item.nama || "Layanan Servis",
      nominal: nominal,
      harga: item.harga || `IDR ${nominal.toLocaleString("id-ID")}`,
      deskripsi: item.deskripsi || ""
    };
  });

  const rawGaleri = Array.isArray(raw && raw.galeri) && raw.galeri.length
    ? raw.galeri
    : base.galeri;

  return {
    meta: Object.assign({}, base.meta, raw && raw.meta ? raw.meta : {}),
    layanan: normalizedLayanan,
    galeri: rawGaleri.map((g) => ({
      judul: g.judul || "Dokumentasi JMS",
      keterangan: g.keterangan || "",
      gambar: g.gambar || ""
    }))
  };
};
