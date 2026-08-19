/** Keep applied glyphs across a short DOM/ledger mismatch, then give up. */
export const MISMATCH_HOLD_MS = 50
export const MISMATCH_HOLD_TRIES = 8

export function createMismatchHold(resync: () => void): {
  reset: () => void
  hold: (hasLiveWork: boolean) => boolean
  dispose: () => void
} {
  let tries = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  const cancel = (): void => {
    if (timer === null) return
    clearTimeout(timer)
    timer = null
  }

  return {
    reset(): void {
      tries = 0
      cancel()
    },
    /** True = caller must keep existing work and wait for the next scan. */
    hold(hasLiveWork: boolean): boolean {
      if (!hasLiveWork) {
        tries = 0
        cancel()
        return false
      }
      if (tries >= MISMATCH_HOLD_TRIES) {
        tries = 0
        cancel()
        return false
      }
      tries += 1
      cancel()
      timer = setTimeout(() => {
        timer = null
        resync()
      }, MISMATCH_HOLD_MS)
      return true
    },
    dispose(): void {
      tries = 0
      cancel()
    },
  }
}
