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
  layanan: [],
  galeri: []
};

window.mergeJmsData = function (raw) {
  const base = window.JMS_DEFAULT_DATA;
  return {
    meta: Object.assign({}, base.meta, raw && raw.meta ? raw.meta : {}),
    layanan: Array.isArray(raw && raw.layanan) ? raw.layanan : base.layanan.slice(),
    galeri: Array.isArray(raw && raw.galeri) ? raw.galeri : base.galeri.slice()
  };
};
