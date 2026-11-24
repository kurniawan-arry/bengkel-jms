window.JMS_PRICELIST = {
  escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  renderCards(containerId, layananList, onSelectCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!Array.isArray(layananList) || layananList.length === 0) {
      container.innerHTML = `<p class="text-slate-400 text-sm col-span-full text-center">Belum ada daftar layanan.</p>`;
      return;
    }

    container.innerHTML = layananList
      .map(
        (item) => `
        <div class="bg-slate-900/90 border border-slate-800 hover:border-red-500/50 rounded-2xl p-6 transition-all flex flex-col justify-between shadow-lg">
          <div>
            <div class="flex items-center justify-between gap-2 mb-3">
              <span class="text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-md">${this.escapeHtml(item.kode || "SRV")}</span>
              <span class="text-sm font-extrabold text-emerald-400">${this.escapeHtml(item.harga || "")}</span>
            </div>
            <h3 class="text-lg font-bold text-white mb-2">${this.escapeHtml(item.nama || "")}</h3>
            <p class="text-slate-400 text-sm leading-relaxed">${this.escapeHtml(item.deskripsi || "")}</p>
          </div>
          <div class="mt-6 pt-4 border-t border-slate-800/80">
            <a href="#kalkulator" data-nama="${this.escapeHtml(item.nama || "")}" class="jms-pilih-layanan text-xs font-bold text-red-400 hover:text-red-300 inline-flex items-center gap-1">
              <span>Pilih Layanan Ini →</span>
            </a>
          </div>
        </div>
      `
      )
      .join("");

    container.querySelectorAll(".jms-pilih-layanan").forEach((el) => {
      el.addEventListener("click", () => {
        const nama = el.getAttribute("data-nama");
        if (typeof onSelectCallback === "function") {
          onSelectCallback(nama);
        }
      });
    });
  },

  renderSelect(selectId, layananList) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const prevValue = select.value;
    const opts = (Array.isArray(layananList) ? layananList : [])
      .map(
        (item) =>
          `<option value="${this.escapeHtml(item.nama)}" data-kode="${this.escapeHtml(item.kode || "")}">${this.escapeHtml(item.nama)}</option>`
      )
      .join("");

    select.innerHTML =
      `<option value="" disabled selected>-- Pilih Jenis Layanan --</option>` +
      opts +
      `<option value="Lain-Lain" data-kode="">Lain-Lain</option>`;

    if (prevValue) {
      select.value = prevValue;
    }
  }
};
