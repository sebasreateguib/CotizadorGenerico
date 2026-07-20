'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react'

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
      {/* Panel izquierdo — statement de marca */}
      <div style={{
        flex: '1 1 55%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '56px 64px',
        position: 'relative',
        overflow: 'hidden',
        background: `
          radial-gradient(ellipse 800px 600px at 20% 110%, rgba(243,50,131,0.22) 0%, transparent 60%),
          radial-gradient(ellipse 600px 400px at 90% -10%, rgba(255,127,181,0.10) 0%, transparent 55%),
          var(--vk-dark)
        `,
        borderRight: '1px solid var(--vk-border)',
      }}
        className="login-left"
      >
        {/* Anillos decorativos */}
        <div style={{
          position: 'absolute', bottom: '-180px', left: '-120px',
          width: '520px', height: '520px', borderRadius: '50%',
          border: '1px solid rgba(243,50,131,0.25)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-140px', left: '-80px',
          width: '440px', height: '440px', borderRadius: '50%',
          border: '1px solid rgba(243,50,131,0.15)',
          pointerEvents: 'none',
        }} />

        {/* Massive watermark typography */}
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
          NAIL<br />
          <span style={{ marginLeft: '12%' }}>ART</span>
        </div>

        {/* Abstract glowing orb top right */}
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

        {/* Floating glassmorphism card */}
        <div style={{
          position: 'absolute',
          top: '25%',
          right: '15%',
          padding: '16px 24px',
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          zIndex: 1,
          boxShadow: '0 24px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          transform: 'rotate(6deg)',
          animation: 'float 6s ease-in-out infinite',
        }}>
          <div style={{ display: 'flex' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', background: 'linear-gradient(135deg, var(--vk-pink-soft), var(--vk-pink))', zIndex: 3, boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }} />
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', background: 'linear-gradient(135deg, #1A1A24, #2A2A38)', marginLeft: '-14px', zIndex: 2, boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }} />
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', background: 'linear-gradient(135deg, rgba(243,50,131,0.2), rgba(243,50,131,0.05))', marginLeft: '-14px', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--vk-white)', fontWeight: 700, fontFamily: 'var(--font-heading)', backdropFilter: 'blur(4px)', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>+20</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>Diseños</div>
            <div style={{ fontSize: '18px', color: 'var(--vk-white)', fontWeight: 700, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>Exclusivos</div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 10 }}>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(38px, 4.5vw, 60px)',
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: 'var(--vk-text)',
            marginBottom: '20px',
          }}>
            El nail art,<br />
            elevado a <span className="pink-text">arte</span>.
          </h1>
          <p style={{ color: 'var(--vk-text-muted)', fontSize: '16px', maxWidth: '420px', lineHeight: 1.6 }}>
            Sistema interno de cotizaciones. Cada diseño, cada técnica y cada
            experiencia concebida como una obra única.
          </p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
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
        <div className="banner-logo-wrapper" style={{ position: 'absolute', top: '110px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <Image
            src="/bannercolor.png"
            alt="Vk Studio"
            width={1860}
            height={414}
            style={{ width: '240px', height: 'auto' }}
            priority
          />
        </div>
        <div className="fade-in login-form-wrapper" style={{ width: '100%', maxWidth: '380px', position: 'relative', zIndex: 11 }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '26px', fontWeight: 700,
            color: 'var(--vk-text)', marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}>
            Iniciar sesión
          </h2>
          <p style={{ color: 'var(--vk-text-muted)', fontSize: '14px', marginBottom: '32px' }}>
            Accede con tu cuenta del estudio
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{
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
                placeholder="tu@vkstudio.com"
                required
                className="vk-input"
              />
            </div>

            <div>
              <label style={{
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
              }}>
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
          }}>
            Vk Studio © 2025 — Sistema interno
          </p>
        </div>
      </div>

      <div className="bottom-logo" style={{
        position: 'absolute',
        bottom: '24px',
        left: '24px',
        pointerEvents: 'none',
        zIndex: 20,
      }}>
        <Image
          src="/logocolor3D.png"
          alt="Vk Studio 3D Logo"
          width={140}
          height={140}
          style={{ width: '120px', height: 'auto', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))' }}
        />
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(6deg); }
          50% { transform: translateY(-15px) rotate(4deg); }
          100% { transform: translateY(0px) rotate(6deg); }
        }
        @media (max-width: 860px) {
          .login-left { 
            position: absolute !important;
            inset: 0;
            z-index: 0;
            opacity: 0.8;
            pointer-events: none;
            padding: 24px !important;
          }
          .login-left h1, .login-left p {
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
          .bottom-logo {
            bottom: -30px !important;
            left: -30px !important;
            transform: scale(0.65);
          }
        }
      `}</style>
    </div>
  )
}
