export interface QuoteCalculation {
  systemPrice: number
  retoquePrice: number
  retoqueExtra: number
  nailSizeExtra: number
  sizeChangePrice: number
  tipChangePrice: number
  prepPrice: number
  kappingExtra: number
  designsTotal: number
  additionalsTotal: number
  jewelryTotal: number
  subtotal: number
  igvRate: number
  igvAmount: number
  totalWithIgv: number
}

export interface QuoteItem {
  label: string
  amount: number
  nails?: number
  qty?: number
}

/**
 * Get the extra charge based on nail size number
 * Cobro adicional a partir de uña número 5 en cada sistema
 */
export function getNailSizeExtra(nailNumber: number): number {
  if (nailNumber <= 4) return 0
  const extraMap: Record<number, number> = { 5: 5, 6: 10, 7: 15, 8: 20, 9: 25, 10: 30, 11: 35 }
  return extraMap[nailNumber] ?? 35
}

/**
 * Get IGV amount
 */
export function calcIGV(subtotal: number, igvRate: number): number {
  return Math.round(subtotal * igvRate * 100) / 100
}

/**
 * Full quote calculation
 */
export function calculateQuote(params: {
  systemPrice: number
  retoquePrice: number
  retoqueExtra: number
  nailNumber: number
  kappingExtra: number
  sizeChangePrice: number
  tipChangePrice: number
  prepPrice: number
  designsTotal: number
  additionalsTotal: number
  jewelryTotal: number
  igvRate: number
}): QuoteCalculation {
  const {
    systemPrice,
    retoquePrice,
    retoqueExtra,
    nailNumber,
    kappingExtra,
    sizeChangePrice,
    tipChangePrice,
    prepPrice,
    designsTotal,
    additionalsTotal,
    jewelryTotal,
    igvRate,
  } = params

  const nailSizeExtra = getNailSizeExtra(nailNumber)

  const subtotal =
    systemPrice +
    retoquePrice +
    retoqueExtra +
    nailSizeExtra +
    kappingExtra +
    sizeChangePrice +
    tipChangePrice +
    prepPrice +
    designsTotal +
    additionalsTotal +
    jewelryTotal

  const igvAmount = calcIGV(subtotal, igvRate)
  const totalWithIgv = Math.round((subtotal + igvAmount) * 100) / 100

  return {
    systemPrice,
    retoquePrice,
    retoqueExtra,
    nailSizeExtra,
    sizeChangePrice,
    tipChangePrice,
    prepPrice,
    kappingExtra,
    designsTotal,
    additionalsTotal,
    jewelryTotal,
    subtotal,
    igvRate,
    igvAmount,
    totalWithIgv,
  }
}

/**
 * Format currency as Soles
 */
export function formatSoles(amount: number): string {
  return `S/ ${amount.toFixed(2)}`
}
