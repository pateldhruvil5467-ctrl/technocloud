import React, { useState } from 'react';
import { Logo, Brand, NeonButton, InputField } from '../components/UI';

export default function AuthPage({ navigate }) {
    const [mode, setMode] = useState('login');   // 'login' | 'signup'
    const [role, setRole] = useState('listener'); // 'listener' | 'artist'
    const [loading, setLoading] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        // Replace with real API call: POST /api/auth/login or /api/auth/register
        setTimeout(() => {
            setLoading(false);
            navigate('dashboard');
        }, 1400);
    };

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            background: 'var(--bg)',
        }}>

            {/* ── Left decorative panel ──────────────── */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '60px 64px',
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(160deg, rgba(0,245,196,0.03) 0%, rgba(191,95,255,0.03) 100%)',
                borderRight: '1px solid var(--border)',
            }}>

                {/* Grid bg */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    backgroundImage: 'linear-gradient(rgba(191,95,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(191,95,255,0.04) 1px, transparent 1px)',
                    backgroundSize: '44px 44px',
                }} />

                {/* Scanline */}
                <div style={{
                    position: 'absolute',
                    left: 0, right: 0,
                    height: 2,
                    background: 'linear-gradient(90deg, transparent, rgba(0,245,196,0.4), transparent)',
                    animation: 'scanline 5s linear infinite',
                    pointerEvents: 'none',
                }} />

                {/* Content */}
                <div style={{ position: 'relative' }}>
                    {/* Logo */}
                    <div style={{
                        width: 72, height: 72,
                        borderRadius: '50%',
                        border: '2px solid var(--neon)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 28px rgba(0,245,196,0.28)',
                        animation: 'float 3.5s ease-in-out infinite',
                        marginBottom: 28,
                    }}>
                        <Logo size={32} />
                    </div>

                    <Brand fontSize={40} />

                    <p style={{
                        marginTop: 12,
                        fontSize: 14,
                        color: 'var(--muted)',
                        lineHeight: 1.8,
                        maxWidth: 360,
                        marginBottom: 44,
                    }}>
                        The platform where independent artists reach millions and listeners discover the future of sound.
                    </p>

                    {/* Fake now-playing card */}
                    <NowPlayingCard />

                    {/* Testimonial */}
                    <div style={{
                        marginTop: 24,
                        padding: '16px 20px',
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        maxWidth: 360,
                    }}>
                        <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, marginBottom: 10, fontStyle: 'italic' }}>
                            "TechnoCloud changed how I share my music. My fanbase grew 10× in 3 months."
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--neon), var(--purple))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 13, fontWeight: 700, color: '#050508',
                                fontFamily: 'var(--font-display)',
                            }}>D</div>
                            <div>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>DJ Artefact</div>
                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Electronic Artist · 42K followers</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Right form panel ───────────────────── */}
            <div style={{
                width: 480,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '60px 52px',
            }}>

                {/* Mode tabs */}
                <div style={{
                    display: 'flex',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 4,
                    marginBottom: 36,
                }}>
                    {['login', 'signup'].map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            style={{
                                flex: 1,
                                padding: '10px 0',
                                borderRadius: 9,
                                fontSize: 13,
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700,
                                letterSpacing: '0.04em',
                                background: mode === m ? 'var(--neon)' : 'transparent',
                                color: mode === m ? '#050508' : 'var(--muted)',
                                transition: 'all 0.2s ease',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            {m === 'login' ? 'Sign In' : 'Sign Up'}
                        </button>
                    ))}
                </div>

                <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 26,
                    fontWeight: 800,
                    marginBottom: 6,
                }}>
                    {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 30 }}>
                    {mode === 'login'
                        ? 'Sign in to continue your journey.'
                        : 'Join the TechnoCloud community today.'}
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Role selector — signup only */}
                    {mode === 'signup' && (
                        <div>
                            <p style={{
                                fontSize: 11, color: 'var(--muted)', letterSpacing: '0.14em',
                                fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 10,
                            }}>
                                I AM A
                            </p>
                            <div style={{ display: 'flex', gap: 10 }}>
                                {['listener', 'artist'].map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setRole(r)}
                                        style={{
                                            flex: 1,
                                            padding: '12px 0',
                                            borderRadius: 10,
                                            border: role === r ? '1px solid var(--neon)' : '1px solid var(--border)',
                                            background: role === r ? 'rgba(0,245,196,0.07)' : 'var(--card)',
                                            color: role === r ? 'var(--neon)' : 'var(--muted)',
                                            fontFamily: 'var(--font-display)',
                                            fontWeight: 600,
                                            fontSize: 13,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {r === 'listener' ? '🎧 Listener' : '🎤 Artist'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Name — signup only */}
                    {mode === 'signup' && (
                        <InputField
                            label="DISPLAY NAME"
                            type="text"
                            placeholder="Your artist or listener name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    )}

                    <InputField
                        label="EMAIL"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <InputField
                        label="PASSWORD"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {mode === 'login' && (
                        <div style={{ textAlign: 'right', marginTop: -8 }}>
                            <span style={{ fontSize: 12, color: 'var(--neon)', cursor: 'pointer' }}>
                                Forgot password?
                            </span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: 8,
                            padding: '14px',
                            borderRadius: 10,
                            background: loading
                                ? 'rgba(0,245,196,0.25)'
                                : 'linear-gradient(135deg, #00f5c4, #00c9a0)',
                            color: '#050508',
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: 14,
                            letterSpacing: '0.04em',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        {loading
                            ? 'Please wait...'
                            : mode === 'login' ? 'Sign In →' : 'Create Account →'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--muted)' }}>
                    {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                    <span
                        style={{ color: 'var(--neon)', cursor: 'pointer' }}
                        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                    >
                        {mode === 'login' ? 'Sign Up' : 'Sign In'}
                    </span>
                </p>

                <button
                    onClick={() => navigate('landing')}
                    style={{
                        marginTop: 36,
                        fontSize: 12,
                        color: 'var(--muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        transition: 'color 0.2s',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
                >
                    ← Back to home
                </button>
            </div>
        </div>
    );
}

/* ── Now Playing Card (decorative) ─────────── */
function NowPlayingCard() {
    return (
        <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            maxWidth: 360,
        }}>
            <div style={{
                width: 46, height: 46,
                borderRadius: 10,
                background: 'linear-gradient(135deg, var(--purple), var(--red))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
            }}>
                🎵
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                    Neon Nights
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 8 }}>
                    DJ Artefact · 3:42
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
                    <div style={{
                        width: '38%', height: '100%',
                        background: 'var(--neon)', borderRadius: 2,
                    }} />
                </div>
            </div>
            {/* Wave indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 20, flexShrink: 0 }}>
                {[0, 0.15, 0.3, 0.15, 0].map((d, i) => (
                    <div key={i} style={{
                        width: 3, height: 20, borderRadius: 2,
                        background: 'var(--neon)',
                        transformOrigin: 'bottom',
                        animation: 'barBounce 0.75s ease-in-out infinite',
                        animationDelay: `${d}s`,
                    }} />
                ))}
            </div>
        </div>
    );
}