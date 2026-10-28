import Image from "next/image";

/*
  Benable brand, rebuilt from Figma (Design Labs, Layer_1 15432:53110) so it stays sharp at any size:
  the 2155px gradient tile with the vector "B" on top, and the vector wordmark drawn as a mask so it
  takes the surrounding text colour (white on the dark hero, ink everywhere else).
  Positions are Figma's (229x60 artboard), except the wordmark is centred on the tile.
  The logo is display:block so no text baseline space pushes it off-centre in a bar.
*/

export function BrandIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  // callers may place it absolutely; only fall back to relative so the fill image has a box
  const position = /\b(absolute|fixed)\b/.test(className) ? "" : "relative";
  return (
    <span className={`${position} inline-block shrink-0 overflow-hidden ${className}`} style={{ width: size, height: size, borderRadius: size * 0.2023 }}>
      <Image src="/img/brand/tile.png" alt="" fill sizes={`${Math.ceil(size * 2)}px`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/brand/glyph.svg" alt="" className="absolute block" style={{ left: "26.32%", top: "16.9%", width: "51.02%", height: "65.82%" }} />
    </span>
  );
}

export default function Logo({ className = "", height = 32 }: { className?: string; height?: number }) {
  const u = height / 60;
  return (
    <span className={`relative block shrink-0 ${className}`} style={{ width: 229 * u, height }} role="img" aria-label="Benable">
      <BrandIcon size={height} className="absolute left-0 top-0" />
      <span
        className="absolute bg-current"
        style={{
          left: 82.61 * u,
          top: ((60 - 29.76) / 2) * u, // centred on the tile (Figma sits it ~2px high)
          width: 146.26 * u,
          height: 29.76 * u,
          mask: "url(/img/brand/wordmark.svg) center / contain no-repeat",
          WebkitMask: "url(/img/brand/wordmark.svg) center / contain no-repeat",
        }}
      />
    </span>
  );
}
