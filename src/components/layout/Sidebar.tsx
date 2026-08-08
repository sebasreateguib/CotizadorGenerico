'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  LayoutDashboard,
  Users,
  LogOut,
  ChevronRight,
  Menu,
  X,
  FileText,
  Sparkles,
  ShieldCheck,
  Tags,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'

interface SidebarProps {
  user: User
  profile: { full_name: string; role: string; email: string } | null
  metrics?: { totalMes: number; dailyData: number[] }
}

export type NavItemData = {
  id: string;
  title: string;
  href?: string;
  icon: React.ElementType;
  badge?: number | string;
  shortcut?: string;
  children?: NavItemData[];
  action?: () => void;
};

export type NavGroupData = {
  heading?: string;
  items: NavItemData[];
};

function NavItem({
  item,
  activeId,
  level = 0,
  onClick,
  isCollapsed = false
}: {
  item: NavItemData;
  activeId: string;
  level?: number;
  onClick?: () => void;
  isCollapsed?: boolean;
}) {
  const isActive = activeId === item.id || activeId.startsWith(item.id + '-');
  const hasChildren = !!item.children;
  const [isOpen, setIsOpen] = useState(isActive);

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
    if (item.action) {
      e.preventDefault();
      item.action();
    }
    if (onClick && !hasChildren && !item.action) {
      onClick();
    }
  };

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div
        onClick={handleClick}
        title={item.title}
        style={{
          display: 'flex', alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          padding: isCollapsed ? '10px' : `7px 10px 7px ${level * 12 + 10}px`,
          borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s',
          userSelect: 'none',
          background: isActive ? 'var(--vk-pink-muted)' : 'transparent',
          border: isActive ? '1px solid var(--vk-pink-glow)' : '1px solid transparent',
          color: isActive ? 'var(--vk-pink-soft)' : 'var(--vk-text-muted)',
          fontWeight: isActive ? 500 : 400,
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
            e.currentTarget.style.color = 'var(--vk-text)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--vk-text-muted)'
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <item.icon
            size={isCollapsed ? 18 : 16}
            strokeWidth={1.5}
            color={isActive ? 'var(--vk-pink-soft)' : 'currentColor'}
          />
          {!isCollapsed && (
            <span style={{ fontSize: '13px', letterSpacing: '0.02em' }}>
              {item.title}
            </span>
          )}
        </div>

        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {item.badge && (
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: '20px', height: '20px', padding: '0 6px',
                fontSize: '10px', fontWeight: 500, borderRadius: '999px',
                background: 'var(--vk-pink-muted)', color: 'var(--vk-pink)',
              }}>
                {item.badge}
              </span>
            )}
            {hasChildren && (
              <ChevronRight
                size={14}
                strokeWidth={2}
                style={{
                  color: 'var(--vk-text-subtle)',
                  transition: 'transform 0.2s',
                  transform: isOpen ? 'rotate(90deg)' : 'none'
                }}
              />
            )}
          </div>
        )}
      </div>

      {hasChildren && !isCollapsed && (
        <div style={{
          display: 'grid',
          transition: 'grid-template-rows 0.3s ease, opacity 0.3s ease',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          opacity: isOpen ? 1 : 0,
        }}>
          <div style={{ overflow: 'hidden', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
            <div
              style={{
                position: 'absolute', top: 0, bottom: 0,
                borderLeft: '1px solid var(--vk-border-light)',
                left: `${level * 12 + 17.5}px`
              }}
            />
            {item.children!.map(child => (
              <NavItem
                key={child.id}
                item={child}
                activeId={activeId}
                level={level + 1}
                onClick={onClick}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (item.href && !hasChildren && !item.action) {
    return <Link href={item.href} style={{ textDecoration: 'none' }}>{content}</Link>;
  }

  return content;
}

export default function Sidebar({ user, profile, metrics }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false)

  const isSuperadmin = profile?.role === 'superadmin'
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Usuario'

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(false)
    }, 0)
    return () => clearTimeout(timer)
  }, [pathname])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        document.documentElement.style.setProperty('--sidebar-width', '0px')
      } else {
        document.documentElement.style.setProperty('--sidebar-width', isDesktopCollapsed ? '72px' : '260px')
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isDesktopCollapsed])

  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // El superadmin no tiene estudio propio (tenant_id NULL): las pantallas de
  // cotizar le saldrían vacías, así que solo ve el panel de alumnas.
  const navGroups: NavGroupData[] = isSuperadmin
    ? [{
        heading: 'Plataforma',
        items: [
          { id: '/admin', title: 'Alumnas', href: '/admin', icon: ShieldCheck },
        ]
      }]
    : [{
        heading: 'General',
        items: [
          { id: '/dashboard', title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { id: '/cotizacion/nueva', title: 'Nueva Cotización', href: '/cotizacion/nueva', icon: Sparkles },
          { id: '/cotizaciones', title: 'Cotizaciones', href: '/cotizaciones', icon: FileText },
          { id: '/clientes', title: 'Clientes', href: '/clientes', icon: Users },
        ]
      }, {
        heading: 'Mi estudio',
        items: [
          { id: '/precios', title: 'Mis precios', href: '/precios', icon: Tags },
        ]
      }];

  const bottomItems: NavItemData[] = [
    {
      id: 'logout',
      title: 'Cerrar sesión',
      icon: LogOut,
      action: handleSignOut,
    },
  ];

  let activeId = '/dashboard';
  if (pathname.startsWith('/cotizacion/nueva')) activeId = '/cotizacion/nueva';
  else if (pathname.startsWith('/cotizaciones') || (pathname.startsWith('/cotizacion/') && !pathname.startsWith('/cotizacion/nueva'))) activeId = '/cotizaciones';
  else if (pathname.startsWith('/clientes')) activeId = '/clientes';
  else if (pathname.startsWith('/precios')) activeId = '/precios';
  else if (pathname.startsWith('/admin')) activeId = '/admin';

  return (
    <>
      {/* Top App Bar (Solo Mobile) */}
      <div className="mobile-top-bar">
        <button
          className="mobile-hamburger-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu size={24} />
        </button>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
          <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--vk-text)' }}>VK STUDIO</span>
          <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.3em', marginRight: '-0.3em', marginTop: '4px', color: 'var(--vk-pink-soft)' }}>ACADEMY</span>
        </span>
        <div style={{ width: '40px' }} /> {/* Spacer */}
      </div>

      <div className={`mobile-overlay ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(false)} aria-hidden="true" />

      <aside className={`sidebar-container ${isOpen ? 'open' : ''}`} style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: isDesktopCollapsed ? '72px' : '260px',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, var(--vk-dark) 0%, var(--vk-black) 100%)',
        borderRight: '1px solid var(--vk-border)',
        padding: isDesktopCollapsed ? '12px 8px' : '12px',
        fontFamily: 'var(--font-body)',
        zIndex: 100,
        transition: 'width 0.3s ease, transform 0.3s ease, padding 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isDesktopCollapsed ? 'center' : 'space-between', padding: isDesktopCollapsed ? '0' : '0 8px', marginBottom: '24px', marginTop: '8px' }}>
          {!isDesktopCollapsed && (
            <Link href="/dashboard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}>
              <Image
                src="/bannerblanco3D.png"
                alt="Vk Studio Academy"
                width={400}
                height={150}
                style={{ width: '130px', height: 'auto' }}
                priority
              />
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '10px', fontWeight: 600,
                letterSpacing: '0.34em',
                textTransform: 'uppercase',
                color: 'var(--vk-pink-soft)',
                // El tracking agrega un hueco al final; se compensa para que
                // la palabra quede ópticamente centrada bajo el logo.
                marginRight: '-0.34em',
                marginTop: '8px',
              }}>
                Academy
              </span>
            </Link>
          )}
          <button
            className="desktop-only"
            onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
            style={{
              background: 'transparent', border: 'none', color: 'var(--vk-text-muted)',
              cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '6px', transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--vk-text)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--vk-text-muted)'
              e.currentTarget.style.background = 'transparent'
            }}
            title={isDesktopCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {isDesktopCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          
          <button
            className="mobile-only"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar menú"
            style={{
              background: 'transparent', border: 'none', color: 'var(--vk-text-muted)',
              cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '6px', transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--vk-text)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--vk-text-muted)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: isDesktopCollapsed ? 'center' : 'flex-start', padding: isDesktopCollapsed ? '8px 0' : '8px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s', userSelect: 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title={isDesktopCollapsed ? displayName : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: isDesktopCollapsed ? '0' : '12px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '6px',
                background: 'linear-gradient(135deg, var(--vk-pink-soft), var(--vk-pink))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 600, fontSize: '13px', color: 'var(--vk-white)',
                boxShadow: '0 2px 8px rgba(243,50,131,0.25)',
                fontFamily: 'var(--font-heading)'
              }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              {!isDesktopCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1, marginBottom: '4px', color: 'var(--vk-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                    {displayName}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--vk-pink-soft)', fontWeight: 500, lineHeight: 1 }}>
                    {isSuperadmin ? 'Super admin' : 'Alumna'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {navGroups.map((group, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {group.heading && !isDesktopCollapsed && (
                <span style={{ padding: '0 10px', marginBottom: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--vk-text-subtle)', textTransform: 'uppercase' }}>
                  {group.heading}
                </span>
              )}
              {group.heading && isDesktopCollapsed && (
                <div style={{ width: '100%', height: '1px', background: 'var(--vk-border-light)', margin: '8px 0', opacity: 0.5 }} />
              )}
              {group.items.map(item => (
                <NavItem
                  key={item.id}
                  item={item}
                  activeId={activeId}
                  onClick={() => setIsOpen(false)}
                  isCollapsed={isDesktopCollapsed}
                />
              ))}
            </div>
          ))}

          {/* Terminal Dashboard Widget */}
          {!isDesktopCollapsed && metrics && (
            <div style={{
              margin: '12px 12px 0',
              padding: '12px 12px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '10px',
              color: '#888',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.03)'
            }}>
              {/* Sección Actividad */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ letterSpacing: '0.15em', color: '#555' }}>ACTIVIDAD</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00ffcc' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#00ffcc', boxShadow: '0 0 4px #00ffcc' }} />
                    <span style={{ fontSize: '9px' }}>Live</span>
                  </div>
                </div>

                <div style={{ width: '100%', height: '35px', position: 'relative', marginTop: '2px' }}>
                  {(() => {
                    const data = metrics.dailyData;
                    const max = Math.max(...data, 1);

                    const width = 200;
                    const height = 35;
                    const points = data.map((val, i) => {
                      const x = (i / (data.length - 1)) * width;
                      const y = height - ((val / max) * height * 0.85);
                      return `${x},${y}`;
                    });
                    const linePath = `M ${points.join(' L ')}`;
                    const fillPath = `${linePath} L ${width},${height} L 0,${height} Z`;

                    return (
                      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--vk-pink)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="var(--vk-pink)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d={fillPath} fill="url(#chartGradient)" />
                        <path d={linePath} fill="none" stroke="var(--vk-pink)" strokeWidth="1.2" style={{ filter: 'drop-shadow(0 2px 4px rgba(243,50,131,0.3))' }} />
                        <circle cx={width} cy={height - ((data[data.length - 1] / max) * height * 0.85)} r="1.5" fill="var(--vk-pink)" />
                      </svg>
                    )
                  })()}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', marginTop: '2px' }}>
                  <span>Últimos 7d</span>
                  <span style={{ color: 'var(--vk-pink)' }}>↑ S/ {metrics.totalMes}</span>
                </div>
              </div>

              <div style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }} />

              {/* Sección Resumen */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ letterSpacing: '0.15em', color: '#555', marginBottom: '2px' }}>RESUMEN</span>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#5c5c5c' }} />
                    <span>Canceladas</span>
                  </div>
                  <span style={{ color: '#888' }}>0</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--vk-pink)' }} />
                    <span>En proceso</span>
                  </div>
                  <span style={{ color: 'var(--vk-pink)' }}>0</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#00ffcc' }} />
                    <span>Aprobadas</span>
                  </div>
                  <span style={{ color: '#00ffcc' }}>0</span>
                </div>
              </div>
            </div>
          )}

          {/* Espacio Decorativo Premium */}
          {!isDesktopCollapsed && (
            <div style={{
              marginTop: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px 0 20px',
              pointerEvents: 'none',
              userSelect: 'none',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  position: 'absolute',
                  width: '160px',
                  height: '160px',
                  background: 'radial-gradient(circle, var(--vk-pink-glow) 0%, transparent 65%)',
                  opacity: 0.15,
                  mixBlendMode: 'screen',
                }} />
                <Image
                  src="/logoblanco2D.png"
                  alt="VK Studio Watermark"
                  width={300}
                  height={112}
                  style={{
                    width: '140px',
                    height: 'auto',
                    opacity: 0.06,
                    transform: 'rotate(-4deg)',
                    filter: 'contrast(120%) brightness(150%)',
                    position: 'relative',
                    zIndex: 1
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--vk-border)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {bottomItems.map(item => (
            <NavItem
              key={item.id}
              item={item}
              activeId={activeId}
              isCollapsed={isDesktopCollapsed}
            />
          ))}
        </div>
      </aside>
    </>
  )
}
