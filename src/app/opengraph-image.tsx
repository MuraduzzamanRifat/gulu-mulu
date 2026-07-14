import { ImageResponse } from 'next/og'

// The social card. In Bangladesh, e-commerce spreads through Facebook and WhatsApp shares —
// a link with no OG image renders as a grey box and gets scrolled past. Generated at build
// time, so there is no asset to keep in sync with the brand.
export const alt = 'Gulu Mulu — Bangladesh’s multi-vendor marketplace'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #7f1d2e 0%, #c81e4a 55%, #e8434f 100%)',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: 30,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: 0.85,
          }}
        >
          Bangladesh
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 116,
            fontWeight: 800,
            lineHeight: 1.05,
            marginTop: 12,
            letterSpacing: '-0.03em',
          }}
        >
          Gulu Mulu
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 40,
            marginTop: 20,
            opacity: 0.92,
            maxWidth: 880,
            lineHeight: 1.3,
          }}
        >
          Fashion, beauty &amp; lifestyle from hundreds of sellers.
        </div>

        <div style={{ display: 'flex', gap: '14px', marginTop: 48, flexWrap: 'wrap' }}>
          {['Cash on Delivery', 'Delivery within 48hrs', 'Easy Returns'].map((chip) => (
            <div
              key={chip}
              style={{
                display: 'flex',
                fontSize: 27,
                padding: '13px 26px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.16)',
                border: '1px solid rgba(255,255,255,0.32)',
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  )
}
