// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { installStyles } from '../src/client/styles.ts'

afterEach(() => { document.head.querySelectorAll('[data-plugin="dsh-icon-theme"]').forEach(node => node.remove()) })

describe('installStyles', () => {
  it('keeps shared styles until the last overlapping plugin instance disposes', () => {
    const disposeFirst = installStyles()
    const disposeSecond = installStyles()
    expect(document.head.querySelectorAll('[data-plugin="dsh-icon-theme"]')).toHaveLength(1)
    disposeFirst()
    expect(document.head.querySelector('[data-plugin="dsh-icon-theme"]')).not.toBeNull()
    disposeSecond()
    expect(document.head.querySelector('[data-plugin="dsh-icon-theme"]')).toBeNull()
  })
})
