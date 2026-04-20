import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Logo, Brand, NeonButton, AudioWave } from '../components/UI';

/* KEEP your TRENDING, COMMENTS, NAV_ITEMS as it is */

/* ❌ REMOVE STATIC TRACKS */
/* const TRACKS = [...] ❌ */

export default function Dashboard({ navigate }) {
    const [activeNav, setActiveNav] = useState('home');
    const [tracks, setTracks] = useState([]); // ✅ dynamic
    const [playingId, setPlayingId] = useState(null);
    const [liked, setLiked] = useState(new Set());
    const [search, setSearch] = useState('');

    /* ✅ FETCH TRACKS FROM BACKEND */
    useEffect(() => {
        axios.get('http://localhost:5000/api/tracks')
            .then(res => {
                setTracks(res.data);
                if (res.data.length > 0) {
                    setPlayingId(res.data[0]._id);
                }
            })
            .catch(err => console.log(err));
    }, []);

    const currentTrack = tracks.find(t => t._id === playingId) || tracks[0];

    const toggleLike = (id) => {
        setLiked((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

            {/* SIDEBAR SAME */}

            {/* MAIN */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* TOPBAR SAME */}

                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                    {/* FEED */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>

                        <section style={{ marginBottom: 36 }}>
                            <h2 style={{
                                fontFamily: 'var(--font-display)',
                                fontWeight: 800,
                                fontSize: 20,
                                marginBottom: 18,
                            }}>
                                Featured Tracks
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {tracks.map((track, idx) => (
                                    <TrackRow
                                        key={track._id}
                                        track={track}
                                        index={idx}
                                        isPlaying={playingId === track._id}
                                        isLiked={liked.has(track._id)}
                                        onPlay={() => setPlayingId(track._id)}
                                        onLike={() => toggleLike(track._id)}
                                    />
                                ))}
                            </div>
                        </section>

                        {/* COMMENTS SAME */}
                    </div>

                    {/* RIGHT PANEL */}
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
                        {currentTrack && <NowPlayingPanel track={currentTrack} />}
                        <TrendingPanel tracks={TRENDING} />
                    </div>
                </div>
            </main>
        </div>
    );
}

/* 🔥 UPDATED TrackRow (IMPORTANT CHANGE) */
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
                background: isPlaying ? 'rgba(0,245,196,0.08)' : hovered ? 'rgba(255,255,255,0.02)' : 'var(--card)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
            }}
        >
            <div style={{ width: 22, textAlign: 'center' }}>
                {isPlaying ? <AudioWave size={18} /> : index + 1}
            </div>

            <div style={{ flex: 1 }}>
                <div>{track.title}</div>
                <div style={{ fontSize: 12, color: 'gray' }}>{track.artist}</div>
            </div>

            {/* 🔥 AUDIO PLAYER */}
            <audio controls style={{ width: 200 }}>
                <source src={`http://localhost:5000/${track.audioUrl}`} />
            </audio>

            <button onClick={(e) => { e.stopPropagation(); onLike(); }}>
                {isLiked ? '❤️' : '🤍'}
            </button>
        </div>
    );
}