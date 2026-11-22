/**
 * ============================================================================
 * LICHICK BY LUCUIH - GOOGLE SHEETS + GOOGLE DRIVE SERVERLESS ENGINE (v4)
 * ============================================================================
 * Fitur:
 * 1. Simpan pesanan baru otomatis dari Website (create_order)
 * 2. Simpan foto bukti pembayaran QRIS otomatis ke Google Drive (folder Bukti_Pembayaran_LiChick)
 *    dan cantumkan link gambarnya langsung di baris pesanan Google Sheets!
 * 3. Ambil daftar pesanan & rekap penjualan untuk Admin Dashboard (admin)
 * 4. Validasi pembayaran (menunggu_validasi / tervalidasi / ditolak) DAN status dapur
 *    (belum_dibuat / sedang_dibuat / siap_diantar / selesai / dibatalkan) dari Admin Dashboard
 * 5. Lacak status pesanan & status pembayaran real-time untuk halaman /track
 * 6. Simpan status buka/tutup PO & batas kuota menu (update_config)
 *
 * CARA PASANG (2 MENIT):
 * 1. Buka https://sheets.new -> beri nama "Database Pesanan LiChick"
 * 2. Klik Extensions (Ekstensi) -> Apps Script
 * 3. Hapus kode default, paste seluruh kode ini, klik Save
 * 4. Klik Deploy -> New deployment -> Web app
 *      - Execute as     : Me
 *      - Who has access : Anyone
 * 5. Saat diminta Authorize access, izinkan akses Google Sheets & Google Drive
 * 6. Salin Web App URL (akhiran /exec) -> masukkan ke Vercel Env GOOGLE_SHEETS_WEBHOOK_URL
 * ============================================================================
 */

const ORDERS_SHEET_NAME = 'Pesanan';
const CONFIG_SHEET_NAME = 'Pengaturan_Toko';
const PROOF_FOLDER_NAME = 'Bukti_Pembayaran_LiChick';
const TIMEZONE = 'Asia/Jakarta';
const API_SECRET = '';

const VALID_STATUSES = [
  'belum_dibuat',
  'sedang_dibuat',
  'siap_diantar',
  'selesai',
  'dibatalkan',
];

const VALID_PAYMENT_STATUSES = [
  'menunggu_validasi',
  'tervalidasi',
  'ditolak',
];

const STATUS_STYLE = {
  belum_dibuat:  { bg: '#FEF3C7', fg: '#92400E' },
  sedang_dibuat: { bg: '#FFEDD5', fg: '#C2410C' },
  siap_diantar:  { bg: '#DBEAFE', fg: '#1D4ED8' },
  selesai:       { bg: '#D1FAE5', fg: '#065F46' },
  dibatalkan:    { bg: '#FEE2E2', fg: '#991B1B' },
};

const PAYMENT_STYLE = {
  menunggu_validasi: { bg: '#FEF3C7', fg: '#92400E' },
  tervalidasi:       { bg: '#D1FAE5', fg: '#065F46' },
  ditolak:           { bg: '#FEE2E2', fg: '#991B1B' },
};

function nowWib() {
  return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

function todayWib() {
  return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkSecret(provided) {
  if (!API_SECRET) return true;
  return String(provided || '') === API_SECRET;
}

function getOrCreateOrdersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ORDERS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(ORDERS_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    const headers = [
      'Timestamp',           // 1
      'Kode Pesanan',        // 2
      'Tanggal Pesan',       // 3
      'Hari Pengambilan',    // 4
      'Jam Pengambilan',     // 5
      'Nama Pelanggan',      // 6
      'No WhatsApp',         // 7
      'Metode Pengambilan',  // 8
      'Alamat / Titik Temu', // 9
      'Rincian Pesanan',     // 10
      'Detail JSON',         // 11
      'Total Porsi',         // 12
      'Total Bayar (Rp)',    // 13
      'Status Pesanan',      // 14
      'Status Pembayaran',   // 15
      'Bukti Pembayaran',    // 16
      'Catatan Pesanan',     // 17
      'Updated At',          // 18
    ];

    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#EA6C04');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getOrCreateConfigSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG_SHEET_NAME);
    sheet.appendRow(['Key', 'Value', 'Updated At']);
    const headerRange = sheet.getRange(1, 1, 1, 3);
    headerRange.setBackground('#14100D');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function saveProofToDrive(orderNumber, dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  if (dataUrl.indexOf('http://') === 0 || dataUrl.indexOf('https://') === 0) {
    return dataUrl;
  }
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return '';

  try {
    const mimeType = match[1];
    const base64Data = match[2];
    const ext = mimeType.indexOf('png') !== -1 ? 'png' : 'jpg';
    const bytes = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(bytes, mimeType, orderNumber + '.' + ext);

    let folder;
    const existing = DriveApp.getFoldersByName(PROOF_FOLDER_NAME);
    if (existing.hasNext()) {
      folder = existing.next();
    } else {
      folder = DriveApp.createFolder(PROOF_FOLDER_NAME);
    }

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200';
  } catch (err) {
    return '';
  }
}

function styleStatusCell(sheet, rowIndex, status) {
  const style = STATUS_STYLE[status] || STATUS_STYLE.belum_dibuat;
  const cell = sheet.getRange(rowIndex, 14);
  cell.setBackground(style.bg);
  cell.setFontColor(style.fg);
  cell.setFontWeight('bold');
}

function stylePaymentCell(sheet, rowIndex, paymentStatus) {
  const style = PAYMENT_STYLE[paymentStatus] || PAYMENT_STYLE.menunggu_validasi;
  const cell = sheet.getRange(rowIndex, 15);
  cell.setBackground(style.bg);
  cell.setFontColor(style.fg);
  cell.setFontWeight('bold');
}

function formatCellDate(val, includeTime) {
  if (val instanceof Date && !isNaN(val.getTime())) {
    return Utilities.formatDate(
      val,
      TIMEZONE,
      includeTime ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd'
    );
  }
  return String(val || '').replace(/^'+/, '').trim();
}

function parseRowToOrder(r) {
  let items = [];
  try {
    items = JSON.parse(String(r[10] || '[]'));
    if (!Array.isArray(items)) items = [];
  } catch (e) {
    items = [];
  }

  const rawStatus = String(r[13] || 'belum_dibuat').trim();
  const status = VALID_STATUSES.indexOf(rawStatus) !== -1 ? rawStatus : 'belum_dibuat';

  const rawPay = String(r[14] || 'menunggu_validasi').trim();
  const paymentStatus = VALID_PAYMENT_STATUSES.indexOf(rawPay) !== -1
    ? rawPay
    : 'menunggu_validasi';

  let rawPhone = String(r[6] || '-').replace(/^'+/, '').trim();
  if (/^8[0-9]{8,13}$/.test(rawPhone)) rawPhone = '0' + rawPhone;

  const tsText = formatCellDate(r[0], true);
  const dateText = formatCellDate(r[2], false);
  const updatedText = formatCellDate(r[17], true) || tsText;

  return {
    timestamp: tsText,
    order_number: String(r[1] || '').replace(/^'+/, '').trim().toUpperCase(),
    order_date: dateText,
    pickup_day: String(r[3] || 'Senin'),
    pickup_slot: String(r[4] || ''),
    customer_name: String(r[5] || '-').replace(/^'+/, ''),
    customer_whatsapp: rawPhone,
    delivery_method: String(r[7] || 'pickup'),
    delivery_address: String(r[8] || '-').replace(/^'+/, ''),
    items_summary: String(r[9] || ''),
    items: items,
    total_portions: Number(r[11] || 0),
    total_amount: Number(r[12] || 0),
    order_status: status,
    payment_status: paymentStatus,
    payment_proof_url: String(r[15] || ''),
    notes: String(r[16] || '-').replace(/^'+/, ''),
    updated_at: updatedText,
  };
}

function readStoreConfig() {
  const sheet = getOrCreateConfigSheet();
  const rows = sheet.getDataRange().getValues();
  let storeOpen = true;
  let quotas = {};
  for (let i = 1; i < rows.length; i++) {
    const k = String(rows[i][0] || '').trim();
    const v = String(rows[i][1] || '').trim();
    if (k === 'store_open') storeOpen = v !== 'false';
    if (k === 'quotas') {
      try { quotas = JSON.parse(v); } catch (e) { quotas = {}; }
    }
  }
  return { store_open: storeOpen, quotas: quotas };
}

function writeConfigKey(key, value) {
  const sheet = getOrCreateConfigSheet();
  const rows = sheet.getDataRange().getValues();
  const ts = nowWib();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim() === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      sheet.getRange(i + 1, 3).setValue(ts);
      return;
    }
  }
  sheet.appendRow([key, value, ts]);
}

function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = String(params.action || 'public');
    const queryOrderNo = params.order_number
      ? String(params.order_number).trim().toUpperCase()
      : null;

    const sheet = getOrCreateOrdersSheet();
    const rows = sheet.getDataRange().getValues();
    const today = todayWib();

    const orders = [];
    const soldToday = {};
    const menuBreakdown = {};
    let matchedOrder = null;

    let totalRevenueAll = 0;
    let verifiedRevenue = 0;
    let totalPortions = 0;
    let pendingPayments = 0;
    const statusCounts = {
      belum_dibuat: 0,
      sedang_dibuat: 0,
      siap_diantar: 0,
      selesai: 0,
      dibatalkan: 0,
    };

    for (let i = 1; i < rows.length; i++) {
      const order = parseRowToOrder(rows[i]);
      if (!order.order_number) continue;

      if (queryOrderNo && order.order_number === queryOrderNo) {
        matchedOrder = order;
      }

      statusCounts[order.order_status] = (statusCounts[order.order_status] || 0) + 1;

      if (order.order_status !== 'dibatalkan') {
        totalRevenueAll += order.total_amount;
        totalPortions += order.total_portions;

        if (order.payment_status === 'tervalidasi') {
          verifiedRevenue += order.total_amount;
        } else if (order.payment_status === 'menunggu_validasi') {
          pendingPayments += 1;
        }

        if (order.order_date === today || !order.order_date) {
          order.items.forEach(function (item) {
            const pid = String(item.product_id || item.name || 'item');
            soldToday[pid] = (soldToday[pid] || 0) + Number(item.quantity || 0);
          });
        }

        order.items.forEach(function (item) {
          const name = String(item.name || item.product_id || 'Menu');
          if (!menuBreakdown[name]) {
            menuBreakdown[name] = { name: name, quantity: 0, revenue: 0 };
          }
          menuBreakdown[name].quantity += Number(item.quantity || 0);
          menuBreakdown[name].revenue += Number(item.subtotal || 0);
        });
      }

      orders.push(order);
    }

    if (queryOrderNo) {
      return jsonResponse({
        ok: true,
        today: today,
        tracked_order: matchedOrder,
      });
    }

    const storeConfig = readStoreConfig();

    if (action === 'admin') {
      if (!checkSecret(params.secret)) {
        return jsonResponse({ ok: false, error: 'Unauthorized secret' });
      }
      orders.reverse();
      return jsonResponse({
        ok: true,
        today: today,
        summary: {
          total_orders: orders.length,
          active_orders: orders.length - (statusCounts.dibatalkan || 0),
          gross_revenue: totalRevenueAll,
          verified_revenue: verifiedRevenue,
          total_portions_sold: totalPortions,
          pending_payments: pendingPayments,
          status_counts: statusCounts,
        },
        menu_breakdown: Object.keys(menuBreakdown).map(function (k) { return menuBreakdown[k]; }),
        sold_today: soldToday,
        store_config: storeConfig,
        orders: orders,
      });
    }

    return jsonResponse({
      ok: true,
      today: today,
      sold_today: soldToday,
      store_config: storeConfig,
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = String(payload.action || 'create_order');

    if (action === 'update_status') {
      if (!checkSecret(payload.secret)) {
        return jsonResponse({ ok: false, error: 'Unauthorized secret' });
      }
      const targetOrderNo = String(payload.order_number || '').trim().toUpperCase();
      const newStatus = payload.order_status ? String(payload.order_status).trim() : '';
      const newPayment = payload.payment_status ? String(payload.payment_status).trim() : '';

      if (!targetOrderNo) {
        return jsonResponse({ ok: false, error: 'Kode pesanan wajib diisi' });
      }
      if (newStatus && VALID_STATUSES.indexOf(newStatus) === -1) {
        return jsonResponse({ ok: false, error: 'Status pesanan tidak valid' });
      }
      if (newPayment && VALID_PAYMENT_STATUSES.indexOf(newPayment) === -1) {
        return jsonResponse({ ok: false, error: 'Status pembayaran tidak valid' });
      }

      const sheet = getOrCreateOrdersSheet();
      const rows = sheet.getDataRange().getValues();
      const updatedTime = nowWib();

      for (let i = 1; i < rows.length; i++) {
        const orderNo = String(rows[i][1] || '').trim().toUpperCase();
        if (orderNo === targetOrderNo) {
          const rowIndex = i + 1;
          if (newStatus) {
            sheet.getRange(rowIndex, 14).setValue(newStatus);
            styleStatusCell(sheet, rowIndex, newStatus);
          }
          if (newPayment) {
            sheet.getRange(rowIndex, 15).setValue(newPayment);
            stylePaymentCell(sheet, rowIndex, newPayment);
          }
          sheet.getRange(rowIndex, 18).setValue(updatedTime);

          const updatedRow = sheet.getRange(rowIndex, 1, 1, 18).getValues()[0];
          return jsonResponse({
            ok: true,
            message: 'Pesanan berhasil diperbarui',
            order: parseRowToOrder(updatedRow),
          });
        }
      }

      return jsonResponse({ ok: false, error: 'Pesanan tidak ditemukan di Google Sheets' });
    }

    if (action === 'update_config') {
      if (!checkSecret(payload.secret)) {
        return jsonResponse({ ok: false, error: 'Unauthorized secret' });
      }
      if (typeof payload.store_open === 'boolean') {
        writeConfigKey('store_open', payload.store_open ? 'true' : 'false');
      }
      if (payload.quotas && typeof payload.quotas === 'object') {
        writeConfigKey('quotas', JSON.stringify(payload.quotas));
      }
      return jsonResponse({ ok: true, message: 'Pengaturan toko disimpan' });
    }

    if (action === 'delete_order') {
      if (!checkSecret(payload.secret)) {
        return jsonResponse({ ok: false, error: 'Unauthorized secret' });
      }
      const targetOrderNo = String(payload.order_number || '').trim().toUpperCase();
      const sheet = getOrCreateOrdersSheet();
      const rows = sheet.getDataRange().getValues();

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][1] || '').trim().toUpperCase() === targetOrderNo) {
          sheet.deleteRow(i + 1);
          return jsonResponse({ ok: true, message: 'Pesanan dihapus' });
        }
      }
      return jsonResponse({ ok: false, error: 'Pesanan tidak ditemukan' });
    }

    // Default: create_order
    const sheet = getOrCreateOrdersSheet();
    const timestamp = nowWib();
    const orderDate = payload.order_date || todayWib();
    const orderNumber = String(
      payload.order_number || ('LCK-' + Math.floor(100000 + Math.random() * 900000))
    ).trim().toUpperCase();

    const items = Array.isArray(payload.items) ? payload.items : [];
    const itemsSummary = payload.items_summary || items.map(function (it) {
      const variant = it.variant ? ' (' + it.variant + (it.notes ? ' / ' + it.notes : '') + ')' : '';
      return it.quantity + 'x ' + it.name + variant;
    }).join(', ');

    const initialStatus = VALID_STATUSES.indexOf(payload.order_status) !== -1
      ? payload.order_status
      : 'belum_dibuat';

    const initialPayment = VALID_PAYMENT_STATUSES.indexOf(payload.payment_status) !== -1
      ? payload.payment_status
      : 'menunggu_validasi';

    const proofUrl = saveProofToDrive(
      orderNumber,
      payload.payment_proof_base64 || payload.payment_proof_url || ''
    );

    const rowData = [
      timestamp,
      orderNumber,
      orderDate,
      payload.pickup_day || 'Senin',
      payload.pickup_slot || '-',
      payload.customer_name || '-',
      payload.customer_whatsapp || '-',
      payload.delivery_method || 'pickup',
      payload.delivery_address || '-',
      itemsSummary || '-',
      JSON.stringify(items),
      Number(payload.total_portions || 0),
      Number(payload.total_amount || 0),
      initialStatus,
      initialPayment,
      proofUrl,
      payload.notes || '-',
      timestamp,
    ];

    sheet.appendRow(rowData);
    const lastRow = sheet.getLastRow();
    styleStatusCell(sheet, lastRow, initialStatus);
    stylePaymentCell(sheet, lastRow, initialPayment);

    return jsonResponse({
      ok: true,
      message: 'Pesanan dan bukti pembayaran berhasil tercatat',
      order: parseRowToOrder(rowData),
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}
