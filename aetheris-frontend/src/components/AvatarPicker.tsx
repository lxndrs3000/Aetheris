import type { FC } from 'react';

// Custom cosmic SVG avatars — each is a data URI with gradient bg + space silhouette
const svg = (bg: string, content: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${bg}${content}</svg>`)}`;

const grad = (id: string, c1: string, c2: string, c3?: string) =>
  c3
    ? `<defs><radialGradient id="${id}" cx="50%" cy="45%" r="65%"><stop offset="0%" stop-color="${c1}"/><stop offset="55%" stop-color="${c2}"/><stop offset="100%" stop-color="${c3}"/></radialGradient></defs><rect width="200" height="200" fill="url(#${id})"/>`
    : `<defs><radialGradient id="${id}" cx="50%" cy="40%" r="70%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></radialGradient></defs><rect width="200" height="200" fill="url(#${id})"/>`;

const stars = (count: number, seed: number) => {
  let s = '';
  for (let i = 0; i < count; i++) {
    const x = ((seed * (i + 1) * 137) % 190) + 5;
    const y = ((seed * (i + 1) * 251) % 190) + 5;
    const r = ((i * seed) % 3) * 0.3 + 0.4;
    const o = 0.3 + ((i * seed) % 5) * 0.12;
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="${o}"/>`;
  }
  return s;
};

export const AVATARS = [
  {
    id: 0, label: 'Voyager',
    url: svg(
      grad('v', '#2a1860', '#141028', '#0a0818') + stars(30, 7),
      // Astronaut silhouette — standing, front-facing
      `<g transform="translate(100,108) scale(0.9)" fill="none">
        <!-- helmet -->
        <ellipse cx="0" cy="-38" rx="16" ry="18" fill="#f0e8d8" opacity="1"/>
        <ellipse cx="0" cy="-38" rx="12" ry="13" fill="#2a1860" opacity="0.6"/>
        <ellipse cx="-3" cy="-40" rx="4" ry="5" fill="white" opacity="0.25"/>
        <!-- visor shine -->
        <path d="M-8,-44 Q0,-50 8,-44 Q4,-38 -4,-38Z" fill="white" opacity="0.15"/>
        <!-- body -->
        <path d="M-14,-20 Q-18,-10 -16,10 L-12,30 Q-10,36 -6,36 L-4,30 L0,10 L4,30 L6,36 Q10,36 12,30 L16,10 Q18,-10 14,-20Z" fill="#f0e8d8" opacity="1"/>
        <!-- backpack -->
        <rect x="-10" y="-18" width="20" height="22" rx="4" fill="#d4c8b0" opacity="0.6"/>
        <!-- arms -->
        <path d="M-14,-16 Q-24,-8 -22,4 L-18,6 Q-20,-4 -14,-10" fill="#f0e8d8" opacity="0.95"/>
        <path d="M14,-16 Q24,-8 22,4 L18,6 Q20,-4 14,-10" fill="#f0e8d8" opacity="0.95"/>
        <!-- glow at feet -->
        <ellipse cx="0" cy="40" rx="24" ry="6" fill="#7180ff" opacity="0.4"/>
      </g>
      <!-- planet ring in background -->
      <ellipse cx="100" cy="155" rx="80" ry="12" fill="none" stroke="#9b8aff" stroke-width="1.5" opacity="0.35"/>
      <ellipse cx="100" cy="155" rx="90" ry="15" fill="none" stroke="#9b8aff" stroke-width="0.8" opacity="0.2"/>`
    ),
  },
  {
    id: 1, label: 'Nebula',
    url: svg(
      grad('n', '#3a2060', '#18103a', '#0c0820') + stars(25, 3),
      // Astronaut with flowing nebula waves behind
      `<!-- nebula waves -->
      <path d="M20,80 Q60,40 100,70 T180,60" fill="none" stroke="#c078ff" stroke-width="10" opacity="0.4" stroke-linecap="round"/>
      <path d="M10,100 Q50,65 100,90 T190,75" fill="none" stroke="#20d4e8" stroke-width="8" opacity="0.35" stroke-linecap="round"/>
      <path d="M15,120 Q65,85 110,110 T185,95" fill="none" stroke="#c078ff" stroke-width="7" opacity="0.3" stroke-linecap="round"/>
      <path d="M25,60 Q70,30 120,55 T185,45" fill="none" stroke="#20d4e8" stroke-width="5" opacity="0.25" stroke-linecap="round"/>
      <!-- astronaut center -->
      <g transform="translate(100,105) scale(0.85)">
        <ellipse cx="0" cy="-36" rx="14" ry="16" fill="#18103a" stroke="#e0d0b0" stroke-width="2" opacity="1"/>
        <ellipse cx="-3" cy="-38" rx="3" ry="4" fill="white" opacity="0.2"/>
        <path d="M-12,-18 Q-16,-6 -14,14 L-10,32 Q-8,38 -4,36 L0,14 L4,36 Q8,38 10,32 L14,14 Q16,-6 12,-18Z" fill="#18103a" stroke="#e0d0b0" stroke-width="1.8"/>
        <path d="M-12,-14 Q-22,-6 -20,6" stroke="#e0d0b0" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M12,-14 Q22,-6 20,6" stroke="#e0d0b0" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      </g>
      <!-- moon -->
      <circle cx="160" cy="45" r="12" fill="#f0e8d0" opacity="0.45"/>`
    ),
  },
  {
    id: 2, label: 'Orion',
    url: svg(
      grad('o', '#6a2030', '#2a1018', '#120810') + stars(35, 11),
      // Astronaut on surface with constellation behind
      `<!-- constellation lines -->
      <g stroke="#90e0ff" stroke-width="1.2" opacity="0.7">
        <line x1="70" y1="30" x2="90" y2="50"/>
        <line x1="90" y1="50" x2="85" y2="75"/>
        <line x1="85" y1="75" x2="100" y2="90"/>
        <line x1="90" y1="50" x2="115" y2="55"/>
        <line x1="115" y1="55" x2="130" y2="40"/>
        <line x1="115" y1="55" x2="120" y2="80"/>
      </g>
      <g fill="#90e0ff" opacity="1">
        <circle cx="70" cy="30" r="3"/><circle cx="90" cy="50" r="2.5"/><circle cx="85" cy="75" r="2.8"/>
        <circle cx="100" cy="90" r="2.2"/><circle cx="115" cy="55" r="3"/><circle cx="130" cy="40" r="2.5"/>
        <circle cx="120" cy="80" r="2.2"/>
      </g>
      <!-- star glow -->
      <g fill="#90e0ff" opacity="0.15">
        <circle cx="70" cy="30" r="8"/><circle cx="115" cy="55" r="8"/><circle cx="130" cy="40" r="6"/>
      </g>
      <!-- ground -->
      <path d="M0,160 Q50,153 100,157 T200,155 L200,200 L0,200Z" fill="#3a1820" opacity="0.9"/>
      <!-- astronaut -->
      <g transform="translate(100,128) scale(0.72)">
        <ellipse cx="0" cy="-36" rx="14" ry="16" fill="#f0e8d8" opacity="1"/>
        <ellipse cx="0" cy="-36" rx="10" ry="11" fill="#6a2030" opacity="0.5"/>
        <path d="M-13,-18 Q-16,-6 -14,14 L-10,32 Q-8,38 -4,36 L0,14 L4,36 Q8,38 10,32 L14,14 Q16,-6 13,-18Z" fill="#f0e8d8" opacity="1"/>
        <rect x="-9" y="-16" width="18" height="20" rx="3" fill="#d4c0a8" opacity="0.5"/>
        <path d="M-13,-14 Q-22,-4 -20,8" stroke="#f0e8d8" stroke-width="3.5" fill="none" opacity="0.95" stroke-linecap="round"/>
        <path d="M13,-14 Q22,-4 20,8" stroke="#f0e8d8" stroke-width="3.5" fill="none" opacity="0.95" stroke-linecap="round"/>
      </g>`
    ),
  },
  {
    id: 3, label: 'Stardust',
    url: svg(
      grad('s', '#10102a', '#080818') + stars(50, 5),
      // Dancer floating in space — inspired by the cosmic dancer image
      `<!-- glow point below -->
      <circle cx="100" cy="175" r="8" fill="#70a0ff" opacity="0.7"/>
      <circle cx="100" cy="175" r="16" fill="#70a0ff" opacity="0.2"/>
      <circle cx="100" cy="175" r="24" fill="#70a0ff" opacity="0.06"/>
      <!-- figure — dancer silhouette -->
      <g transform="translate(100,100) scale(0.9)" fill="#d0d8f0" opacity="1">
        <!-- head + hat -->
        <ellipse cx="2" cy="-45" rx="8" ry="7"/>
        <path d="M-8,-52 Q2,-58 14,-52 L12,-50 Q2,-54 -6,-50Z" fill="#a0b0d8"/>
        <!-- torso leaning -->
        <path d="M-2,-38 Q-6,-20 -2,-5 L6,-5 Q10,-20 6,-38Z"/>
        <!-- left arm extended -->
        <path d="M-2,-34 Q-20,-42 -32,-36 L-34,-33 Q-20,-38 -4,-30" fill="#a0b0d8"/>
        <!-- right arm extended up -->
        <path d="M6,-34 Q22,-46 30,-52 L32,-49 Q22,-42 8,-30" fill="#a0b0d8"/>
        <!-- left leg -->
        <path d="M-2,-5 Q-10,15 -16,32 L-12,34 Q-8,18 0,-2"/>
        <!-- right leg flowing -->
        <path d="M6,-5 Q14,12 10,32 L14,34 Q18,12 8,-2"/>
        <!-- coat/scarf trail -->
        <path d="M-2,-34 Q-14,-20 -18,0 Q-22,20 -28,35" fill="none" stroke="#8098d0" stroke-width="3.5" opacity="0.5" stroke-linecap="round"/>
      </g>`
    ),
  },
  {
    id: 4, label: 'Pulsar',
    url: svg(
      grad('p', '#102838', '#081820', '#041010') + stars(20, 13),
      // Astronaut with radiating light rays
      `<!-- radiating lines -->
      <g stroke-linecap="round">
        ${Array.from({ length: 24 }, (_, i) => {
          const a = (i * 15) * Math.PI / 180;
          const r1 = 35, r2 = 70 + (i % 3) * 15;
          const c = i % 2 === 0 ? '#20d4e8' : '#f5b020';
          const o = 0.35 + (i % 3) * 0.12;
          return `<line x1="${100 + Math.cos(a) * r1}" y1="${100 + Math.sin(a) * r1}" x2="${100 + Math.cos(a) * r2}" y2="${100 + Math.sin(a) * r2}" stroke="${c}" stroke-width="${1.5 + (i % 2) * 0.8}" opacity="${o}"/>`;
        }).join('')}
      </g>
      <!-- center glow -->
      <circle cx="100" cy="100" r="32" fill="#f6b15e" opacity="0.1"/>
      <!-- astronaut center -->
      <g transform="translate(100,103) scale(0.65)">
        <ellipse cx="0" cy="-36" rx="14" ry="16" fill="#102838" stroke="#f6c060" stroke-width="2.5"/>
        <ellipse cx="-3" cy="-38" rx="3" ry="4" fill="#f6c060" opacity="0.25"/>
        <path d="M-13,-18 Q-16,-6 -14,14 L-10,32 Q-8,38 -4,36 L0,14 L4,36 Q8,38 10,32 L14,14 Q16,-6 13,-18Z" fill="#102838" stroke="#f6c060" stroke-width="2"/>
        <path d="M-13,-14 Q-22,-4 -18,8" stroke="#f6c060" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M13,-14 Q22,-4 18,8" stroke="#f6c060" stroke-width="2" fill="none" stroke-linecap="round"/>
      </g>`
    ),
  },
  {
    id: 5, label: 'Vega',
    url: svg(
      grad('vg', '#122030', '#0a1820', '#061014') + stars(30, 9),
      // Space cowboy on horseback with planet behind — inspired by image 1
      `<!-- large planet behind -->
      <circle cx="100" cy="95" r="58" fill="#d4a860" opacity="0.2"/>
      <circle cx="100" cy="95" r="58" fill="none" stroke="#d4a860" stroke-width="1" opacity="0.4"/>
      <!-- planet surface detail -->
      <circle cx="85" cy="80" r="6" fill="#d4a860" opacity="0.08"/>
      <circle cx="115" cy="100" r="8" fill="#d4a860" opacity="0.06"/>
      <!-- planet ring -->
      <ellipse cx="100" cy="95" rx="82" ry="15" fill="none" stroke="#d4a860" stroke-width="2" opacity="0.35" transform="rotate(-12,100,95)"/>
      <ellipse cx="100" cy="95" rx="88" ry="18" fill="none" stroke="#d4a860" stroke-width="0.8" opacity="0.2" transform="rotate(-12,100,95)"/>
      <!-- ground -->
      <path d="M0,152 Q50,145 100,150 T200,148 L200,200 L0,200Z" fill="#1a1810" opacity="0.8"/>
      <!-- cowboy on horse silhouette -->
      <g transform="translate(105,125) scale(0.58)" fill="#0c0c08">
        <!-- horse body -->
        <ellipse cx="0" cy="0" rx="30" ry="14"/>
        <!-- horse legs -->
        <path d="M-18,12 L-22,35 L-18,35 L-15,14"/>
        <path d="M-8,12 L-10,33 L-6,33 L-5,14"/>
        <path d="M10,12 L8,35 L12,35 L13,14"/>
        <path d="M20,12 L22,33 L26,33 L24,14"/>
        <!-- horse neck + head -->
        <path d="M-22,-8 Q-30,-25 -26,-35 L-20,-38 Q-22,-28 -18,-14"/>
        <path d="M-26,-35 L-32,-38 L-26,-40 L-22,-36"/>
        <!-- horse tail -->
        <path d="M28,-2 Q38,-8 36,-18" stroke="#0c0c08" stroke-width="3" fill="none" stroke-linecap="round"/>
        <!-- rider torso -->
        <path d="M-6,-14 Q-4,-32 -2,-40 L6,-40 Q8,-32 6,-14Z"/>
        <!-- rider head + hat -->
        <circle cx="2" cy="-44" r="6"/>
        <path d="M-8,-50 Q2,-54 12,-50 L10,-48 Q2,-51 -6,-48Z"/>
        <rect x="-3" y="-55" width="10" height="6" rx="2"/>
      </g>
      <!-- warm horizon glow -->
      <ellipse cx="100" cy="152" rx="60" ry="8" fill="#d4a860" opacity="0.08"/>`
    ),
  },
  {
    id: 6, label: 'Quasar',
    url: svg(
      grad('q', '#102838', '#081820', '#041014') + stars(25, 17),
      // Astronaut floating, seen from side/behind, drifting away
      `<!-- distant planet -->
      <circle cx="55" cy="55" r="32" fill="#2a4860" opacity="0.5"/>
      <path d="M23,55 Q55,43 87,55" fill="none" stroke="#3a6880" stroke-width="1.2" opacity="0.6"/>
      <!-- small stars cluster -->
      <g fill="#90e0ff" opacity="0.8">
        <circle cx="145" cy="40" r="2"/><circle cx="155" cy="48" r="1.5"/><circle cx="148" cy="55" r="1.8"/>
      </g>
      <!-- astronaut floating away -->
      <g transform="translate(115,110) rotate(-15) scale(0.8)">
        <!-- tether line -->
        <path d="M-5,35 Q-40,50 -55,70" stroke="#6090b0" stroke-width="1" fill="none" opacity="0.5" stroke-dasharray="3,3"/>
        <!-- helmet -->
        <ellipse cx="0" cy="-32" rx="13" ry="15" fill="#e0e8f0" opacity="1"/>
        <ellipse cx="2" cy="-33" rx="9" ry="10" fill="#102838" opacity="0.55"/>
        <ellipse cx="0" cy="-35" rx="3" ry="4" fill="white" opacity="0.2"/>
        <!-- body -->
        <path d="M-11,-16 Q-13,-4 -11,12 L-7,27 Q-5,31 -3,29 L0,12 L3,29 Q5,31 7,27 L11,12 Q13,-4 11,-16Z" fill="#e0e8f0" opacity="0.95"/>
        <rect x="-7" y="-14" width="14" height="16" rx="3" fill="#b0c4d8" opacity="0.4"/>
        <!-- arms floating -->
        <path d="M-11,-12 Q-19,-16 -21,-10" stroke="#e0e8f0" stroke-width="3.5" fill="none" opacity="0.9" stroke-linecap="round"/>
        <path d="M11,-12 Q17,-18 21,-14" stroke="#e0e8f0" stroke-width="3.5" fill="none" opacity="0.9" stroke-linecap="round"/>
      </g>`
    ),
  },
  {
    id: 7, label: 'Eclipse',
    url: svg(
      `<defs><radialGradient id="e" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#352000"/><stop offset="40%" stop-color="#180e00"/><stop offset="100%" stop-color="#0a0600"/></radialGradient></defs><rect width="200" height="200" fill="url(#e)"/>` + stars(20, 19),
      // Eclipse scene — dark circle with bright golden corona ring, astronaut silhouette in front
      `<!-- outer corona haze -->
      <circle cx="100" cy="85" r="62" fill="#f6b15e" opacity="0.06"/>
      <circle cx="100" cy="85" r="56" fill="#f6b15e" opacity="0.1"/>
      <!-- corona glow rings -->
      <circle cx="100" cy="85" r="42" fill="#f6b15e" opacity="0.18"/>
      <circle cx="100" cy="85" r="44" fill="none" stroke="#f6c060" stroke-width="5" opacity="0.55"/>
      <circle cx="100" cy="85" r="49" fill="none" stroke="#f6b15e" stroke-width="3" opacity="0.35"/>
      <circle cx="100" cy="85" r="54" fill="none" stroke="#f6b15e" stroke-width="2" opacity="0.2"/>
      <circle cx="100" cy="85" r="60" fill="none" stroke="#f6b15e" stroke-width="1" opacity="0.1"/>
      <!-- dark body of eclipse -->
      <circle cx="100" cy="85" r="35" fill="#080500"/>
      <!-- corona light leak at edges -->
      <path d="M60,70 Q53,85 62,100" stroke="#f6c060" stroke-width="2.5" fill="none" opacity="0.6"/>
      <path d="M140,70 Q147,85 138,100" stroke="#f6c060" stroke-width="2.5" fill="none" opacity="0.6"/>
      <!-- top corona flare -->
      <path d="M85,44 Q100,35 115,44" stroke="#f6c060" stroke-width="2" fill="none" opacity="0.45"/>
      <!-- ground with warm tint -->
      <path d="M0,158 Q100,148 200,156 L200,200 L0,200Z" fill="#1a1208" opacity="0.9"/>
      <!-- ground glow from corona -->
      <ellipse cx="100" cy="158" rx="55" ry="8" fill="#f6b15e" opacity="0.1"/>
      <!-- astronaut silhouette looking up -->
      <g transform="translate(100,143) scale(0.52)" fill="#0e0a04">
        <ellipse cx="0" cy="-30" rx="10" ry="12"/>
        <path d="M-10,-16 Q-12,-4 -10,10 L-7,24 Q-5,28 -3,26 L0,10 L3,26 Q5,28 7,24 L10,10 Q12,-4 10,-16Z"/>
        <path d="M-10,-12 Q-16,-18 -14,-24" stroke="#0e0a04" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M10,-12 Q16,-18 14,-24" stroke="#0e0a04" stroke-width="3" fill="none" stroke-linecap="round"/>
      </g>
      <!-- visor reflection of corona -->
      <ellipse cx="100" cy="114" rx="4" ry="4.5" fill="#f6b15e" opacity="0.4"/>
      <!-- helmet edge glow -->
      <ellipse cx="100" cy="115" rx="6" ry="7" fill="none" stroke="#f6b15e" stroke-width="0.8" opacity="0.25"/>`
    ),
  },
];

interface AvatarPickerProps {
  currentAvatarId: number;
  onSelect: (avatarId: number) => void;
  onClose: () => void;
  onLogout?: () => void;
}

export const AvatarPicker: FC<AvatarPickerProps> = ({ currentAvatarId, onSelect, onClose, onLogout }) => {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
        paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '380px',
          background: 'linear-gradient(180deg, rgba(20,21,30,0.98) 0%, rgba(13,14,20,1) 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.07)',
          padding: '1.8rem',
        }}
      >
        <h3 style={{ fontFamily: 'serif', fontStyle: 'italic', color: 'var(--accent-gold)', fontSize: '1.4rem', margin: '0 0 1.4rem', textAlign: 'center' }}>
          Choose Your Avatar
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {AVATARS.map(av => {
            const isSelected = currentAvatarId === av.id;
            return (
              <button
                key={av.id}
                onClick={() => onSelect(av.id)}
                style={{
                  background: isSelected
                    ? 'rgba(246,177,94,0.08)'
                    : 'rgba(255,255,255,0.03)',
                  border: isSelected
                    ? '2px solid var(--accent-gold)'
                    : '2px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px', padding: '6px 4px 5px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? '0 0 20px rgba(246,177,94,0.2)' : 'none',
                }}
              >
                <div style={{
                  width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden',
                  background: '#0a0c14',
                }}>
                  <img src={av.url} alt={av.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <span style={{
                  fontSize: '0.48rem', letterSpacing: '1px', textTransform: 'uppercase',
                  color: isSelected ? 'var(--accent-gold)' : 'rgba(255,255,255,0.3)',
                  fontWeight: 'bold',
                }}>
                  {av.label}
                </span>
              </button>
            );
          })}
        </div>

        {onLogout && (
          <>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '1.4rem 0' }} />
            <button
              onClick={() => { onLogout(); onClose(); }}
              style={{
                width: '100%', padding: '12px', borderRadius: '14px',
                background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.15)',
                color: 'rgba(255,100,100,0.9)', cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,80,80,0.15)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,80,80,0.08)'; }}
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </div>
  );
};
