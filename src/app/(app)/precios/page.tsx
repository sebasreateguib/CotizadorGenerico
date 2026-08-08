import { redirect } from 'next/navigation'
import { getTenant, getTenantCatalog } from '@/lib/data/catalogo.server'
import CatalogEditor from '@/components/precios/CatalogEditor'
import { Tags } from 'lucide-react'

export default async function PreciosPage() {
  const [tenant, catalog] = await Promise.all([getTenant(), getTenantCatalog()])

  // El superadmin no tiene estudio ni catálogo propio.
  if (!tenant) redirect('/admin')

  const totalItems = Object.values(catalog).reduce((sum, list) => sum + list.length, 0)

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <p style={{
          color: 'var(--vk-pink-soft)', fontSize: '12px', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '6px',
          textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '10px',
        }}>
          <Tags size={14} strokeWidth={2} />
          {tenant.name}
        </p>
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '34px', fontWeight: 700,
          color: 'var(--vk-text)',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          marginBottom: '6px',
        }}>
          Mis precios
        </h1>
        <p style={{ color: 'var(--vk-text-muted)', fontSize: '14px', maxWidth: '620px' }}>
          {totalItems === 0
            ? 'Acá cargas tu tarifario: tus sistemas, tus diseños y lo que cobras por cada uno. Es lo que va a usar el cotizador.'
            : `Tienes ${totalItems} ${totalItems === 1 ? 'servicio cargado' : 'servicios cargados'}. Cambiar un precio acá no modifica las cotizaciones ya hechas.`}
        </p>
      </div>

      <CatalogEditor catalog={catalog} />
    </div>
  )
}
