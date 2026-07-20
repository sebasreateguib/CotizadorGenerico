interface VkLogoProps {
  size?: number
}

/** Marca tipográfica "Vk" sobre bloque rosa — según BrandBook (flat version) */
export default function VkLogo({ size = 40 }: VkLogoProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: 'linear-gradient(140deg, var(--vk-pink) 0%, var(--vk-pink-dark) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 1px 0 rgba(255,255,255,0.25) inset, 0 6px 18px rgba(243,50,131,0.35)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: size * 0.42,
          color: 'var(--vk-white)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        Vk
      </span>
    </div>
  )
}
