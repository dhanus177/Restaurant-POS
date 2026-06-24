import type { Order, Settings } from './types'

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
  const itemsHTML = order.items
    .map(
      (item) => `
    <tr>
      <td style="text-align: left; padding: 4px 0;">
        ${item.quantity}x ${item.name}
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
        <tr>
          <td>Tax (${settings.taxRate}%)</td>
          <td style="text-align: right;">${formatCurrency(order.tax, settings.currencySymbol)}</td>
        </tr>
        <tr class="total-row">
          <td>TOTAL</td>
          <td style="text-align: right;">${formatCurrency(order.total, settings.currencySymbol)}</td>
        </tr>
      </table>
      
      <div class="divider"></div>
      
      <p>Payment: ${order.paymentMethod?.toUpperCase() || 'PENDING'}</p>
      
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
