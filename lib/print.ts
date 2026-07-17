import type { Order, Settings, Supplier, SupplierLedgerEntry } from './types'

const CODE128_BARS = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100', '10001001100', '10011001000', '10011000100', '10001100100', '11001001000',
  '11001000100', '11000100100', '10110011100', '10011011100', '10011001110', '10111001100', '10011101100', '10011100110', '11001110010', '11001011100',
  '11001001110', '11011100100', '11001110100', '11101101110', '11101001100', '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
  '11011011000', '11011000110', '11000110110', '10100011000', '10001011000', '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
  '11000101000', '11000100010', '10110111000', '10110001110', '10001101110', '10111011000', '10111000110', '10001110110', '11101110110', '11010001110',
  '11000101110', '11011101000', '11011100010', '11011101110', '11101011000', '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
  '11101111010', '11001000010', '11110001010', '10100110000', '10100001100', '10010110000', '10010000110', '10000101100', '10000100110', '10110010000',
  '10110000100', '10011010000', '10011000010', '10000110100', '10000110010', '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
  '10100111100', '10010111100', '10010011110', '10111100100', '10011110100', '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
  '11011110110', '11110110110', '10101111000', '10100011110', '10001011110', '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
  '10111101110', '11101011110', '11110101110', '11010000100', '11010010000', '11010011100', '1100011101011',
]

export function generateBillCode(orderNumber: number, createdAt: string | Date): string {
  const d = new Date(createdAt)
  const y = d.getFullYear().toString().slice(-2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `BILL-${y}${m}${day}-${String(orderNumber).padStart(4, '0')}`
}

export function generateKitchenOrderCode(orderNumber: number, createdAt: string | Date): string {
  const d = new Date(createdAt)
  const y = d.getFullYear().toString().slice(-2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `KOT-${y}${m}${day}-${String(orderNumber).padStart(4, '0')}`
}

export function generateBenMarieOrderCode(orderNumber: number, createdAt: string | Date): string {
  const d = new Date(createdAt)
  const y = d.getFullYear().toString().slice(-2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `BMT-${y}${m}${day}-${String(orderNumber).padStart(4, '0')}`
}

export function normalizeBillScanInput(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function normalizeKitchenScanInput(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function matchesBillScanInput(orderNumber: number, createdAt: string | Date, scanValue: string): boolean {
  const normalized = normalizeBillScanInput(scanValue)
  if (!normalized) return false

  const billCode = generateBillCode(orderNumber, createdAt)
  const billCodeCompact = billCode.replace(/[^A-Z0-9]/g, '')
  const billDigits = billCode.replace(/\D/g, '')

  return normalized === billCodeCompact || normalized === billDigits || normalized === String(orderNumber)
}

export function matchesKitchenScanInput(orderNumber: number, createdAt: string | Date, scanValue: string): boolean {
  const normalized = normalizeKitchenScanInput(scanValue)
  if (!normalized) return false

  const kitchenCode = generateKitchenOrderCode(orderNumber, createdAt)
  const kitchenCodeCompact = kitchenCode.replace(/[^A-Z0-9]/g, '')
  const kitchenDigits = kitchenCode.replace(/\D/g, '')

  return normalized === kitchenCodeCompact || normalized === kitchenDigits || normalized === String(orderNumber)
}

export function generateBarcodeSVG(code: string): string {
  const code128Value = code.toUpperCase().replace(/\s+/g, '')
  const billMatch = code128Value.match(/^BILL-(\d{6})-(\d{4})$/)

  // Best scanner reliability path for our bill format:
  // encode only numeric token (YYMMDD + ####) in CODE128-C.
  // This produces wider modules/less dense bars on thermal receipts.
  if (billMatch) {
    const compactDigits = `${billMatch[1]}${billMatch[2]}` // 10 digits
    const startCodeC = 105
    const stopCode = 106
    const pairValues = compactDigits.match(/\d{2}/g)?.map((pair) => Number(pair)) ?? []
    const checksum = (startCodeC + pairValues.reduce((sum, value, index) => sum + value * (index + 1), 0)) % 103
    const bitPattern = [startCodeC, ...pairValues, checksum, stopCode]
      .map((value) => CODE128_BARS[value] || '')
      .join('')

    if (bitPattern.length > 0) {
      const profile = { module: 2, quietZone: 24, height: 72 }
      const width = bitPattern.length * profile.module + profile.quietZone * 2

      let x = profile.quietZone
      const rects = bitPattern
        .split('')
        .map((bit) => {
          const currentX = x
          x += profile.module
          if (bit !== '1') return ''
          return `<rect x="${currentX}" y="0" width="${profile.module}" height="${profile.height}" fill="#000" shape-rendering="crispEdges" />`
        })
        .join('')

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${profile.height}" viewBox="0 0 ${width} ${profile.height}" role="img" aria-label="barcode" shape-rendering="crispEdges" style="display:block;margin:0 auto;max-width:100%;height:${profile.height}px;background:#fff;">${rects}</svg>`
    }
  }

  // Prefer CODE128-B: better scanner compatibility on POS imagers (including DS9308)
  // and narrower output for receipt paper than CODE39.
  if (/^[\x20-\x7E]+$/.test(code128Value)) {
    const startCodeB = 104
    const stopCode = 106
    const dataValues = code128Value.split('').map((char) => char.charCodeAt(0) - 32)
    const checksum = (startCodeB + dataValues.reduce((sum, value, index) => sum + value * (index + 1), 0)) % 103
    const bitPattern = [startCodeB, ...dataValues, checksum, stopCode]
      .map((value) => CODE128_BARS[value] || '')
      .join('')

    if (bitPattern.length > 0) {
      const robust = { module: 2, quietZone: 20, height: 64 }
      const compact = { module: 1, quietZone: 12, height: 60 }
      const robustWidth = bitPattern.length * robust.module + robust.quietZone * 2
      const profile = robustWidth > 250 ? compact : robust
      const width = bitPattern.length * profile.module + profile.quietZone * 2

      let x = profile.quietZone
      const rects = bitPattern
        .split('')
        .map((bit) => {
          const currentX = x
          x += profile.module
          if (bit !== '1') return ''
          return `<rect x="${currentX}" y="0" width="${profile.module}" height="${profile.height}" fill="#111" shape-rendering="crispEdges" />`
        })
        .join('')

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${profile.height}" viewBox="0 0 ${width} ${profile.height}" role="img" aria-label="barcode" shape-rendering="crispEdges" style="display:block;margin:0 auto;max-width:100%;height:${profile.height}px;">${rects}</svg>`
    }
  }

  // Code39 patterns: 9 elements (bar/space alternating), n=narrow, w=wide
  // Includes start/stop '*' and supports uppercase letters, digits, and selected symbols.
  const CODE39_PATTERNS: Record<string, string> = {
    '0': 'nnnwwnwnn',
    '1': 'wnnwnnnnw',
    '2': 'nnwwnnnnw',
    '3': 'wnwwnnnnn',
    '4': 'nnnwwnnnw',
    '5': 'wnnwwnnnn',
    '6': 'nnwwwnnnn',
    '7': 'nnnwnnwnw',
    '8': 'wnnwnnwnn',
    '9': 'nnwwnnwnn',
    A: 'wnnnnwnnw',
    B: 'nnwnnwnnw',
    C: 'wnwnnwnnn',
    D: 'nnnnwwnnw',
    E: 'wnnnwwnnn',
    F: 'nnwnwwnnn',
    G: 'nnnnnwwnw',
    H: 'wnnnnwwnn',
    I: 'nnwnnwwnn',
    J: 'nnnnwwwnn',
    K: 'wnnnnnnww',
    L: 'nnwnnnnww',
    M: 'wnwnnnnwn',
    N: 'nnnnwnnww',
    O: 'wnnnwnnwn',
    P: 'nnwnwnnwn',
    Q: 'nnnnnnwww',
    R: 'wnnnnnwwn',
    S: 'nnwnnnwwn',
    T: 'nnnnwnwwn',
    U: 'wwnnnnnnw',
    V: 'nwwnnnnnw',
    W: 'wwwnnnnnn',
    X: 'nwnnwnnnw',
    Y: 'wwnnwnnnn',
    Z: 'nwwnwnnnn',
    '-': 'nwnnnnwnw',
    '.': 'wwnnnnwnn',
    ' ': 'nwwnnnwnn',
    '$': 'nwnwnwnnn',
    '/': 'nwnwnnnwn',
    '+': 'nwnnnwnwn',
    '%': 'nnnwnwnwn',
    '*': 'nwnnwnwnn',
  }

  // Code39 must fit the printable receipt width without browser downscaling.
  // If browser shrinks a very wide barcode, bars become too thin for DS9308.
  // Start with a robust profile, then fall back to a compact profile when needed.
  const robust = { narrow: 2, wide: 5, quietZone: 16, height: 64 }
  const compact = { narrow: 1, wide: 2, quietZone: 8, height: 56 }

  const normalized = code
    .toUpperCase()
    .split('')
    .map((char) => (CODE39_PATTERNS[char] ? char : '-'))
    .join('')

  const encoded = `*${normalized}*`

  const buildModules = (narrow: number, wide: number) => {
    const modules: Array<{ isBar: boolean; width: number }> = []
    const interCharGap = narrow

    for (let i = 0; i < encoded.length; i += 1) {
      const char = encoded[i]
      const pattern = CODE39_PATTERNS[char]
      if (!pattern) continue

      for (let j = 0; j < pattern.length; j += 1) {
        const token = pattern[j]
        const width = token === 'w' ? wide : narrow
        const isBar = j % 2 === 0
        modules.push({ isBar, width })
      }

      if (i < encoded.length - 1) {
        modules.push({ isBar: false, width: interCharGap })
      }
    }

    return modules
  }

  const robustModules = buildModules(robust.narrow, robust.wide)
  const robustBarcodeWidth = robustModules.reduce((sum, mod) => sum + mod.width, 0)
  const robustWidth = robustBarcodeWidth + robust.quietZone * 2

  // Around 250 CSS px stays within typical 58/72mm receipt print areas,
  // avoiding print-engine downscaling that hurts scanner readability.
  const useCompactProfile = robustWidth > 250
  const profile = useCompactProfile ? compact : robust
  const modules = useCompactProfile ? buildModules(compact.narrow, compact.wide) : robustModules
  const barcodeWidth = modules.reduce((sum, mod) => sum + mod.width, 0)
  const width = barcodeWidth + profile.quietZone * 2

  let x = profile.quietZone
  const rects = modules
    .filter((mod) => mod.isBar)
    .map((mod) => {
      const rect = `<rect x="${x}" y="0" width="${mod.width}" height="${profile.height}" fill="#111" />`
      x += mod.width
      return rect
    })
    .join('')

  // Advance x for spaces too
  x = profile.quietZone
  const correctedRects = modules
    .map((mod) => {
      const currentX = x
      x += mod.width
      if (!mod.isBar) return ''
      return `<rect x="${currentX}" y="0" width="${mod.width}" height="${profile.height}" fill="#111" shape-rendering="crispEdges" />`
    })
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${profile.height}" viewBox="0 0 ${width} ${profile.height}" role="img" aria-label="barcode" shape-rendering="crispEdges" style="display:block;margin:0 auto;max-width:100%;height:${profile.height}px;">${correctedRects || rects}</svg>`
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
        @page { size: auto; margin: 0; }
        html, body { height: auto; }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: auto;
          max-width: 72mm;
          margin: 0 auto;
          padding: 6mm 4mm;
          box-sizing: border-box;
        }
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
  const kitchenCode = generateKitchenOrderCode(order.orderNumber, order.createdAt)
  const isTakeaway = !order.tableId
  const orderKindLabel = isTakeaway ? 'TAKEAWAY ORDER' : 'TABLE ORDER'
  const stationLabel = isTakeaway ? 'TAKEAWAY KITCHEN' : 'TABLE KITCHEN'
  const prepCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const itemsHTML = order.items
    .map(
      (item) => `
    <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #ccc;">
      <div style="font-size: 20px; font-weight: bold;">
        ${item.quantity}x ${item.name}
        <div style="display: inline-block; font-size: 11px; margin-top: 4px; padding: 2px 6px; border: 1px solid #111; border-radius: 4px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #111; background: #f5f5f5;">
          [${(item.prepStation ?? 'kitchen').toUpperCase().replace('-', ' ')}]
        </div>
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
        @page { size: auto; margin: 0; }
        html, body { height: auto; }
        body {
          font-family: 'Arial', sans-serif;
          width: auto;
          max-width: 72mm;
          margin: 0 auto;
          padding: 6mm 4mm;
          box-sizing: border-box;
        }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; }
        .order-number { font-size: 48px; font-weight: bold; }
        .order-kind { font-size: 16px; font-weight: 700; letter-spacing: 0.12em; margin-top: 6px; }
        .table-info { font-size: 24px; margin-top: 10px; }
        .station { font-size: 15px; margin-top: 4px; font-weight: 700; }
        .prep-count { font-size: 14px; margin-top: 6px; font-weight: 700; letter-spacing: 0.04em; }
        .time { font-size: 16px; color: #666; margin-top: 5px; }
        .priority { background: #f00; color: #fff; padding: 5px 10px; font-weight: bold; display: inline-block; margin-top: 10px; }
        .items { margin-top: 20px; }
        .confirm { margin-top: 16px; border-top: 1px dashed #999; padding-top: 10px; text-align: center; }
        .confirm .label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #444; }
        .confirm .code { font-size: 14px; font-weight: 700; margin-top: 4px; }
        .confirm .tip { font-size: 11px; color: #555; margin-top: 6px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="order-number">#${order.orderNumber}</div>
        <div class="order-kind">${orderKindLabel}</div>
        ${order.tableName ? `<div class="table-info">${order.tableName}</div>` : '<div class="table-info">TAKEAWAY PARCEL</div>'}
        <div class="station">${stationLabel}</div>
        <div class="prep-count">Prep Count: ${prepCount}</div>
        <div class="time">${formatTime(order.createdAt)}</div>
        ${order.isPriority ? '<div class="priority">RUSH ORDER</div>' : ''}
      </div>
      
      <div class="items">
        ${itemsHTML}
      </div>

      <div class="confirm">
        <div class="label">Kitchen Confirmation</div>
        <div class="code">${kitchenCode}</div>
        <div class="tip">Use KOT code or Order # for kitchen confirmation.</div>
      </div>
    </body>
    </html>
  `
}

export function generateTakeawayDocketHTML(order: Order, settings: Settings): string {
  const billCode = generateBillCode(order.orderNumber, order.createdAt)
  const prepCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const itemsHTML = order.items
    .map(
      (item) => `
    <div style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px dashed #ccc;">
      <div style="font-size: 18px; font-weight: 700;">${item.quantity}x ${item.name}</div>
      <div style="display: inline-block; font-size: 11px; margin-top: 4px; padding: 2px 6px; border: 1px solid #111; border-radius: 4px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #111; background: #f5f5f5;">
        [${(item.prepStation ?? 'kitchen').toUpperCase().replace('-', ' ')}]
      </div>
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
        @page { size: auto; margin: 0; }
        html, body { height: auto; }
        body {
          font-family: 'Arial', sans-serif;
          width: auto;
          max-width: 72mm;
          margin: 0 auto;
          padding: 6mm 4mm;
          box-sizing: border-box;
        }
        .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .restaurant { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
        .order { font-size: 34px; font-weight: 800; line-height: 1.1; }
        .parcel { font-size: 16px; font-weight: 800; letter-spacing: 0.12em; margin-top: 4px; }
        .meta { font-size: 13px; color: #444; margin-top: 4px; }
        .bill { font-size: 13px; font-weight: 700; margin-top: 4px; }
        .prep-count { font-size: 13px; font-weight: 800; margin-top: 4px; }
        .section-title { margin-top: 10px; margin-bottom: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.04em; text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="restaurant">${settings.restaurantName}</div>
        <div class="order">#${order.orderNumber}</div>
        <div class="parcel">TAKEAWAY PARCEL</div>
        <div class="meta">TAKEAWAY · ${formatDateTime(order.createdAt)}</div>
        <div class="bill">Bill No: ${billCode}</div>
        <div class="prep-count">Prep Count: ${prepCount}</div>
        <div class="bill">Order Details</div>
      </div>

      <div class="section-title">Order Details</div>
      ${itemsHTML}
    </body>
    </html>
  `
}

export function generateBenMarieDocketHTML(order: Order, settings: Settings): string {
  const benMarieCode = generateBenMarieOrderCode(order.orderNumber, order.createdAt)
  const isTakeaway = !order.tableId
  const orderKindLabel = isTakeaway ? 'TAKEAWAY ORDER' : 'TABLE ORDER'
  const prepCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const itemsHTML = order.items
    .map(
      (item) => `
    <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #ccc;">
      <div style="font-size: 20px; font-weight: bold;">
        ${item.quantity}x ${item.name}
        <div style="display: inline-block; font-size: 11px; margin-top: 4px; padding: 2px 6px; border: 1px solid #111; border-radius: 4px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #111; background: #f5f5f5;">
          [${(item.prepStation ?? 'ben-marie').toUpperCase().replace('-', ' ')}]
        </div>
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
      <title>Ben-Marie Docket #${order.orderNumber}</title>
      <style>
        @page { size: auto; margin: 0; }
        html, body { height: auto; }
        body {
          font-family: 'Arial', sans-serif;
          width: auto;
          max-width: 72mm;
          margin: 0 auto;
          padding: 6mm 4mm;
          box-sizing: border-box;
        }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; }
        .order-number { font-size: 48px; font-weight: bold; }
        .order-kind { font-size: 16px; font-weight: 700; letter-spacing: 0.12em; margin-top: 6px; }
        .table-info { font-size: 24px; margin-top: 10px; }
        .station { font-size: 15px; margin-top: 4px; font-weight: 700; }
        .prep-count { font-size: 14px; margin-top: 6px; font-weight: 700; letter-spacing: 0.04em; }
        .time { font-size: 16px; color: #666; margin-top: 5px; }
        .priority { background: #f00; color: #fff; padding: 5px 10px; font-weight: bold; display: inline-block; margin-top: 10px; }
        .items { margin-top: 20px; }
        .confirm { margin-top: 16px; border-top: 1px dashed #999; padding-top: 10px; text-align: center; }
        .confirm .label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #444; }
        .confirm .code { font-size: 14px; font-weight: 700; margin-top: 4px; }
        .confirm .tip { font-size: 11px; color: #555; margin-top: 6px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="order-number">#${order.orderNumber}</div>
        <div class="order-kind">${orderKindLabel}</div>
        ${order.tableName ? `<div class="table-info">${order.tableName}</div>` : '<div class="table-info">TAKEAWAY PARCEL</div>'}
        <div class="station">BEN-MARIE STATION</div>
        <div class="prep-count">Prep Count: ${prepCount}</div>
        <div class="time">${formatTime(order.createdAt)}</div>
        ${order.isPriority ? '<div class="priority">RUSH ORDER</div>' : ''}
      </div>

      <div class="items">
        ${itemsHTML}
      </div>

      <div class="confirm">
        <div class="label">Ben-Marie Confirmation</div>
        <div class="code">${benMarieCode}</div>
        <div class="tip">Use BMT code or Order # for station confirmation.</div>
      </div>
    </body>
    </html>
  `
}

export function printDocument(
  html: string,
  printerName?: string | null,
  options?: { forceDesktopOnly?: boolean }
): void {
  const browserPrint = () => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.opacity = '0'
    iframe.style.pointerEvents = 'none'
    iframe.style.zIndex = '-1'

    const cleanup = () => {
      try {
        iframe.remove()
      } catch {
        // Ignore cleanup failures
      }
    }

    iframe.onload = () => {
      const doc = iframe.contentDocument
      const win = iframe.contentWindow
      if (!doc || !win) {
        cleanup()
        return
      }

      try {
        const printerStyle = printerName
          ? `<style>@media print { @page { size: auto; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } html, body { margin: 0; padding: 0; } }</style><script>document.title = ${JSON.stringify(printerName)}</script>`
          : `<style>@media print { @page { size: auto; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } html, body { margin: 0; padding: 0; } }</style>`

        doc.open()
        doc.write(html.replace('</head>', `${printerStyle}</head>`))
        doc.close()

        const finish = () => cleanup()
        win.addEventListener('afterprint', finish, { once: true })
        setTimeout(() => {
          try {
            win.focus()
            win.print()
          } catch {
            finish()
          }
        }, 100)
      } catch {
        cleanup()
      }
    }

    document.body.appendChild(iframe)
    iframe.src = 'about:blank'
  }

  if (typeof window !== 'undefined' && window.desktopApp?.printHtml) {
    void window.desktopApp
      .printHtml({
        html,
        printerName: printerName ?? null,
        autoCut: Boolean(printerName),
      })
      .then((result) => {
        if (!result.ok) {
          console.error('[desktop print error]', result.error ?? 'Print failed')
          return
        }

        if (result.warning) {
          console.warn('[desktop print warning]', result.warning)
        }
      })
      .catch((error) => {
        console.error('[desktop print error] desktop bridge failed', error)
      })
    return
  }

  if (options?.forceDesktopOnly) {
    console.warn('[desktop print warning] Desktop printing requested, but desktop bridge is unavailable. Falling back to browser print dialog.')
  }

  browserPrint()
}

export function printReceipt(order: Order, settings: Settings): void {
  const html = generateReceiptHTML(order, settings)
  printDocument(html, settings.billerPrinterName, { forceDesktopOnly: settings.forceDesktopPrintOnly !== false })
}

export function printKitchenDocket(order: Order, settings: Settings): void {
  if (order.items.length === 0) {
    return
  }

  const html = generateKitchenDocketHTML(
    {
      ...order,
      items: order.items,
    },
    settings
  )
  printDocument(html, settings.billerPrinterName, { forceDesktopOnly: settings.forceDesktopPrintOnly !== false })
}

export function printTakeawayDocket(order: Order, settings: Settings): void {
  const html = generateTakeawayDocketHTML(order, settings)
  printDocument(html, settings.takeawayPrinterName, { forceDesktopOnly: settings.forceDesktopPrintOnly !== false })
}

export function printBenMarieDocket(order: Order, settings: Settings): void {
  const benMarieItems = order.items.filter((item) => item.prepStation === 'ben-marie')

  if (benMarieItems.length === 0) {
    return
  }

  const html = generateBenMarieDocketHTML(
    {
      ...order,
      items: benMarieItems,
    },
    settings
  )

  // Uses cash counter printer route as requested workflow for dockets.
  printDocument(html, settings.billerPrinterName, { forceDesktopOnly: settings.forceDesktopPrintOnly !== false })
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
  printDocument(html, settings.supplierStatementPrinterName, { forceDesktopOnly: settings.forceDesktopPrintOnly !== false })
}
