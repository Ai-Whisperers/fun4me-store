import Image from 'next/image'
import { cn } from '@/lib/utils'

interface VeticLogoProps {
  className?: string
  size?: number
}

export function VeticLogo({ className, size = 32 }: VeticLogoProps) {
  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <Image
        src="/Vetic_Logo.png"
        alt="Vetic Logo"
        fill
        sizes={`${size}px`}
        className="object-contain"
        priority
      />
    </div>
  )
}
