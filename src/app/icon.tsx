import { ImageResponse } from 'next/og'

// Favicon, generated from the brand rather than shipped as a binary — so it can never drift
// out of sync with the palette in globals.css.
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#c81e4a',
          color: '#fff',
          fontSize: 21,
          fontWeight: 700,
          borderRadius: 7,
          fontFamily: 'sans-serif',
        }}
      >
        G
      </div>
    ),
    { ...size },
  )
}
