// seller-worker.js (Background Polling Thread untuk Nurjaya Seller)

// 1. URL Source Data
const SPREADSHEET_ORDER_URL = "https://script.google.com/macros/s/AKfycbwXrdGh9qmn9M_L5H5Rx4a5gpytP7Fk9X4jVAmRhoq2_3vwliAg0mxjkhS4aH3_bDsh/exec";
const FIREBASE_CHATS_REST_URL = "https://nurjaya-shop-db-default-rtdb.asia-southeast1.firebasedatabase.app/chats.json";

const POLLING_INTERVAL_MS = 10000; // 10 Detik

let lastKnownChatTimestamps = {}; // Menyimpan timestamp pesan terakhir per buyer

// 2. FUNGSI FETCH PESANAN DARI SPREADSHEET
async function fetchOrders() {
  try {
    const res = await fetch(SPREADSHEET_ORDER_URL);
    const result = await res.json();
    if (result.status === "success" && Array.isArray(result.data)) {
      postMessage({ type: "orders", status: "success", data: result.data });
    }
  } catch (err) {
    postMessage({ type: "orders", status: "error", error: err.message });
  }
}

// 3. FUNGSI FETCH CHAT BARU DARI FIREBASE (REST API)
async function fetchChats() {
  try {
    const res = await fetch(FIREBASE_CHATS_REST_URL);
    const chatsData = await res.json();

    if (chatsData) {
      let newMessages = [];

      Object.keys(chatsData).forEach(cleanUserId => {
        const item = chatsData[cleanUserId];
        
        if (item && item.messages) {
          const msgKeys = Object.keys(item.messages);
          const lastMsgKey = msgKeys[msgKeys.length - 1];
          const lastMsg = item.messages[lastMsgKey];

          // Jika pesan terakhir berasal dari pembeli ('buyer')
          if (lastMsg && lastMsg.sender === "buyer") {
            const lastTimestamp = lastMsg.timestamp || 0;
            const previousTimestamp = lastKnownChatTimestamps[cleanUserId] || 0;

            // Jika ada timestamp baru dari pembeli ini
            if (lastTimestamp > previousTimestamp && previousTimestamp !== 0) {
              // Ambil info nama buyer
              let buyerNama = cleanUserId;
              if (item.info) {
                const infoKeys = Object.keys(item.info);
                const lastInfo = item.info[infoKeys[infoKeys.length - 1]];
                if (lastInfo && lastInfo.buyerNama) buyerNama = lastInfo.buyerNama;
              }

              newMessages.push({
                buyerId: cleanUserId,
                buyerNama: buyerNama,
                text: lastMsg.type === "image" ? "📷 [Mengirim Foto]" : lastMsg.text
              });
            }

            // Simpan timestamp terbaru
            lastKnownChatTimestamps[cleanUserId] = lastTimestamp;
          }
        }
      });

      // Jika ada pesan baru masuk, kirim notifikasi ke seller.html
      if (newMessages.length > 0) {
        postMessage({ type: "chats", status: "new_messages", data: newMessages });
      }
    }
  } catch (err) {
    postMessage({ type: "chats", status: "error", error: err.message });
  }
}

// 4. FUNGSI UTAMA POLLING
function runWorkerPolling() {
  fetchOrders();
  fetchChats();
}

// Jalankan pertama kali & berulang per 10 detik
runWorkerPolling();
setInterval(runWorkerPolling, POLLING_INTERVAL_MS);
