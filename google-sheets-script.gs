/**
 * ============================================================================
 * LICHICK BY LUCUIH — GOOGLE SHEETS BACKEND & REAL-TIME QUOTA ENGINE (50 PORSI)
 * ============================================================================
 * Cara Pasang (Hanya 2 Menit):
 * 1. Buka Google Sheets baru di https://sheets.new (Beri nama: "Database Pesanan LiChick")
 * 2. Klik menu "Extensions" (Ekstensi) -> "Apps Script"
 * 3. Hapus semua kode yang ada, lalu Paste seluruh kode di file ini, klik Save (ikon disket)
 * 4. Klik tombol "Deploy" (di kanan atas) -> "New deployment"
 * 5. Pilih jenis (ikon gerigi): "Web app"
 *    - Description : "LiChick Order Webhook"
 *    - Execute as  : "Me" (Email Anda)
 *    - Who has access: "Anyone" (Siapa saja — WAJIB agar website di Vercel bisa mengirim data)
 * 5. Klik "Deploy", beri izin akses (Authorize access), lalu COPY "Web app URL" (berakhiran /exec)
 * 6. Tempel "Web app URL" tersebut ke pengaturan Webhook di Website LiChick (atau di file .env).
 * ============================================================================
 */

const SHEET_NAME = 'Pesanan';
const MAX_QUOTA_PER_MENU = 50;

/**
 * Inisialisasi tabel & header otomatis jika sheet masih kosong
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    const headers = [
      'Timestamp',
      'Kode Tiket',
      'Tanggal Batch',
      'Nama Batch',
      'Slot Jam',
      'Nama Pelanggan',
      'No WhatsApp',
      'Metode Ambil',
      'Alamat Pengiriman',
      'Qty Mac Gemoy',
      'Varian Mac Gemoy',
      'Qty Fries Gemoy',
      'Varian Fries Gemoy',
      'Total Porsi',
      'Total Bayar (Rp)',
      'Status Dapur',
      'Catatan'
    ];
    sheet.appendRow(headers);

    // Styling Header LiChick Warm Culinary Craft (#EA580C)
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#EA580C');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * POST Handler: Menerima pesanan baru dari Checkout Website LiChick
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const sheet = getOrCreateSheet();
    let payload = {};

    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      payload = e.parameter;
    }

    const now = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
    const batchDate = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');

    const rowData = [
      now,
      payload.order_number || ('LCK-' + Math.floor(100000 + Math.random() * 900000)),
      payload.batch_date || batchDate,
      payload.batch_name || 'Batch 1 — Makan Siang Kampus',
      payload.pickup_slot || '11:30 - 13:00 WIB',
      payload.customer_name || '-',
      payload.customer_whatsapp || '-',
      payload.delivery_method || 'pickup',
      payload.delivery_address || '-',
      Number(payload.mac_qty || 0),
      payload.mac_flavor || '-',
      Number(payload.fries_qty || 0),
      payload.fries_flavor || '-',
      Number(payload.total_portions || 0),
      Number(payload.total_amount || 0),
      payload.order_status || 'waiting_payment',
      payload.notes || '-'
    ];

    sheet.appendRow(rowData);

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        message: 'Pesanan berhasil tercatat di Google Sheets LiChick',
        order_number: rowData[1]
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        error: err.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * GET Handler:
 * - Mengambil sisa kuota real-time dari batas 50 porsi per menu
 * - Melacak status pesanan berdasarkan Kode Tiket (?order_number=LCK-...)
 * - Menampilkan daftar pesanan terbaru untuk halaman Admin Dashboard
 */
function doGet(e) {
  try {
    const sheet = getOrCreateSheet();
    const rows = sheet.getDataRange().getValues();
    const todayStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
    const queryOrderNo = e && e.parameter && e.parameter.order_number
      ? String(e.parameter.order_number).trim().toUpperCase()
      : null;

    let batchQuotas = {
      batch_1: { mac_sold: 0, fries_sold: 0, mac_remaining: MAX_QUOTA_PER_MENU, fries_remaining: MAX_QUOTA_PER_MENU },
      batch_2: { mac_sold: 0, fries_sold: 0, mac_remaining: MAX_QUOTA_PER_MENU, fries_remaining: MAX_QUOTA_PER_MENU }
    };

    let matchedOrder = null;
    let recentOrders = [];
    let verifiedRevenue = 0;
    let grossRevenue = 0;
    let totalPortionsSold = 0;

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const orderNo = String(r[1] || '').trim().toUpperCase();
      const batchName = String(r[3] || '');
      const macQty = Number(r[9] || 0);
      const friesQty = Number(r[11] || 0);
      const portions = Number(r[13] || 0);
      const amount = Number(r[14] || 0);
      const status = String(r[15] || 'waiting_payment').trim();

      const orderObj = {
        timestamp: r[0],
        order_number: orderNo,
        batch_date: r[2],
        batch_name: batchName,
        pickup_time_slot: r[4],
        customer_name: r[5],
        customer_whatsapp: r[6],
        delivery_method: r[7],
        delivery_address: r[8],
        mac_qty: macQty,
        mac_flavor: r[10],
        fries_qty: friesQty,
        fries_flavor: r[12],
        total_portions: portions,
        total_amount: amount,
        order_status: status,
        notes: r[16]
      };

      if (queryOrderNo && orderNo === queryOrderNo) {
        matchedOrder = orderObj;
      }

      if (status !== 'cancelled') {
        const isBatch2 = batchName.toLowerCase().includes('batch 2') || batchName.toLowerCase().includes('sore');
        const targetBatch = isBatch2 ? batchQuotas.batch_2 : batchQuotas.batch_1;
        targetBatch.mac_sold += macQty;
        targetBatch.fries_sold += friesQty;
        targetBatch.mac_remaining = Math.max(0, MAX_QUOTA_PER_MENU - targetBatch.mac_sold);
        targetBatch.fries_remaining = Math.max(0, MAX_QUOTA_PER_MENU - targetBatch.fries_sold);

        grossRevenue += amount;
        totalPortionsSold += portions;
        if (status === 'processing' || status === 'ready_pickup' || status === 'completed') {
          verifiedRevenue += amount;
        }
      }

      recentOrders.push(orderObj);
    }

    recentOrders.reverse();

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        today: todayStr,
        max_quota_per_menu: MAX_QUOTA_PER_MENU,
        quotas: batchQuotas,
        summary: {
          total_orders: recentOrders.length,
          verified_revenue: verifiedRevenue,
          gross_revenue: grossRevenue,
          total_portions_sold: totalPortionsSold
        },
        tracked_order: matchedOrder,
        orders: recentOrders.slice(0, 50)
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        error: err.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
