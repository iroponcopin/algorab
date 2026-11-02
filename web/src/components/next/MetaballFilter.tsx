/**
 * The liquid-metaball SVG filter shared by every Algorab surface that lets a droplet detach from, or merge into,
 * a body of liquid. Blur the shapes, push the alpha through a steep ramp so the blurred halos fuse into one surface
 * (24x - 11), and composite the crisp source back inside it. Mounted once, in the language layout.
 */
export function MetaballFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute", pointerEvents: "none" }}>
      <defs>
        <filter id="corvus-liquid-metaball" x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}
