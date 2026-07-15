import type { Order, Settings, Supplier, SupplierLedgerEntry } from './types'

export function generateBillCode(orderNumber: number, createdAt: string | Date): string {
  const d = new Date(createdAt)
  const y = d.getFullYear().toString().slice(-2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `BILL-${y}${m}${day}-${String(orderNumber).padStart(4, '0')}`
}

export function generateBarcodeSVG(code: string): string {
  const bars = Array.from(code).flatMap((char) => {
    const ascii = char.charCodeAt(0)
    return ascii
      .toString(2)
      .padStart(8, '0')
      .split('')
      .map((bit) => (bit === '1' ? 3 : 1))
  })

  const quietZone = 10
  const width = bars.reduce((sum, w) => sum + w, 0) + quietZone * 2
  const height = 60

  let x = quietZone
  const rects = bars
    .map((w, i) => {
      const fill = i % 2 === 0 ? '#111' : '#fff'
      const rect = `<rect x="${x}" y="0" width="${w}" height="${height}" fill="${fill}" />`
      x += w
      return rect
    })
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="barcode">${rects}</svg>`
}

export function formatCurrency(amount: number, symbol: string = '$'): string {
  return `${symbol}${amount.toFixed(2)}`
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

export function generateReceiptHTML(order: Order, settings: Settings): string {
  const billCode = generateBillCode(order.orderNumber, order.createdAt)
  const hasLogo = typeof settings.logo === 'string' && settings.logo.trim().length > 0
  const itemsHTML = order.items
    .map(
      (item) => `
    <tr>
      <td style="text-align: left; padding: 4px 0;">
        ${item.quantity}x ${item.name}
        ${item.chairNumber ? `<br><small style="color: #666;">Chair ${item.chairNumber}</small>` : ''}
        ${item.modifiers.length > 0 ? `<br><small style="color: #666;">${item.modifiers.map(m => m.name).join(', ')}</small>` : ''}
        ${item.notes ? `<br><small style="color: #666; font-style: italic;">Note: ${item.notes}</small>` : ''}
      </td>
      <td style="text-align: right; padding: 4px 0;">${formatCurrency((item.price + item.modifiers.reduce((sum, m) => sum + m.price, 0)) * item.quantity, settings.currencySymbol)}</td>
    </tr>
  `
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt #${order.orderNumber}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .logo-wrap { display: flex; justify-content: center; margin-bottom: 8px; }
        .logo-wrap img { max-width: 90px; max-height: 90px; object-fit: contain; }
        .header h1 { margin: 0; font-size: 18px; }
        .header p { margin: 5px 0; color: #666; }
        table { width: 100%; border-collapse: collapse; }
        .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
        .totals td { padding: 4px 0; }
        .total-row { font-weight: bold; font-size: 14px; }
        .footer { text-align: center; margin-top: 20px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        ${hasLogo ? `<div class="logo-wrap"><img src="${settings.logo}" alt="${settings.restaurantName} logo" /></div>` : ''}
        <h1>${settings.restaurantName}</h1>
        <p>${settings.address}</p>
        <p>${settings.phone}</p>
      </div>
      
      <div class="divider"></div>
      
      <p><strong>Order #${order.orderNumber}</strong></p>
      <p>${formatDateTime(order.createdAt)}</p>
      ${order.tableName ? `<p>Table: ${order.tableName}</p>` : ''}
      
      <div class="divider"></div>
      
      <table>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
      
      <div class="divider"></div>
      
      <table class="totals">
        <tr>
          <td>Subtotal</td>
          <td style="text-align: right;">${formatCurrency(order.subtotal, settings.currencySymbol)}</td>
        </tr>
        ${order.tax > 0 ? `
        <tr>
          <td>Service Charge (${settings.taxRate}%)</td>
          <td style="text-align: right;">${formatCurrency(order.tax, settings.currencySymbol)}</td>
        </tr>` : ''}
        <tr class="total-row">
          <td>TOTAL</td>
          <td style="text-align: right;">${formatCurrency(order.total, settings.currencySymbol)}</td>
        </tr>
      </table>
      
      <div class="divider"></div>
      
      <p>Payment: ${order.paymentMethod?.toUpperCase() || 'PENDING'}</p>
      ${order.paymentCollectedBy ? `<p>Collected By: <strong>${order.paymentCollectedBy}</strong></p>` : ''}
      <p>Bill Code: <strong>${billCode}</strong></p>
      <div style="margin-top:8px; text-align:center;">
        ${generateBarcodeSVG(billCode)}
      </div>
      
      <div class="footer">
        <p>${settings.receiptFooter}</p>
      </div>
    </body>
    </html>
  `
}

export function generateKitchenDocketHTML(order: Order, settings: Settings): string {
  const itemsHTML = order.items
    .map(
      (item) => `
    <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #ccc;">
      <div style="font-size: 20px; font-weight: bold;">
        ${item.quantity}x ${item.name}
        ${item.chairNumber ? `<div style="font-size: 14px; margin-top: 4px; color: #444;">Chair ${item.chairNumber}</div>` : ''}
      </div>
      ${item.modifiers.length > 0 ? `<div style="font-size: 16px; margin-top: 5px; color: #333;">+ ${item.modifiers.map(m => m.name).join(', ')}</div>` : ''}
      ${item.notes ? `<div style="font-size: 16px; margin-top: 5px; color: #c00; font-weight: bold;">** ${item.notes} **</div>` : ''}
    </div>
  `
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Kitchen Docket #${order.orderNumber}</title>
      <style>
        body { font-family: 'Arial', sans-serif; width: 280px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; }
        .order-number { font-size: 48px; font-weight: bold; }
        .table-info { font-size: 24px; margin-top: 10px; }
        .time { font-size: 16px; color: #666; margin-top: 5px; }
        .priority { background: #f00; color: #fff; padding: 5px 10px; font-weight: bold; display: inline-block; margin-top: 10px; }
        .items { margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="order-number">#${order.orderNumber}</div>
        ${order.tableName ? `<div class="table-info">${order.tableName}</div>` : '<div class="table-info">TAKEAWAY</div>'}
        <div class="time">${formatTime(order.createdAt)}</div>
        ${order.isPriority ? '<div class="priority">RUSH ORDER</div>' : ''}
      </div>
      
      <div class="items">
        ${itemsHTML}
      </div>
    </body>
    </html>
  `
}

export function generateTakeawayDocketHTML(order: Order, settings: Settings): string {
  const billCode = generateBillCode(order.orderNumber, order.createdAt)
  const itemsHTML = order.items
    .map(
      (item) => `
    <div style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px dashed #ccc;">
      <div style="font-size: 18px; font-weight: 700;">${item.quantity}x ${item.name}</div>
      ${item.chairNumber ? `<div style="font-size: 14px; margin-top: 4px; color: #444;">Chair ${item.chairNumber}</div>` : ''}
      ${item.modifiers.length > 0 ? `<div style="font-size: 14px; margin-top: 4px; color: #444;">+ ${item.modifiers.map((m) => m.name).join(', ')}</div>` : ''}
      ${item.notes ? `<div style="font-size: 14px; margin-top: 4px; color: #b00020; font-weight: 600;">Note: ${item.notes}</div>` : ''}
    </div>
  `
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Takeaway Docket #${order.orderNumber}</title>
      <style>
        body { font-family: 'Arial', sans-serif; width: 300px; margin: 0 auto; padding: 16px; }
        .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .restaurant { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
        .order { font-size: 34px; font-weight: 800; line-height: 1.1; }
        .meta { font-size: 13px; color: #444; margin-top: 4px; }
        .bill { font-size: 13px; font-weight: 700; margin-top: 4px; }
        .section-title { margin-top: 10px; margin-bottom: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.04em; text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="restaurant">${settings.restaurantName}</div>
        <div class="order">#${order.orderNumber}</div>
        <div class="meta">TAKEAWAY · ${formatDateTime(order.createdAt)}</div>
        <div class="bill">Bill No: ${billCode}</div>
        <div class="bill">Order Details</div>
      </div>

      <div class="section-title">Order Details</div>
      ${itemsHTML}
    </body>
    </html>
  `
}

export function printDocument(html: string): void {
  const printWindow = window.open('', '_blank', 'width=400,height=600')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }
}

export function printReceipt(order: Order, settings: Settings): void {
  const html = generateReceiptHTML(order, settings)
  printDocument(html)
}

export function printKitchenDocket(order: Order, settings: Settings): void {
  const html = generateKitchenDocketHTML(order, settings)
  printDocument(html)
}

export function printTakeawayDocket(order: Order, settings: Settings): void {
  const html = generateTakeawayDocketHTML(order, settings)
  printDocument(html)
}

export function generateSupplierStatementHTML(
  supplier: Supplier,
  entries: SupplierLedgerEntry[],
  settings: Settings,
  summary: { purchases: number; returnsAndPayments: number; balance: number },
  aging: Array<{ label: string; amount: number }>
): string {
  const rows = entries
    .map(
      (entry) => `
    <tr>
      <td style="padding: 6px 4px; border-bottom: 1px solid #eee;">${formatDateTime(entry.createdAt)}</td>
      <td style="padding: 6px 4px; border-bottom: 1px solid #eee; text-transform: uppercase;">${entry.type}</td>
      <td style="padding: 6px 4px; border-bottom: 1px solid #eee;">${entry.reference ?? '-'}</td>
      <td style="padding: 6px 4px; border-bottom: 1px solid #eee;">${entry.paymentMethod ? entry.paymentMethod.replace('-', ' ') : '-'}</td>
      <td style="padding: 6px 4px; border-bottom: 1px solid #eee; text-align: right;">${entry.quantity ?? '-'}</td>
      <td style="padding: 6px 4px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(entry.amount, settings.currencySymbol)}</td>
      <td style="padding: 6px 4px; border-bottom: 1px solid #eee;">${Array.isArray(entry.billItems) && entry.billItems.length > 0 ? entry.billItems.map((item: any) => `${item.quantity}x ${item.name}`).join(', ') : '-'}</td>
      <td style="padding: 6px 4px; border-bottom: 1px solid #eee;">${entry.notes ?? '-'}</td>
    </tr>`
    )
    .join('')

  const agingRows = aging
    .map(
      (bucket) => `
      <tr>
        <td style="padding: 4px 0;">${bucket.label}</td>
        <td style="padding: 4px 0; text-align: right;">${formatCurrency(bucket.amount, settings.currencySymbol)}</td>
      </tr>`
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Supplier Statement - ${supplier.name}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 0 auto; padding: 24px; color: #111; }
        h1, h2, h3 { margin: 0; }
        .header { margin-bottom: 20px; }
        .muted { color: #666; }
        .summary, .aging { margin: 16px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 8px 4px; border-bottom: 2px solid #111; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
        .stat { border: 1px solid #ddd; padding: 10px; border-radius: 8px; }
        .footer { margin-top: 24px; color: #666; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${settings.restaurantName}</h1>
        <div class="muted">${settings.address}</div>
        <div class="muted">${settings.phone}</div>
      </div>

      <div>
        <h2>Supplier Statement</h2>
        <div class="muted">Generated: ${formatDateTime(new Date())}</div>
      </div>

      <div style="margin-top: 12px;">
        <strong>${supplier.name}</strong><br />
        Contact: ${supplier.contact}<br />
        Phone: ${supplier.phone}<br />
        Email: ${supplier.email}
      </div>

      <div class="stats">
        <div class="stat">
          <div class="muted">Purchases + GRN</div>
          <div><strong>${formatCurrency(summary.purchases, settings.currencySymbol)}</strong></div>
        </div>
        <div class="stat">
          <div class="muted">Payments + Returns</div>
          <div><strong>${formatCurrency(summary.returnsAndPayments, settings.currencySymbol)}</strong></div>
        </div>
        <div class="stat">
          <div class="muted">Balance Due</div>
          <div><strong>${formatCurrency(summary.balance, settings.currencySymbol)}</strong></div>
        </div>
      </div>

      <div class="aging">
        <h3>Aging Summary</h3>
        <table>
          <tbody>
            ${agingRows}
          </tbody>
        </table>
      </div>

      <div>
        <h3>Ledger Entries</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Reference</th>
              <th>Method</th>
              <th style="text-align: right;">Qty</th>
              <th style="text-align: right;">Amount</th>
              <th>Items</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="8" style="padding: 12px 4px;">No ledger entries found.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="footer">${settings.receiptFooter}</div>
    </body>
    </html>
  `
}

export function printSupplierStatement(
  supplier: Supplier,
  entries: SupplierLedgerEntry[],
  settings: Settings,
  summary: { purchases: number; returnsAndPayments: number; balance: number },
  aging: Array<{ label: string; amount: number }>
): void {
  const html = generateSupplierStatementHTML(supplier, entries, settings, summary, aging)
  printDocument(html)
}
