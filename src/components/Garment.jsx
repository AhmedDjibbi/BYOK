import { useId } from 'react'

/* ==========================================================================
   BYOC — vector garment mockups for the store grid
   Renders studio-style product shots on a dark gradient backdrop.
   ========================================================================== */

const Logo = ({ x, y, scale = 1, color = '#f2f2f2', opacity = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
    <path
      fill={color}
      d="M0 -34 L8 -12 L22 -24 L16 -6 L36 0 L16 6 L22 24 L8 12 L0 34 L-8 12 L-22 24 L-16 6 L-36 0 L-16 -6 L-22 -24 L-8 -12 Z"
    />
    <path fill={color} d="M0 -18 L4 -4 L18 0 L4 4 L0 18 L-4 4 L-18 0 L-4 -4 Z" opacity={0.55} />
  </g>
)

const Star = ({ x, y, scale = 1, color = '#d02020', opacity = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
    <path
      fill="none"
      stroke={color}
      strokeWidth="4"
      d="M0 -30 L6 -12 L24 -16 L13 -2 L22 14 L4 10 L-4 28 L-10 10 L-28 14 L-19 -4 L-28 -18 L-9 -13 Z"
    />
  </g>
)

const Wordmark = ({ x, y, scale = 1, color = '#111', text = 'BYOC', opacity = 1 }) => (
  <text
    x={x}
    y={y}
    fill={color}
    opacity={opacity}
    textAnchor="middle"
    fontFamily="'Ethnocentric', 'Barlow Condensed', sans-serif"
    fontSize={26}
    letterSpacing="2"
    transform={`translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`}
  >
    {text}
  </text>
)

const Shade = ({ id, from, to }) => (
  <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stopColor={from} />
    <stop offset="55%" stopColor={to} />
    <stop offset="100%" stopColor={from} />
  </linearGradient>
)

function Tee({ uid, body, trim, print, back }) {
  return (
    <g>
      <path
        fill={`url(#${uid}-fabric)`}
        d="M142 58 L104 80 L48 132 L92 194 L124 170 L124 404 Q200 416 276 404 L276 170 L308 194 L352 132 L296 80 L258 58 Q200 106 142 58 Z"
      />
      <path fill="#000" opacity="0.18" d="M124 170 L124 404 Q200 416 276 404 L276 170 L258 58 Q200 106 142 58 Z" />
      <path fill="none" stroke={trim} strokeWidth="3" opacity="0.55" d="M142 58 Q200 106 258 58" />
      <path fill="none" stroke="#000" strokeWidth="2" opacity="0.35" d="M104 80 L124 170 M296 80 L276 170" />
      {!back && print === 'logo' && <Logo x={200} y={214} scale={1.25} color="#f4f4f4" />}
      {!back && print === 'star' && <Star x={200} y={210} scale={1.15} color="#d02020" />}
      {!back && print === 'word' && <Wordmark x={200} y={220} color="#141414" text="BYOC" />}
      {!back && print === 'brand' && (
        <Wordmark x={200} y={220} color="#f2f2f2" text="BYOC" scale={0.55} />
      )}
      {!back && print === 'word-light' && <Wordmark x={200} y={220} color="#dcdcdc" text="NEXORA" />}
      {back && print === 'logo' && <Logo x={200} y={210} scale={1.55} color="#f4f4f4" />}
      <ellipse cx="200" cy="418" rx="96" ry="10" fill="#000" opacity="0.35" />
    </g>
  )
}

function Hoodie({ uid, body, trim, print, back }) {
  return (
    <g>
      <path fill={`url(#${uid}-fabric)`} d="M140 78 Q120 26 200 26 Q280 26 260 78 L300 96 L356 150 L312 202 L284 178 L284 400 Q200 414 116 400 L116 178 L88 202 L44 150 L100 96 Z" />
      <path fill="#000" opacity="0.22" d="M116 178 L116 400 Q200 414 284 400 L284 178 L260 78 Q200 110 140 78 Z" />
      <path fill="#000" opacity="0.45" d="M140 78 Q120 26 200 26 Q280 26 260 78 Q200 110 140 78 Z" />
      <path fill="none" stroke={trim} strokeWidth="3" opacity="0.5" d="M140 78 Q200 110 260 78" />
      <path fill="none" stroke={trim} strokeWidth="2.4" opacity="0.4" d="M172 96 L166 160 M228 96 L234 160" />
      {!back && (
        <path
          fill="none"
          stroke={trim}
          strokeWidth="3"
          opacity="0.35"
          d="M140 286 L260 286 L252 340 L148 340 Z"
        />
      )}
      <path fill="none" stroke="#000" strokeWidth="2" opacity="0.3" d="M100 96 L116 178 M300 96 L284 178" />
      {!back && print === 'word' && <Wordmark x={200} y={186} color="#141414" text="NEXORA" />}
      {!back && print === 'logo' && <Logo x={200} y={200} scale={1.15} color="#f4f4f4" />}
      {back && print === 'logo' && <Logo x={200} y={200} scale={1.7} color="#f4f4f4" />}
      <ellipse cx="200" cy="414" rx="100" ry="10" fill="#000" opacity="0.35" />
    </g>
  )
}

function CargoPants({ uid, body, trim, print }) {
  return (
    <g>
      <path
        fill={`url(#${uid}-fabric)`}
        d="M124 48 L276 48 L286 156 L276 404 L214 404 L200 232 L186 404 L124 404 L114 156 Z"
      />
      <path fill="#000" opacity="0.2" d="M200 88 L286 92 L276 404 L214 404 L200 232 Z" />
      <rect x="124" y="48" width="152" height="30" fill={trim} opacity="0.55" />
      <path fill="none" stroke="#000" strokeWidth="2.4" opacity="0.4" d="M200 78 L200 232" />
      <path
        fill="none"
        stroke={trim}
        strokeWidth="3"
        opacity="0.5"
        d="M126 180 L176 180 L174 236 L128 236 Z M274 180 L224 180 L226 236 L272 236 Z"
      />
      <path fill="none" stroke="#000" strokeWidth="2" opacity="0.35" d="M114 156 L124 404 M286 156 L276 404" />
      {print === 'logo' && <Logo x={200} y={132} scale={0.5} color="#e8e8e8" opacity={0.85} />}
      <ellipse cx="200" cy="414" rx="92" ry="10" fill="#000" opacity="0.35" />
    </g>
  )
}

function Puffer({ uid, body, trim }) {
  return (
    <g>
      <path
        fill={`url(#${uid}-fabric)`}
        d="M136 74 L100 94 L46 152 L90 210 L120 184 L120 396 Q200 408 280 396 L280 184 L310 210 L354 152 L300 94 L264 74 Q200 108 136 74 Z"
      />
      <path fill="#000" opacity="0.22" d="M120 184 L120 396 Q200 408 280 396 L280 184 L264 74 Q200 108 136 74 Z" />
      <path fill="#000" opacity="0.5" d="M136 74 Q124 30 200 30 Q276 30 264 74 Q200 108 136 74 Z" />
      <path fill="none" stroke={trim} strokeWidth="4" opacity="0.5" d="M200 82 L200 400" />
      {[130, 176, 222, 268, 314, 358].map((y) => (
        <path key={y} fill="none" stroke="#000" strokeWidth="2.4" opacity="0.4" d={`M120 ${y} Q200 ${y + 10} 280 ${y}`} />
      ))}
      <path fill="none" stroke={trim} strokeWidth="2.4" opacity="0.35" d="M100 94 L120 184 M300 94 L280 184" />
      <ellipse cx="200" cy="410" rx="98" ry="10" fill="#000" opacity="0.35" />
    </g>
  )
}

function TrackJacket({ uid, body, trim }) {
  return (
    <g>
      <path
        fill={`url(#${uid}-fabric)`}
        d="M138 72 L98 96 L44 158 L88 214 L120 186 L120 398 Q200 410 280 398 L280 186 L312 214 L356 158 L302 96 L262 72 Q200 104 138 72 Z"
      />
      <path fill="#000" opacity="0.2" d="M120 186 L120 398 Q200 410 280 398 L280 186 L262 72 Q200 104 138 72 Z" />
      <path fill="#000" opacity="0.45" d="M138 72 Q126 34 200 34 Q274 34 262 72 Q200 104 138 72 Z" />
      <path fill="none" stroke={trim} strokeWidth="3.4" opacity="0.85" d="M200 80 L200 400" />
      <path fill="none" stroke={trim} strokeWidth="2.4" opacity="0.5" d="M138 72 Q200 104 262 72" />
      <path
        fill="none"
        stroke={trim}
        strokeWidth="2.6"
        opacity="0.4"
        d="M104 100 L74 150 L96 178 M296 100 L326 150 L304 178"
      />
      <path fill="none" stroke={trim} strokeWidth="3" opacity="0.6" d="M120 372 L120 398 M280 372 L280 398" />
      <Logo x={200} y={190} scale={0.6} color="#f0f0f0" opacity={0.9} />
      <ellipse cx="200" cy="410" rx="98" ry="10" fill="#000" opacity="0.35" />
    </g>
  )
}

function Cap({ uid, trim, print }) {
  return (
    <g>
      <path
        fill={`url(#${uid}-fabric)`}
        d="M92 232 Q103 101 200 92 Q297 101 308 232 L92 232 Z"
      />
      <path fill="#000" opacity="0.22" d="M200 100 Q286 110 301 220 L200 220 Z" />
      <path fill={trim} opacity="0.65" d="M92 226 Q200 206 308 226 L348 255 Q200 282 52 255 Z" />
      <path fill="none" stroke="#000" strokeWidth="3" opacity="0.4" d="M200 98 L200 218 M96 230 Q200 210 304 230" />
      {print === 'logo' && <Logo x={200} y={174} scale={0.55} color="#f4f4f4" />}
      <ellipse cx="200" cy="292" rx="120" ry="12" fill="#000" opacity="0.3" />
    </g>
  )
}

function CrossbodyBag({ uid, trim, print }) {
  return (
    <g>
      <path fill="none" stroke={trim} strokeWidth="13" d="M122 178 Q200 18 278 178" />
      <path fill={`url(#${uid}-fabric)`} d="M98 170 Q200 144 302 170 L286 360 Q200 384 114 360 Z" />
      <path fill="#000" opacity="0.22" d="M200 160 Q256 160 296 171 L282 356 L200 372 Z" />
      <path fill="none" stroke={trim} strokeWidth="4" opacity="0.6" d="M100 222 Q200 198 300 222 M130 174 L140 350 M270 174 L260 350" />
      <rect x="174" y="232" width="52" height="8" rx="4" fill={trim} opacity="0.75" />
      {print === 'brand' && <Wordmark x={200} y={288} color="#f2f2f2" scale={0.55} />}
      <ellipse cx="200" cy="390" rx="110" ry="12" fill="#000" opacity="0.3" />
    </g>
  )
}

const GARMENTS = {
  tee: Tee,
  hoodie: Hoodie,
  pants: CargoPants,
  puffer: Puffer,
  jacket: TrackJacket,
  cap: Cap,
  bag: CrossbodyBag,
}

export default function Garment({ type = 'tee', body = '#161616', trim = '#e6e6e6', print = null, back = false }) {
  const uid = useId().replace(/:/g, '')
  const Component = GARMENTS[type] ?? Tee

  return (
    <svg className="garment" viewBox="0 0 400 440" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <Shade id={`${uid}-fabric`} from={body} to={trim} />
        <radialGradient id={`${uid}-vig`} cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="400" height="440" fill={`url(#${uid}-vig)`} />
      <Component uid={uid} body={body} trim={trim} print={print} back={back} />
    </svg>
  )
}
