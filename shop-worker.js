// shop-worker.js (Background Polling Thread untuk Nurjaya Shop)
const SPREADSHEET_MY_ORDERS_URL = "https://script.google.com/macros/s/AKfycbwt4IsfcqqDL_QpNJYwJKG9PlNREowsvqhdvl-WTB84haMfRcqE5ho9T8OCCwZUujt1Jw/exec";
const POLLING_INTERVAL_MS = 10000; // 10 Detik

let currentUserId = null;
let lastKnownStatuses = {}; // Menyimpan memori status terakhir per ID pesanan

// Menerima pesan inisialisasi dari main thread (misal menginfokan ID VIP user yang sedang login)
self.onmessage = function(e) {
  if (e.data && e.data.action === "init") {
    currentUserId = e.data.userId;
    fetchUserOrders();
  }
};

async function fetchUserOrders() {
  if (!currentUserId) return;

  try {
    const targetUrl = `${SPREADSHEET_MY_ORDERS_URL}?action=get_orders&user_id=${encodeURIComponent(currentUserId)}`;
    const res = await fetch(targetUrl);
    const result = await res.json();

    if (result.status === "success" && Array.isArray(result.data)) {
      let statusChanges = [];

      result.data.forEach(order => {
        const orderId = order.id_pesanan || order.id;
        const newStatus = order.status;
        const oldStatus = lastKnownStatuses[orderId];

        // Jika ada perubahan status dari polling sebelumnya
        if (oldStatus && oldStatus !== newStatus) {
          statusChanges.push({
            orderId: orderId,
            oldStatus: oldStatus,
            newStatus: newStatus,
            namaBarang: order.nama_barang || "Pesanan Kamu"
          });
        }

        // Simpan status terbaru
        lastKnownStatuses[orderId] = newStatus;
      });

      // Kirim data hasil fetch dan daftar perubahan status ke main thread
      postMessage({ 
        status: "success", 
        data: result.data, 
        changes: statusChanges 
      });
    }
  } catch (err) {
    postMessage({ status: "error", error: err.message });
  }
}

// Polling berulang setiap 10 detik
setInterval(fetchUserOrders, POLLING_INTERVAL_MS);