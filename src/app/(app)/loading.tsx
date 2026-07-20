export default function Loading() {
  return (
    <div className="fade-in" aria-busy="true" aria-label="Cargando">
      {/* Encabezado */}
      <div style={{ marginBottom: '28px' }}>
        <div className="skeleton" style={{ width: '120px', height: '14px', marginBottom: '12px' }} />
        <div className="skeleton" style={{ width: '260px', height: '34px' }} />
      </div>

      {/* Tarjetas de stats */}
      <div className="responsive-grid-4" style={{ marginBottom: '20px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card" style={{ padding: '18px' }}>
            <div className="skeleton" style={{ width: '34px', height: '34px', borderRadius: '10px', marginBottom: '14px' }} />
            <div className="skeleton" style={{ width: '70%', height: '22px', marginBottom: '8px' }} />
            <div className="skeleton" style={{ width: '50%', height: '13px' }} />
          </div>
        ))}
      </div>

      {/* Barra de filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <div className="skeleton" style={{ flex: 1, minWidth: '220px', height: '42px', borderRadius: '10px' }} />
        <div className="skeleton" style={{ width: '220px', height: '42px', borderRadius: '10px' }} />
      </div>

      {/* Tabla */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--vk-border)', background: 'rgba(0,0,0,0.25)' }}>
          <div className="skeleton" style={{ width: '160px', height: '12px' }} />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid var(--vk-border)' }}>
            <div className="skeleton" style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0 }} />
            <div className="skeleton" style={{ flex: 1, height: '14px' }} />
            <div className="skeleton" style={{ width: '90px', height: '14px' }} />
            <div className="skeleton" style={{ width: '70px', height: '20px', borderRadius: '999px' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
