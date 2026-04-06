import React from 'react';

/* ─── Logo ─────────────────────────────────── */
export function Logo({ size = 24 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M8 30 L8 16 L20 10 L20 24"
                stroke="#00f5c4" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
            />
            <circle cx="14" cy="30" r="5" stroke="#00f5c4" strokeWidth="2.5" />
            <circle cx="26" cy="24" r="5" stroke="#bf5fff" strokeWidth="2.5" />
            <path
                d="M20 24 L32 18 L32 24"
                stroke="#bf5fff" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
            />
        </svg>
    );
}

/* ─── Brand wordmark ────────────────────────── */
export function Brand({ fontSize = 22 }) {
    return (
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize }}>
            <span style={{ color: 'var(--neon)' }}>Techno</span>
            <span style={{ color: 'var(--text)' }}>Cloud</span>
        </span>
    );
}

/* ─── Neon Button ───────────────────────────── */
export function NeonButton({ children, onClick, variant = 'primary', style = {}, type = 'button' }) {
    const base = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '11px 26px',
        borderRadius: 10,
        fontSize: 13,
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        letterSpacing: '0.04em',
        transition: 'all 0.18s ease',
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
    };

    const variants = {
        primary: {
            background: 'linear-gradient(135deg, #00f5c4 0%, #00c9a0 100%)',
            color: '#050508',
            boxShadow: '0 0 24px rgba(0,245,196,0.2)',
        },
        outline: {
            background: 'transparent',
            color: 'var(--neon)',
            border: '1px solid var(--neon)',
        },
        ghost: {
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
        },
        danger: {
            background: 'rgba(255,61,107,0.12)',
            color: 'var(--red)',
            border: '1px solid rgba(255,61,107,0.3)',
        },
    };

    const handleEnter = (e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.filter = 'brightness(1.12)';
    };
    const handleLeave = (e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.filter = 'brightness(1)';
    };

    return (
        <button
            type={type}
            onClick={onClick}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            style={{ ...base, ...variants[variant], ...style }}
        >
            {children}
        </button>
    );
}

/* ─── WaveBar (single animated bar) ────────── */
export function WaveBar({ delay = 0, height = 20, color = 'var(--neon)', paused = false }) {
    return (
        <div
            style={{
                width: 3,
                height,
                borderRadius: 2,
                background: color,
                transformOrigin: 'bottom',
                animation: `barBounce 0.75s ease-in-out infinite`,
                animationDelay: `${delay}s`,
                animationPlayState: paused ? 'paused' : 'running',
            }}
        />
    );
}

/* ─── AudioWave (5 bars) ────────────────────── */
export function AudioWave({ color = 'var(--neon)', paused = false, size = 20 }) {
    const delays = [0, 0.15, 0.3, 0.15, 0];
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: size }}>
            {delays.map((d, i) => (
                <WaveBar key={i} delay={d} height={size} color={color} paused={paused} />
            ))}
        </div>
    );
}

/* ─── Input Field ───────────────────────────── */
export function InputField({ label, type = 'text', placeholder, value, onChange, required = false }) {
    const [focused, setFocused] = React.useState(false);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {label && (
                <label style={{
                    fontSize: 11,
                    color: focused ? 'var(--neon)' : 'var(--muted)',
                    letterSpacing: '0.14em',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    transition: 'color 0.2s',
                }}>
                    {label}
                </label>
            )}
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                    width: '100%',
                    padding: '13px 16px',
                    background: 'var(--surface)',
                    border: `1px solid ${focused ? 'var(--neon)' : 'var(--border)'}`,
                    borderRadius: 10,
                    color: 'var(--text)',
                    fontSize: 13,
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxShadow: focused ? '0 0 0 3px rgba(0,245,196,0.08)' : 'none',
                }}
            />
        </div>
    );
}