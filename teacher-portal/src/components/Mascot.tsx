import React from 'react';

type Mood = 'happy' | 'cheer' | 'sad' | 'wink';

/** Original "Ace" pencil mascot (SVG). */
export function Mascot({ mood = 'happy', size = 160, className = '' }: { mood?: Mood; size?: number; className?: string }) {
  const mouth =
    mood === 'sad'
      ? 'M78 118 Q100 104 122 118'
      : mood === 'cheer'
      ? 'M76 108 Q100 140 124 108 Z'
      : 'M80 112 Q100 130 120 112';
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={className} role="img" aria-label="Ace the pencil mascot">
      {/* shadow */}
      <ellipse cx="100" cy="186" rx="42" ry="7" fill="#000" opacity=".08" />
      {/* arms */}
      <path d="M50 120 Q28 118 24 96" stroke="#FFC800" strokeWidth="12" strokeLinecap="round" fill="none" />
      <path d={`M150 120 Q172 112 176 ${mood === 'cheer' ? 70 : 96}`} stroke="#FFC800" strokeWidth="12" strokeLinecap="round" fill="none" />
      {/* body */}
      <rect x="52" y="52" width="96" height="124" rx="14" fill="#FFC800" />
      <rect x="52" y="52" width="24" height="124" rx="12" fill="#E5B400" />
      <rect x="124" y="52" width="24" height="124" fill="#FFD84D" opacity=".6" />
      {/* band + eraser */}
      <rect x="52" y="36" width="96" height="22" fill="#C0C0C0" />
      <rect x="52" y="44" width="96" height="4" fill="#9a9a9a" />
      <path d="M52 36 V28 Q52 12 100 12 Q148 12 148 28 V36 Z" fill="#FF4B4B" />
      {/* tip */}
      <path d="M52 176 L100 196 L148 176 Z" fill="#F3D9A8" />
      <path d="M86 190 L100 196 L114 190 Z" fill="#4B4B4B" />
      {/* face */}
      <ellipse cx="82" cy="88" rx="11" ry={mood === 'sad' ? 11 : 13} fill="#fff" />
      <ellipse cx="118" cy="88" rx="11" ry={mood === 'sad' ? 11 : 13} fill="#fff" />
      <circle cx="84" cy="90" r="6" fill="#4B4B4B" />
      <circle cx="120" cy="90" r="6" fill="#4B4B4B" />
      {mood === 'wink' && <path d="M108 88 Q118 80 128 88" stroke="#4B4B4B" strokeWidth="4" fill="#FFC800" />}
      <path d={mouth} stroke="#4B4B4B" strokeWidth="5" strokeLinecap="round" fill={mood === 'cheer' ? '#FF4B4B' : 'none'} />
      <circle cx="68" cy="108" r="6" fill="#FF9600" opacity=".5" />
      <circle cx="132" cy="108" r="6" fill="#FF9600" opacity=".5" />
    </svg>
  );
}
