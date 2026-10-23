import React from 'react';

type Mood = 'happy' | 'cheer' | 'sad' | 'wink';

/** Collegiate "Ace" scholar pencil mascot (SVG). */
export function Mascot({ mood = 'happy', size = 160, className = '' }: { mood?: Mood; size?: number; className?: string }) {
  const mouth =
    mood === 'sad'
      ? 'M78 118 Q100 104 122 118'
      : mood === 'cheer'
      ? 'M76 108 Q100 140 124 108 Z'
      : 'M80 112 Q100 130 120 112';

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={className} role="img" aria-label="Ace the scholar pencil mascot">
      {/* soft shadow */}
      <ellipse cx="100" cy="186" rx="44" ry="7" fill="#000" opacity=".08" />

      {/* arms */}
      <path d="M50 120 Q28 118 24 96" stroke="#FFC800" strokeWidth="12" strokeLinecap="round" fill="none" />
      <path d={`M150 120 Q172 112 176 ${mood === 'cheer' ? 70 : 96}`} stroke="#FFC800" strokeWidth="12" strokeLinecap="round" fill="none" />

      {/* body */}
      <rect x="52" y="52" width="96" height="124" rx="14" fill="#FFC800" />
      <rect x="52" y="52" width="24" height="124" rx="12" fill="#E5B400" />
      <rect x="124" y="52" width="24" height="124" fill="#FFD84D" opacity=".6" />

      {/* metallic ferrule collar */}
      <rect x="52" y="38" width="96" height="18" fill="#CBD5E1" />
      <rect x="52" y="44" width="96" height="4" fill="#94A3B8" />

      {/* eraser dome */}
      <path d="M52 38 V30 Q52 16 100 16 Q148 16 148 30 V38 Z" fill="#EF4444" />

      {/* collegiate scholar mortarboard cap */}
      <g className="scholar-cap">
        {/* cap base */}
        <path d="M84 20 Q100 26 116 20 L114 26 Q100 32 86 26 Z" fill="#0F172A" />
        {/* diamond top */}
        <polygon points="100,5 142,16 100,27 58,16" fill="#1E293B" stroke="#0F172A" strokeWidth="2" strokeLinejoin="round" />
        {/* gold tassel button & string */}
        <circle cx="100" cy="16" r="3" fill="#F59E0B" />
        <path d="M100 16 Q128 20 134 32" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="134" cy="34" r="3" fill="#D97706" />
      </g>

      {/* sharpened wooden tip */}
      <path d="M52 176 L100 196 L148 176 Z" fill="#F3D9A8" />
      {/* lead tip */}
      <path d="M86 190 L100 196 L114 190 Z" fill="#334155" />

      {/* eyes */}
      <ellipse cx="82" cy="88" rx="11" ry={mood === 'sad' ? 11 : 13} fill="#fff" />
      <ellipse cx="118" cy="88" rx="11" ry={mood === 'sad' ? 11 : 13} fill="#fff" />
      <circle cx="84" cy="90" r="6" fill="#1E293B" />
      <circle cx="120" cy="90" r="6" fill="#1E293B" />
      {mood === 'wink' && <path d="M108 88 Q118 80 128 88" stroke="#1E293B" strokeWidth="4" fill="#FFC800" />}

      {/* expression mouth */}
      <path d={mouth} stroke="#1E293B" strokeWidth="5" strokeLinecap="round" fill={mood === 'cheer' ? '#EF4444' : 'none'} />

      {/* friendly cheek blush */}
      <circle cx="68" cy="108" r="6" fill="#FF9600" opacity=".5" />
      <circle cx="132" cy="108" r="6" fill="#FF9600" opacity=".5" />
    </svg>
  );
}
