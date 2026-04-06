import React, { useState } from 'react';
import { Logo, Brand, NeonButton, AudioWave } from '../components/UI';

/* ── Static mock data (replace with API calls) ── */
const TRACKS = [
    { id: 1, title: 'Neon Nights', artist: 'DJ Artefact', genre: 'Electronic', plays: '142K', likes: 4821, duration: '3:42', color: '#00f5c4' },
    { id: 2, title: 'Void Walker', artist: 'Synthwave Prophet', genre: 'Synthwave', plays: '98K', likes: 3204, duration: '4:11', color: '#bf5fff' },
    { id: 3, title: 'Burning Glass', artist: 'Aurora Lens', genre: 'Indie', plays: '67K', likes: 2087, duration: '2:58', color: '#ff3d6b' },
    { id: 4, title: 'Zero Gravity', artist: 'Cosmonaut', genre: 'Ambient', plays: '210K', likes: 7630, duration: '5:03', color: '#ffb700' },
    { id: 5, title: 'Cityscape Rain', artist: 'Urban Ghost', genre: 'Lo-fi', plays: '54K', likes: 1943, duration: '3:21', color: '#00b4ff' },
];

const TRENDING = [
    { rank: 1, title: 'Euphoria Loop', artist: 'NOVA', change: '▲12', up: true },
    { rank: 2, title: 'Deep Blue Dive', artist: 'Aqua Sine', change: '▲5', up: true },
    { rank: 3, title: 'Chrome Dreams', artist: 'Mirror Circuit', change: '▲8', up: true },
    { rank: 4, title: 'Broken Clock', artist: 'Tempo Ghost', change: '▼2', up: false },
    { rank: 5, title: 'Electric Tears', artist: 'Wavelength', change: '▲19', up: true },
];

const COMMENTS = [
    { user: '@beatmaker99', track: 'Neon Nights', text: 'This drop at 2:14 hits different. Pure gold.', time: '2m ago', avatarColor: '#00f5c4' },
    { user: '@wavehunter', track: 'Void Walker', text: 'The synth textures here are absolutely insane.', time: '8m ago', avatarColor: '#bf5fff' },
    { user: '@lilsonic', track: 'Zero Gravity', text: "Can't stop replaying this. An absolute masterpiece.", time: '22m ago', avatarColor: '#ffb700' },
];

const NAV_ITEMS = [
    { id: 'home', icon: '⊞', label: 'Home' },
    { id: 'explore', icon: '◎', label: 'Explore' },
    { id: 'library', icon: '≡', label: 'Library' },
    { id: 'upload', icon: '↑', label: 'Upload' },
    { id: 'analytics', icon: '∿', label: 'Analytics' },
];

export default function Dashboard({ navigate }) {
    const [activeNav, setActiveNav] = useState('home');
    const [playingId, setPlayingId] = useState(1);
    const [liked, setLiked] = useState(new Set([4]));
    const [search, setSearch] = useState('');

    const currentTrack = TRACKS.find((t) => t.id === playingId) || TRACKS[0];

    const toggleLike = (id) => {
        setLiked((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

            {/* ── Sidebar ────────────────────────────── */}
            <aside style={{
                width: 220,
                flexShrink: 0,
                background: 'var(--surface)',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                padding: '24px 0',
            }}>
                {/* Brand */}
                <div style={{
                    padding: '0 20px',
                    marginBottom: 36,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <Logo size={22} />
                    <Brand fontSize={18} />
                </div>

                {/* Nav links */}
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
                    {NAV_ITEMS.map((item) => {
                        const active = activeNav === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveNav(item.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '11px 14px',
                                    borderRadius: 10,
                                    background: active ? 'rgba(0,245,196,0.08)' : 'transparent',
                                    color: active ? 'var(--neon)' : 'var(--muted)',
                                    fontSize: 13,
                                    fontFamily: 'var(--font-display)',
                                    fontWeight: 600,
                                    borderLeft: active ? '2px solid var(--neon)' : '2px solid transparent',
                                    transition: 'all 0.18s ease',
                                    cursor: 'pointer',
                                    border: 'none',
                                    textAlign: 'left',
                                    width: '100%',
                                }}
                                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <span style={{ fontSize: 17 }}>{item.icon}</span>
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Profile card */}
                <div style={{
                    margin: '0 10px',
                    padding: '14px',
                    borderRadius: 12,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                }}>
                    <div style={{
                        width: 36, height: 36,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--neon), var(--purple))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#050508',
                        flexShrink: 0,
                    }}>
                        A
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>ArtistUser</div>
                        <div style={{ color: 'var(--muted)', fontSize: 11 }}>Free plan</div>
                    </div>
                </div>
            </aside>

            {/* ── Main content ───────────────────────── */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Topbar */}
                <div style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 28px',
                    background: 'rgba(5,5,8,0.9)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid var(--border)',
                    zIndex: 10,
                }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
                        <span style={{
                            position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                            color: 'var(--muted)', fontSize: 15, pointerEvents: 'none',
                        }}>
                            ⌕
                        </span>
                        <input
                            type="text"
                            placeholder="Search tracks, artists, genres..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px 10px 36px',
                                background: 'var(--card)',
                                border: '1px solid var(--border)',
                                borderRadius: 10,
                                color: 'var(--text)',
                                fontSize: 13,
                                outline: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => { e.target.style.borderColor = 'var(--neon)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
                        />
                    </div>

                    <NeonButton variant="ghost" style={{ padding: '9px 16px', fontSize: 14 }}>🔔</NeonButton>
                    <NeonButton variant="outline" onClick={() => navigate('landing')} style={{ padding: '9px 18px', fontSize: 12 }}>
                        ← Home
                    </NeonButton>
                </div>

                {/* Scrollable content + Now Playing panel */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                    {/* Feed */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>

                        {/* Track list */}
                        <section style={{ marginBottom: 36 }}>
                            <h2 style={{
                                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20,
                                marginBottom: 18,
                            }}>
                                Featured Tracks
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {TRACKS.map((track, idx) => (
                                    <TrackRow
                                        key={track.id}
                                        track={track}
                                        index={idx}
                                        isPlaying={playingId === track.id}
                                        isLiked={liked.has(track.id)}
                                        onPlay={() => setPlayingId(track.id)}
                                        onLike={() => toggleLike(track.id)}
                                    />
                                ))}
                            </div>
                        </section>

                        {/* Comments */}
                        <section>
                            <h2 style={{
                                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20,
                                marginBottom: 18,
                            }}>
                                Recent Comments
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {COMMENTS.map((c, i) => (
                                    <CommentCard key={i} comment={c} />
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right panel */}
                    <div style={{
                        width: 300,
                        flexShrink: 0,
                        overflowY: 'auto',
                        borderLeft: '1px solid var(--border)',
                        padding: '28px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 20,
                    }}>
                        <NowPlayingPanel track={currentTrack} />
                        <TrendingPanel tracks={TRENDING} onSelect={(id) => setPlayingId(id)} />
                    </div>
                </div>
            </main>
        </div>
    );
}

/* ── TrackRow ───────────────────────────────── */
function TrackRow({ track, index, isPlaying, isLiked, onPlay, onLike }) {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onClick={onPlay}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 18px',
                borderRadius: 14,
                background: isPlaying ? `${track.color}10` : hovered ? 'rgba(255,255,255,0.02)' : 'var(--card)',
                border: `1px solid ${isPlaying ? `${track.color}40` : hovered ? 'var(--border-hover)' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
            }}
        >
            {/* Index / wave */}
            <div style={{ width: 22, textAlign: 'center', flexShrink: 0 }}>
                {isPlaying
                    ? <AudioWave color={track.color} size={18} />
                    : <span style={{ color: 'var(--muted)', fontSize: 12 }}>{index + 1}</span>
                }
            </div>

            {/* Art */}
            <div style={{
                width: 42, height: 42,
                borderRadius: 9,
                background: `linear-gradient(135deg, ${track.color}30, ${track.color}70)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
            }}>
                🎵
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 14,
                    marginBottom: 2,
                    color: isPlaying ? track.color : 'var(--text)',
                    transition: 'color 0.18s',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {track.title}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {track.artist} · {track.genre}
                </div>
            </div>

            {/* Meta */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 18,
                fontSize: 12, color: 'var(--muted)', flexShrink: 0,
            }}>
                <span>▶ {track.plays}</span>
                <button
                    onClick={(e) => { e.stopPropagation(); onLike(); }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        color: isLiked ? 'var(--red)' : 'var(--muted)',
                        fontSize: 14,
                        transition: 'transform 0.18s, color 0.18s',
                        border: 'none', background: 'none', cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    {isLiked ? '♥' : '♡'}
                    <span style={{ fontSize: 12 }}>{isLiked ? track.likes + 1 : track.likes}</span>
                </button>
                <span>{track.duration}</span>
            </div>
        </div>
    );
}

/* ── CommentCard ────────────────────────────── */
function CommentCard({ comment }) {
    return (
        <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
        }}>
            <div style={{
                width: 34, height: 34,
                borderRadius: '50%',
                background: comment.avatarColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#050508',
                flexShrink: 0,
            }}>
                {comment.user[1].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--neon)' }}>
                        {comment.user}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>on {comment.track}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>{comment.time}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{comment.text}</p>
            </div>
        </div>
    );
}

/* ── NowPlayingPanel ────────────────────────── */
function NowPlayingPanel({ track }) {
    return (
        <div style={{
            background: 'var(--card)',
            border: `1px solid ${track.color}40`,
            borderRadius: 20,
            padding: '22px',
            boxShadow: `0 0 40px ${track.color}0d`,
        }}>
            <p style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.22em', marginBottom: 18 }}>
                NOW PLAYING
            </p>

            {/* Album art */}
            <div style={{
                width: '100%',
                paddingBottom: '100%',
                borderRadius: 14,
                position: 'relative',
                background: `linear-gradient(135deg, ${track.color}22, ${track.color}55)`,
                border: `1px solid ${track.color}30`,
                marginBottom: 18,
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <span style={{ fontSize: 52 }}>🎵</span>
                </div>
                {/* Mini wave overlay */}
                <div style={{
                    position: 'absolute', bottom: 14, left: 0, right: 0,
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3,
                }}>
                    {Array.from({ length: 18 }).map((_, i) => (
                        <div key={i} style={{
                            width: 3,
                            height: 6 + Math.sin(i * 0.7) * 12,
                            borderRadius: 2,
                            background: track.color,
                            opacity: 0.6,
                            animation: `barBounce ${0.5 + (i % 4) * 0.15}s ease-in-out infinite`,
                            animationDelay: `${(i * 0.08) % 0.6}s`,
                        }} />
                    ))}
                </div>
            </div>

            {/* Track info */}
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <div style={{
                    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17,
                    color: track.color, marginBottom: 4,
                }}>
                    {track.title}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>{track.artist}</div>
            </div>

            {/* Progress bar */}
            <div style={{
                height: 3,
                background: 'rgba(255,255,255,0.07)',
                borderRadius: 2,
                marginBottom: 6,
                cursor: 'pointer',
                overflow: 'hidden',
            }}>
                <div style={{
                    width: '38%', height: '100%',
                    background: track.color,
                    borderRadius: 2,
                }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 20 }}>
                <span>1:24</span>
                <span>{track.duration}</span>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                {[
                    { icon: '⏮', sm: true },
                    { icon: '⏪', sm: true },
                    { icon: '⏸', sm: false },
                    { icon: '⏩', sm: true },
                    { icon: '⏭', sm: true },
                ].map(({ icon, sm }, i) => (
                    <button
                        key={i}
                        style={{
                            width: sm ? 34 : 46,
                            height: sm ? 34 : 46,
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: sm ? 15 : 20,
                            background: sm ? 'transparent' : `${track.color}20`,
                            border: sm ? 'none' : `1px solid ${track.color}50`,
                            color: sm ? 'var(--muted)' : track.color,
                            cursor: 'pointer',
                            transition: 'all 0.18s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = sm ? 'var(--text)' : track.color; e.currentTarget.style.transform = 'scale(1.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = sm ? 'var(--muted)' : track.color; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        {icon}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ── TrendingPanel ──────────────────────────── */
function TrendingPanel({ tracks }) {
    return (
        <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '22px',
        }}>
            <p style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.22em', marginBottom: 18 }}>
                TRENDING TODAY
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {tracks.map((t) => (
                    <div key={t.rank} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                            fontFamily: 'var(--font-display)', fontWeight: 800,
                            fontSize: 18, color: 'rgba(255,255,255,0.08)', width: 20, flexShrink: 0,
                        }}>
                            {t.rank}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                                {t.title}
                            </div>
                            <div style={{ color: 'var(--muted)', fontSize: 11 }}>{t.artist}</div>
                        </div>
                        <span style={{
                            fontSize: 11, fontWeight: 700, flexShrink: 0,
                            color: t.up ? 'var(--neon)' : 'var(--red)',
                        }}>
                            {t.change}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}