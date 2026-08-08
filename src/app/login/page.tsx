'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { AlertCircle, ArrowRight, Loader2, Check } from 'lucide-react'

/** Lo que la alumna se lleva: dicho en su idioma, no en el de la escuela. */
const BENEFITS = [
  'Tu tarifario, con tus precios',
  'Tus clientas y su historial',
  'Cotizaciones en PDF para enviar',
]

/** Cotización de muestra del panel derecho: enseña el producto trabajando. */
const SAMPLE_LINES = [
  { label: 'Gel X (S–M)', amount: 'S/ 150.00' },
  { label: 'Cat eye · 5 uñas', amount: 'S/ 12.50' },
  { label: 'Pedrería · 8 pzas', amount: 'S/ 8.00' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'stretch',
      background: 'var(--vk-black)',
      position: 'relative',
    }}>
      {/* Panel izquierdo — formulario.
          Va primero en el DOM además de a la izquierda: es la acción
          principal, así que también debe ser lo primero al tabular. */}
      <div className="login-right-panel" style={{
        flex: '1 1 45%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px',
        background: 'var(--vk-black)',
        position: 'relative',
        zIndex: 10,
      }}>
        <div className="banner-logo-wrapper" style={{ position: 'absolute', top: '110px', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Image
            src="/bannercolor.png"
            alt="Vk Studio Academy"
            width={1860}
            height={414}
            style={{ width: '240px', height: 'auto' }}
            priority
          />
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '13px', fontWeight: 600,
            letterSpacing: '0.42em',
            textTransform: 'uppercase',
            color: 'var(--vk-pink-soft)',
            marginRight: '-0.42em',
            marginTop: '15px',
          }}>
            Academy
          </span>
        </div>
        <div className="fade-in login-form-wrapper" style={{ width: '100%', maxWidth: '380px', position: 'relative', zIndex: 11 }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '26px', fontWeight: 700,
            color: 'var(--vk-text)', marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}>
            Entra a tu cotizador
          </h2>
          <p style={{ color: 'var(--vk-text-muted)', fontSize: '14px', marginBottom: '32px' }}>
            Con el correo que registraste en el curso.
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label htmlFor="email" style={{
                display: 'block', fontSize: '12px', fontWeight: 600,
                color: 'var(--vk-text-muted)', marginBottom: '7px',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                required
                className="vk-input"
              />
            </div>

            <div>
              <label htmlFor="password" style={{
                display: 'block', fontSize: '12px', fontWeight: 600,
                color: 'var(--vk-text-muted)', marginBottom: '7px',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="vk-input"
              />
            </div>

            {error && (
              <div style={{
                padding: '12px 14px',
                background: 'rgba(240, 68, 106, 0.1)',
                border: '1px solid rgba(240, 68, 106, 0.3)',
                borderRadius: '12px',
                color: 'var(--vk-error)',
                fontSize: '13px',
                display: 'flex', alignItems: 'center', gap: '9px',
              }}
                role="alert"
              >
                <AlertCircle size={16} strokeWidth={2} />
                {error}
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                width: '100%', justifyContent: 'center',
                marginTop: '10px', padding: '14px',
                fontSize: '15px',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={17} strokeWidth={2.2} style={{ animation: 'spin 0.8s linear infinite' }} />
                  Ingresando...
                </>
              ) : (
                <>
                  Ingresar
                  <ArrowRight size={17} strokeWidth={2.2} />
                </>
              )}
            </button>
          </form>

          <p style={{
            textAlign: 'center', marginTop: '32px',
            fontSize: '12px', color: 'var(--vk-text-subtle)',
            lineHeight: 1.6,
          }}>
            ¿No puedes entrar? Escríbele a tu instructora.
          </p>
        </div>
      </div>

      {/* Panel derecho — qué es esto y para qué le sirve a ella.
          Los adornos van anclados al borde derecho (el exterior): pegados
          al divisor se cortarían contra el borde del formulario. */}
      <div style={{
        flex: '1 1 55%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '56px 64px',
        position: 'relative',
        overflow: 'hidden',
        background: `
          radial-gradient(ellipse 800px 600px at 80% 110%, rgba(243,50,131,0.22) 0%, transparent 60%),
          radial-gradient(ellipse 600px 400px at 10% -10%, rgba(255,127,181,0.10) 0%, transparent 55%),
          var(--vk-dark)
        `,
        borderLeft: '1px solid var(--vk-border)',
      }}
        className="login-left"
      >
        {/* Anillos decorativos */}
        <div style={{
          position: 'absolute', bottom: '-180px', right: '-120px',
          width: '520px', height: '520px', borderRadius: '50%',
          border: '1px solid rgba(243,50,131,0.25)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-140px', right: '-80px',
          width: '440px', height: '440px', borderRadius: '50%',
          border: '1px solid rgba(243,50,131,0.15)',
          pointerEvents: 'none',
        }} />

        {/* Marca de agua tipográfica */}
        <div style={{
          position: 'absolute',
          top: '4%',
          left: '-2%',
          fontSize: 'clamp(120px, 15vw, 220px)',
          fontFamily: 'var(--font-heading)',
          fontWeight: 900,
          color: 'transparent',
          WebkitTextStroke: '1px rgba(243,50,131,0.06)',
          lineHeight: 0.85,
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          zIndex: 0,
        }}>
          TU<br />
          <span style={{ marginLeft: '12%' }}>PRECIO</span>
        </div>

        {/* Halo difuso */}
        <div style={{
          position: 'absolute',
          top: '15%',
          right: '10%',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(243,50,131,0.12) 0%, transparent 60%)',
          filter: 'blur(50px)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        {/* Cotización de muestra flotante */}
        <div className="login-sample-quote" style={{
          position: 'absolute',
          top: '16%',
          right: '9%',
          width: '278px',
          padding: '18px 20px',
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          zIndex: 1,
          boxShadow: '0 24px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          transform: 'rotate(4deg)',
          animation: 'float 6s ease-in-out infinite',
        }}>
          <div style={{
            fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'var(--vk-pink-soft)', marginBottom: '14px',
          }}>
            Cotización
          </div>
          {SAMPLE_LINES.map(line => (
            <div key={line.label} style={{
              display: 'flex', justifyContent: 'space-between', gap: '12px',
              fontSize: '12.5px', color: 'var(--vk-text-muted)', marginBottom: '9px',
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.label}</span>
              <span style={{ color: 'var(--vk-text)', fontVariantNumeric: 'tabular-nums' }}>{line.amount}</span>
            </div>
          ))}
          <div style={{
            height: '1px', background: 'rgba(255,255,255,0.08)', margin: '12px 0 11px',
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--vk-text-muted)' }}>Total</span>
            <span style={{
              fontFamily: 'var(--font-heading)', fontSize: '19px', fontWeight: 700,
              color: 'var(--vk-white)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
            }}>
              S/ 170.50
            </span>
          </div>
        </div>

        <div className="stagger" style={{ position: 'relative', zIndex: 10 }}>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(38px, 4.5vw, 60px)',
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: 'var(--vk-text)',
            marginBottom: '20px',
          }}>
            Cobra lo que<br />
            <span className="pink-text">vale</span> tu trabajo.
          </h1>
          <p style={{ color: 'var(--vk-text-muted)', fontSize: '16px', maxWidth: '430px', lineHeight: 1.6 }}>
            Arma tu tarifario una vez y cotiza en minutos. Cada alumna
            trabaja con sus propios precios, sus diseños y sus clientas.
          </p>
          <ul style={{
            listStyle: 'none', padding: 0, margin: '30px 0 0',
            display: 'flex', flexDirection: 'column', gap: '11px',
          }}>
            {BENEFITS.map(text => (
              <li key={text} style={{
                display: 'flex', alignItems: 'center', gap: '11px',
                fontSize: '14px', color: 'var(--vk-text-muted)',
              }}>
                <span style={{
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  background: 'var(--vk-pink-muted)',
                  border: '1px solid rgba(243,50,131,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={11} strokeWidth={2.6} color="var(--vk-pink-soft)" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(4deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(4deg); }
        }
        @media (max-width: 1180px) {
          .login-sample-quote { display: none; }
        }
        @media (max-width: 860px) {
          .login-left {
            position: absolute !important;
            inset: 0;
            z-index: 0;
            opacity: 0.8;
            pointer-events: none;
            padding: 24px !important;
            border-left: none !important;
          }
          .login-left h1, .login-left p, .login-left ul {
            display: none !important;
          }
          .login-right-panel {
            flex: 1 1 100% !important;
            background: transparent !important;
            padding: 24px !important;
          }
          .login-form-wrapper {
            background: rgba(13,13,16,0.7);
            backdrop-filter: blur(28px);
            -webkit-backdrop-filter: blur(28px);
            padding: 44px 28px;
            border-radius: 36px;
            border: 1px solid rgba(255,255,255,0.06);
            box-shadow: 0 40px 80px rgba(0,0,0,0.6);
            margin-top: 140px;
          }
          .banner-logo-wrapper {
            top: 60px !important;
          }
        }
      `}</style>
    </div>
  )
}
