// seller-worker.js
const SPREADSHEET_ORDER_URL = "https://script.google.com/macros/s/AKfycbwXrdGh9qmn9M_L5H5Rx4a5gpytP7Fk9X4jVAmRhoq2_3vwliAg0mxjkhS4aH3_bDsh/exec";
const POLLING_INTERVAL_MS = 10000; // 10 Detik

async function fetchOrders() {
  try {
    const res = await fetch(SPREADSHEET_ORDER_URL);
    const result = await res.json();
    if (result.status === "success" && Array.isArray(result.data)) {
      // Kirim data hasil fetch ke main thread (seller.html)
      postMessage({ status: "success", data: result.data });
    }
  } catch (err) {
    postMessage({ status: "error", error: err.message });
  }
}

// Jalankan polling pertama kali
fetchOrders();

// Polling konsisten di background thread
setInterval(fetchOrders, POLLING_INTERVAL_MS);