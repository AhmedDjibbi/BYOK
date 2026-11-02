const Svg = ({ children, size = 20, strokeWidth = 1.6, ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    {children}
  </svg>
)

export const Search = (props) => (
  <Svg {...props}>
    <circle cx="11" cy="11" r="6.7" />
    <path d="m16 16 4.2 4.2" />
  </Svg>
)

export const Heart = ({ filled = false, size = 20, ...rest }) => (
  <Svg size={size} fill={filled ? 'currentColor' : 'none'} {...rest}>
    <path d="M12 20.2c-.3 0-8.1-4.7-8.1-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 8.1 2.6c0 5.3-7.8 10-8.1 10Z" />
  </Svg>
)

export const User = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="8" r="3.7" />
    <path d="M4.9 20c.6-3.7 3.5-5.7 7.1-5.7s6.5 2 7.1 5.7" />
  </Svg>
)

export const Cart = (props) => (
  <Svg {...props}>
    <path d="M2.8 3.6h2.4l2.6 11.1a1.6 1.6 0 0 0 1.6 1.2h8.1a1.6 1.6 0 0 0 1.6-1.2L21.1 7H5.8" />
    <circle cx="9.2" cy="20" r="1.3" />
    <circle cx="18" cy="20" r="1.3" />
  </Svg>
)

export const ChevronDown = (props) => (
  <Svg {...props}>
    <path d="m6 9.5 6 6 6-6" />
  </Svg>
)

export const ChevronUp = (props) => (
  <Svg {...props}>
    <path d="m6 14.5 6-6 6 6" />
  </Svg>
)

export const ChevronLeft = (props) => (
  <Svg {...props}>
    <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
  </Svg>
)

export const ChevronRight = (props) => (
  <Svg {...props}>
    <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
  </Svg>
)

export const ArrowRight = (props) => (
  <Svg {...props}>
    <path d="M3.5 12h16" />
    <path d="m13.8 6.3 5.7 5.7-5.7 5.7" />
  </Svg>
)

export const ArrowUpRight = (props) => (
  <Svg {...props}>
    <path d="M6 18 18 6" />
    <path d="M8.5 6H18v9.5" />
  </Svg>
)

export const Play = ({ size = 12, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
    <path d="M9 6.8v10.4L17 12 9 6.8Z" />
  </svg>
)

export const Envelope = (props) => (
  <Svg {...props}>
    <rect x="2.7" y="5.2" width="18.6" height="13.6" rx="1.4" />
    <path d="m3.4 6.8 8.6 6.5 8.6-6.5" />
  </Svg>
)

export const Truck = (props) => (
  <Svg {...props}>
    <path d="M2.4 6.2h11v9.4h-11z" />
    <path d="M13.4 9.4h3.7l3 3.3v2.9h-6.7z" />
    <circle cx="6.4" cy="17.5" r="1.6" />
    <circle cx="17" cy="17.5" r="1.6" />
  </Svg>
)

export const Instagram = (props) => (
  <Svg {...props}>
    <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.1" cy="6.9" r="0.9" fill="currentColor" stroke="none" />
  </Svg>
)

export const TikTok = ({ size = 16, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
    <path d="M16.6 3h-2.9v11.4a2.4 2.4 0 1 1-2.1-2.4V9.3a5.2 5.2 0 1 0 4.9 5.2V8.9c.9.6 2 1 3.2 1V7c-1.8 0-3.1-1.4-3.1-3.1V3Z" />
  </svg>
)

export const YouTube = (props) => (
  <Svg {...props}>
    <rect x="2.6" y="5.6" width="18.8" height="12.8" rx="4" />
    <path d="m10.4 9.2 4.9 2.8-4.9 2.8z" fill="currentColor" stroke="none" />
  </Svg>
)

export const XLogo = ({ size = 15, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
    <path d="M17.7 3H21l-7.2 8.2L22 21h-6.1l-4.8-6.2L5.5 21H2.2l7.7-8.8L2 3h6.2l4.3 5.7L17.7 3Zm-1 16.2h1.8L7.4 4.7H5.5l11.2 14.5Z" />
  </svg>
)

export const Menu = (props) => (
  <Svg {...props}>
    <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
  </Svg>
)

export const SlidersHorizontal = ({ size = 20, ...rest }) => (
  <Svg size={size} strokeWidth={1.7} {...rest}>
    <path d="M4 8h6M14 8h6M4 16h10M18 16h2" />
    <circle cx="12" cy="8" r="2.1" />
    <circle cx="16" cy="16" r="2.1" />
  </Svg>
)

export const RotateCcw = ({ size = 20, ...rest }) => (
  <Svg size={size} strokeWidth={1.7} {...rest}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3.5 4.5V10H9" />
  </Svg>
)

export const Diamond = (props) => (
  <Svg {...props}>
    <path d="M6.2 3.4h11.6L21.5 9 12 20.8 2.5 9l3.7-5.6Z" />
    <path d="M2.5 9h19M8.4 9 12 20.8 15.6 9M8.2 3.5 6.3 9l5.7 11.8L17.7 9l-1.9-5.5" />
  </Svg>
)

export const Bolt = ({ size = 20, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
    <path d="M13.6 2 5.2 13.1h5.2L9.4 22l9-11.6h-5.3L13.6 2Z" />
  </svg>
)

export const Community = ({ size = 20, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
    <circle cx="12" cy="7.4" r="3.3" />
    <circle cx="4.7" cy="9.6" r="2.2" />
    <circle cx="19.3" cy="9.6" r="2.2" />
    <path d="M12 12.2c3.2 0 5.6 2 6 5.1.1.7-.4 1.3-1.1 1.3H7.1c-.7 0-1.2-.6-1.1-1.3.4-3.1 2.8-5.1 6-5.1Z" />
    <path d="M4.2 13.4c1 0 1.9.2 2.6.7-.8 1-1.3 2.2-1.5 3.5H2.1c-.6 0-1.1-.5-1-1.1.3-1.8 1.5-3.1 3.1-3.1Z" />
    <path d="M19.8 13.4c1.6 0 2.8 1.3 3.1 3.1.1.6-.4 1.1-1 1.1h-3.2c-.2-1.3-.7-2.5-1.5-3.5.7-.5 1.6-.7 2.6-.7Z" />
  </svg>
)

export const Globe = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="9.2" />
    <path d="M2.8 12h18.4" />
    <path d="M12 2.8c2.7 2.6 4.1 5.8 4.1 9.2s-1.4 6.6-4.1 9.2c-2.7-2.6-4.1-5.8-4.1-9.2S9.3 5.4 12 2.8Z" />
  </Svg>
)

export const Crown = ({ size = 20, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
    <path d="M3 8.2 7.1 12 12 5.4 16.9 12 21 8.2l-1.5 9.4H4.5L3 8.2Z" />
    <path d="M4.5 20.4h15" />
  </svg>
)

export const Close = (props) => (
  <Svg {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)

export const Plus = (props) => (
  <Svg {...props}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const Minus = (props) => (
  <Svg {...props}>
    <path d="M5 12h14" />
  </Svg>
)

export const Trash = (props) => (
  <Svg {...props}>
    <path d="M4.5 7h15M9 7V4.5h6V7m3.5 0-.8 13h-11L5.9 7M10 10v6m4-6v6" />
  </Svg>
)
