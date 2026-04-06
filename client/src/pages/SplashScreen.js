import React, { useState, useEffect } from 'react';
import { Logo, Brand } from '../components/UI';

export default function SplashScreen({ onDone }) {
    const [progress, setProgress] = useState(0);
    const [fading, setFading] = useState(false);

    /* Simulate loading progress */
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => {
                const next = prev + Math.random() * 7 + 2;
                if (next >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return next;
            });
        }, 80);
        return () => clearInterval(interval);
    }, []);

    /* When progress hits 100, wait then fade out */
    useEffect(() => {
        if (progress >= 100) {
            const t1 = setTimeout(() => setFading(true), 400);
            const t2 = setTimeout(() => onDone(), 1200);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
    }, [progress, onDone]);

    const pct = Math.min(Math.floor(progress), 100);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            opacity: fading ? 0 : 1,
            transition: 'opacity 0.7s ease',
        }}>

            {/* Grid background */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'linear-gradient(rgba(0,245,196,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,196,0.04) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
                pointerEvents: 'none',
            }} />

            {/* Glow behind logo */}
            <div style={{
                position: 'absolute',
                width: 300,
                height: 300,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0,245,196,0.1) 0%, transparent 70%)',
                filter: 'blur(40px)',
                pointerEvents: 'none',
            }} />

            {/* Pulse rings */}
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        width: 80 + i * 70,
                        height: 80 + i * 70,
                        borderRadius: '50%',
                        border: `1px solid rgba(0,245,196,${0.18 - i * 0.04})`,
                        animation: 'pulseRing 2s ease-out infinite',
                        animationDelay: `${i * 0.45}s`,
                        pointerEvents: 'none',
                    }}
                />
            ))}

            {/* Logo circle */}
            <div style={{
                width: 88,
                height: 88,
                borderRadius: '50%',
                border: '2px solid var(--neon)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 32px rgba(0,245,196,0.35), inset 0 0 16px rgba(0,245,196,0.06)',
                animation: 'float 3.5s ease-in-out infinite',
                marginBottom: 28,
                position: 'relative',
            }}>
                <Logo size={38} />
            </div>

            {/* Brand */}
            <Brand fontSize={44} />

            <p style={{
                marginTop: 8,
                fontSize: 11,
                letterSpacing: '0.28em',
                color: 'var(--muted)',
                marginBottom: 52,
            }}>
                MUSIC WITHOUT BORDERS
            </p>

            {/* Progress bar */}
            <div style={{ width: 200 }}>
                <div style={{
                    height: 2,
                    background: 'rgba(255,255,255,0.07)',
                    borderRadius: 2,
                    overflow: 'hidden',
                    marginBottom: 10,
                }}>
                    <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, var(--purple), var(--neon))',
                        borderRadius: 2,
                        transition: 'width 0.1s linear',
                        boxShadow: '0 0 10px var(--neon)',
                    }} />
                </div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 10,
                    color: 'var(--muted)',
                    letterSpacing: '0.12em',
                }}>
                    <span>LOADING</span>
                    <span style={{ color: 'var(--neon)', fontWeight: 600 }}>{pct}%</span>
                </div>
            </div>
        </div>
    );
}