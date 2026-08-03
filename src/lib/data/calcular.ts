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
 * Extra de largo, según la regla que definió la alumna en su estudio:
 * incluido hasta el N.° `freeUpTo`, y desde ahí `stepPrice` por cada nivel.
 * Con stepPrice = 0 (el default hasta que ella la configure) no cobra nada.
 */
export function getNailSizeExtra(
  nailNumber: number,
  freeUpTo: number,
  stepPrice: number,
): number {
  if (nailNumber <= freeUpTo) return 0
  return (nailNumber - freeUpTo) * stepPrice
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
  /** Regla de extra por largo, configurada por la alumna en su estudio. */
  nailSizeFreeUpTo: number
  nailSizeStepPrice: number
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
    nailSizeFreeUpTo,
    nailSizeStepPrice,
    kappingExtra,
    sizeChangePrice,
    tipChangePrice,
    prepPrice,
    designsTotal,
    additionalsTotal,
    jewelryTotal,
    igvRate,
  } = params

  const nailSizeExtra = getNailSizeExtra(nailNumber, nailSizeFreeUpTo, nailSizeStepPrice)

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
