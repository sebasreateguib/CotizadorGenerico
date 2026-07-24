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
 * Extra de largo según tarifario:
 * incluido hasta N.° 3; desde N.° 4 se suman S/5 por cada nivel.
 */
export function getNailSizeExtra(nailNumber: number): number {
  if (nailNumber <= 3) return 0
  return (nailNumber - 3) * 5
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
