import React from 'react';
import { Logo, Brand, NeonButton, AudioWave } from '../components/UI';

const MARQUEE_ITEMS = [
    'Kendrick Lamar', 'Billie Eilish', 'The Weeknd', 'Dua Lipa',
    'Travis Scott', 'FKA Twigs', 'SZA', 'Frank Ocean', 'Jungle', 'Arca',
];

const FEATURES = [
    { icon: '🎵', title: 'Upload & Distribute', desc: 'Artists upload tracks directly — no label needed. Your sound, your rules, your audience.' },
    { icon: '🔊', title: 'Lossless Streaming', desc: 'Crystal-clear audio up to 320kbps. Hear every nuance the artist intended.' },
    { icon: '💬', title: 'Waveform Comments', desc: 'Drop timestamped reactions right on the waveform. Engage exactly where it matters.' },
    { icon: '❤️', title: 'Like & Discover', desc: 'Curated feeds powered by what you love. Discover artists before they blow up.' },
    { icon: '📊', title: 'Artist Analytics', desc: 'Deep insights — plays, likes, top listeners, geography, and play-through rates.' },
    { icon: '🌐', title: 'Global Community', desc: 'Connect with fans and artists across 120+ countries every single day.' },
];

const STATS = [
    { value: '2M+', label: 'Tracks' },
    { value: '180K+', label: 'Artists' },
    { value: '8M+', label: 'Listeners' },
];

export default function LandingPage({ navigate }) {
    return (
        <div style={{ minHeight: '100vh', overflowX: 'hidden' }}>

            {/* ── Navbar ─────────────────────────────── */}
            <nav style={{
                position: 'fixed',
                top: 0, left: 0, right: 0,
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 60px',
                background: 'rgba(5,5,8,0.88)',
                backdropFilter: 'blur(14px)',
                borderBottom: '1px solid var(--border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Logo size={26} />
                    <Brand fontSize={20} />
                </div>

                <div style={{ display: 'flex', gap: 36, fontSize: 12, color: 'var(--muted)', letterSpacing: '0.1em' }}>
                    {['Features', 'Artists', 'Pricing', 'Blog'].map((link) => (
                        <span
                            key={link}
                            style={{ cursor: 'pointer', transition: 'color 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--neon)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
                        >
                            {link}
                        </span>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <NeonButton variant="ghost" onClick={() => navigate('auth')} style={{ padding: '9px 20px' }}>
                        Sign In
                    </NeonButton>
                    <NeonButton onClick={() => navigate('auth')} style={{ padding: '9px 20px' }}>
                        Get Started
                    </NeonButton>
                </div>
            </nav>

            {/* ── Hero ───────────────────────────────── */}
            <section style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                textAlign: 'center',
                padding: '120px 40px 80px',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Grid */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    backgroundImage: 'linear-gradient(rgba(0,245,196,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,196,0.035) 1px, transparent 1px)',
                    backgroundSize: '64px 64px',
                }} />

                {/* Glow orbs */}
                <div style={{
                    position: 'absolute', top: '18%', left: '8%',
                    width: 340, height: 340, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0,245,196,0.07) 0%, transparent 70%)',
                    filter: 'blur(50px)', pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: '15%', right: '8%',
                    width: 420, height: 420, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(191,95,255,0.07) 0%, transparent 70%)',
                    filter: 'blur(60px)', pointerEvents: 'none',
                }} />

                {/* Badge */}
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'rgba(0,245,196,0.06)',
                    border: '1px solid rgba(0,245,196,0.18)',
                    borderRadius: 100,
                    padding: '8px 18px',
                    marginBottom: 32,
                    fontSize: 11,
                    color: 'var(--neon)',
                    letterSpacing: '0.16em',
                    animation: 'fadeUp 0.6s ease both',
                }}>
                    <AudioWave size={16} />
                    NOW STREAMING · 2M+ TRACKS
                </div>

                {/* Headline */}
                <h1 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(48px, 8vw, 96px)',
                    fontWeight: 800,
                    lineHeight: 0.95,
                    letterSpacing: '-0.03em',
                    marginBottom: 24,
                    animation: 'fadeUp 0.6s 0.1s ease both',
                }}>
                    Where Music<br />
                    <span style={{ color: 'var(--neon)', textShadow: '0 0 40px rgba(0,245,196,0.45)' }}>Finds</span>
                    {' '}Its{' '}
                    <span style={{
                        background: 'linear-gradient(135deg, var(--purple), var(--red))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        Voice
                    </span>
                </h1>

                <p style={{
                    fontSize: 16,
                    color: 'var(--muted)',
                    lineHeight: 1.75,
                    maxWidth: 500,
                    margin: '0 auto 44px',
                    animation: 'fadeUp 0.6s 0.2s ease both',
                }}>
                    TechnoCloud is the open stage for independent artists and the discovery engine for true music lovers.
                </p>

                {/* CTAs */}
                <div style={{
                    display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap',
                    animation: 'fadeUp 0.6s 0.3s ease both',
                }}>
                    <NeonButton onClick={() => navigate('auth')} style={{ padding: '15px 36px', fontSize: 14 }}>
                        Start Listening Free →
                    </NeonButton>
                    <NeonButton variant="outline" onClick={() => navigate('auth')} style={{ padding: '15px 36px', fontSize: 14 }}>
                        Upload Your Music
                    </NeonButton>
                </div>

                {/* Stats */}
                <div style={{
                    display: 'flex',
                    gap: 60,
                    justifyContent: 'center',
                    marginTop: 72,
                    flexWrap: 'wrap',
                    animation: 'fadeUp 0.6s 0.4s ease both',
                }}>
                    {STATS.map(({ value, label }) => (
                        <div key={label} style={{ textAlign: 'center' }}>
                            <div style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: 36,
                                fontWeight: 800,
                                color: 'var(--neon)',
                                lineHeight: 1,
                                marginBottom: 4,
                            }}>
                                {value}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.18em' }}>{label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Marquee ────────────────────────────── */}
            <div style={{
                overflow: 'hidden',
                borderTop: '1px solid var(--border)',
                borderBottom: '1px solid var(--border)',
                padding: '14px 0',
                background: 'rgba(0,245,196,0.015)',
            }}>
                <div style={{
                    display: 'flex',
                    width: 'max-content',
                    animation: 'marqueeScroll 24s linear infinite',
                }}>
                    {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((name, i) => (
                        <span key={i} style={{
                            padding: '0 32px',
                            fontSize: 11,
                            color: 'var(--muted)',
                            letterSpacing: '0.14em',
                            whiteSpace: 'nowrap',
                        }}>
                            {i % 2 === 0 ? '◆' : '·'}&nbsp;&nbsp;{name.toUpperCase()}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Features ───────────────────────────── */}
            <section style={{ padding: '110px 60px', maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 72 }}>
                    <p style={{ fontSize: 11, color: 'var(--neon)', letterSpacing: '0.26em', marginBottom: 14 }}>
                        PLATFORM FEATURES
                    </p>
                    <h2 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(32px, 4vw, 52px)',
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                    }}>
                        Built for the whole<br />music ecosystem
                    </h2>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 18,
                }}>
                    {FEATURES.map((f) => (
                        <FeatureCard key={f.title} {...f} />
                    ))}
                </div>
            </section>

            {/* ── CTA Banner ─────────────────────────── */}
            <section style={{ padding: '0 60px 110px' }}>
                <div style={{
                    borderRadius: 24,
                    padding: '80px 60px',
                    background: 'linear-gradient(135deg, rgba(0,245,196,0.05) 0%, rgba(191,95,255,0.05) 100%)',
                    border: '1px solid rgba(0,245,196,0.14)',
                    textAlign: 'center',
                }}>
                    <h2 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(28px, 4vw, 48px)',
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                        marginBottom: 16,
                    }}>
                        Ready to drop your sound?
                    </h2>
                    <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 36 }}>
                        Join 180,000+ artists already sharing their music on TechnoCloud.
                    </p>
                    <NeonButton onClick={() => navigate('auth')} style={{ padding: '17px 48px', fontSize: 15 }}>
                        Create Free Account →
                    </NeonButton>
                </div>
            </section>

            {/* ── Footer ─────────────────────────────── */}
            <footer style={{
                borderTop: '1px solid var(--border)',
                padding: '32px 60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 12,
                color: 'var(--muted)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Logo size={18} />
                    <Brand fontSize={16} />
                </div>
                <span>© {new Date().getFullYear()} TechnoCloud. All rights reserved.</span>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc }) {
    const [hovered, setHovered] = React.useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: 'var(--card)',
                border: `1px solid ${hovered ? 'rgba(0,245,196,0.28)' : 'var(--border)'}`,
                borderRadius: 16,
                padding: '28px 28px',
                transition: 'all 0.22s ease',
                transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: hovered ? '0 20px 50px rgba(0,245,196,0.07)' : 'none',
                cursor: 'default',
            }}
        >
            <div style={{ fontSize: 28, marginBottom: 16 }}>{icon}</div>
            <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 16,
                marginBottom: 10,
                color: hovered ? 'var(--neon)' : 'var(--text)',
                transition: 'color 0.2s',
            }}>
                {title}
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>{desc}</p>
        </div>
    );
}