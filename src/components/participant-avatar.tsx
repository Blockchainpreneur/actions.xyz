'use client'

import { getGradientForColor } from '@/lib/utils'

interface ParticipantAvatarProps {
  name: string
  initial: string
  colorKey: string
  size?: 'xs' | 'sm' | 'md'
  isAgent?: boolean
  className?: string
}

const SIZE = {
  xs: { outer: 20, font: 8 },
  sm: { outer: 28, font: 11 },
  md: { outer: 36, font: 14 },
}

export function ParticipantAvatar({
  name,
  initial,
  colorKey,
  size = 'sm',
  isAgent = false,
  className = '',
}: ParticipantAvatarProps) {
  const s = SIZE[size]
  const gradient = isAgent
    ? 'linear-gradient(135deg, #0d9488, #06b6d4)'
    : getGradientForColor(colorKey)

  return (
    <div
      title={name}
      className={`flex items-center justify-center rounded-full flex-shrink-0 font-semibold select-none ${className}`}
      style={{
        width: s.outer,
        height: s.outer,
        background: gradient,
        fontSize: s.font,
        color: 'rgba(255,255,255,0.95)',
      }}
    >
      {isAgent ? (
        <svg width={s.font} height={s.font} viewBox="0 0 12 12" fill="none">
          <path
            d="M7 1L3 7h4l-2 4 6-6H7L9 1z"
            fill="rgba(255,255,255,0.92)"
            strokeLinejoin="round"
          />
        </svg>
      ) : initial}
    </div>
  )
}
