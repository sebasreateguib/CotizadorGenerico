import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTenant, getTenantCatalog } from '@/lib/data/catalogo.server'
import { catalogIsEmpty } from '@/lib/data/catalogo'
import QuoteForm from '@/components/cotizacion/QuoteForm'
import { Tags, ArrowRight } from 'lucide-react'

export default async function NuevaCotizacionPage() {
  const [tenant, catalog] = await Promise.all([getTenant(), getTenantCatalog()])

  // El superadmin no tiene estudio, así que tampoco cotiza.
  if (!tenant) redirect('/admin')

  // Sin tarifario no hay nada que cobrar: el formulario saldría con todos los
  // desplegables vacíos. Mejor mandarla a cargar sus precios primero.
  if (catalogIsEmpty(catalog)) {
    return (
      <div className="glass-card" style={{ padding: '48px 32px', textAlign: 'center', maxWidth: '560px', margin: '48px auto' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px', margin: '0 auto 18px',
          background: 'var(--vk-surface-2)', border: '1px solid var(--vk-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Tags size={22} strokeWidth={1.7} color="var(--vk-pink)" />
        </div>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 700,
          color: 'var(--vk-text)', letterSpacing: '-0.02em', marginBottom: '10px',
        }}>
          Primero carga tus precios
        </h1>
        <p style={{ color: 'var(--vk-text-muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
          Este cotizador trabaja con <strong style={{ color: 'var(--vk-text)' }}>tu</strong> tarifario:
          tus sistemas, tus diseños y tus precios. Todavía no has cargado ninguno,
          así que no hay nada que cotizar.
        </p>
        <Link href="/precios" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
          Cargar mis precios
          <ArrowRight size={16} strokeWidth={2} />
        </Link>
      </div>
    )
  }

  return <QuoteForm catalog={catalog} tenant={tenant} />
}
