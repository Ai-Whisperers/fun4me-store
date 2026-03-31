'use client'

import { CommandPalette, useCommandPalette } from './command-palette'

interface CommandPaletteProviderProps {
  children: React.ReactNode
}

export function CommandPaletteProvider({
  children,
}: CommandPaletteProviderProps): React.ReactElement {
  const { isOpen, close } = useCommandPalette()

  return (
    <>
      {children}
      <CommandPalette isOpen={isOpen} onClose={close} />
    </>
  )
}
