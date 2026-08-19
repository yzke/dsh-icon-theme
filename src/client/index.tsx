import { createElement as h } from 'react'
import { IconThemeSection } from './IconThemeSection.tsx'
import { en, zh, type Translate } from './locales.ts'
import { createIconThemeStore, type SettingsScopeLike, type SlotLedgerLike } from './store.ts'
import { createHostSettingsScope } from './host-settings.ts'
import { mountSettingsAdapter } from './dom/settings-adapter.ts'
import { mountSidebarAdapter } from './dom/sidebar-adapter.ts'
import { installStyles } from './styles.ts'
import type { DetectedTarget, IconEvidence } from './types.ts'

const NS = 'dsh-icon-theme'

interface LocaleServiceLike {
  register: (namespace: string, dictionaries: { zh: typeof zh; en: typeof en }) => unknown
  bind: (namespace: string) => Translate
  subscribe: (listener: () => void) => () => void
}

interface SlotsServiceLike extends SlotLedgerLike {
  inject: (name: string, register: () => unknown) => void
  register: (options: Record<string, unknown>, component: (props: unknown) => unknown) => unknown
}

interface IconThemeClientContext {
  effect: (callback: () => unknown, label?: string) => void
  locale: LocaleServiceLike
  slots: SlotsServiceLike
  on?: (event: string, listener: () => void) => () => void
}

export const name = 'dsh-icon-theme'
export const inject = ['slots', 'locale']

export function apply(ctx: IconThemeClientContext): void {
  install(ctx, createHostSettingsScope())
}

/** Deterministic test harness entry; the DSH loader calls {@link apply}. */
export function applyWithSettings(ctx: IconThemeClientContext, scope: SettingsScopeLike): void {
  install(ctx, scope)
}

function install(ctx: IconThemeClientContext, scope: SettingsScopeLike): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-icon-theme: dictionaries')
  const t = ctx.locale.bind(NS)
  const store = createIconThemeStore(scope, ctx.slots)
  ctx.effect(() => () => store.dispose(), 'dsh-icon-theme: store')
  ctx.effect(() => ctx.locale.subscribe(store.refresh), 'dsh-icon-theme: locale refresh')
  ctx.effect(installStyles, 'dsh-icon-theme: styles')

  const resolve = (target: DetectedTarget, evidence: IconEvidence) => {
    const snapshot = store.getSnapshot()
    return importResolve(target, snapshot.config, evidence)
  }
  const adapterOptions = {
    getTargets: () => store.getSnapshot().targets,
    resolve,
    subscribe: store.subscribe,
    onReport: store.setAdapterReport,
  }
  ctx.effect(() => mountSettingsAdapter(adapterOptions), 'dsh-icon-theme: settings adapter')
  ctx.effect(() => mountSidebarAdapter(adapterOptions), 'dsh-icon-theme: sidebar adapter')
  if (typeof ctx.on === 'function') {
    ctx.effect(() => ctx.on!('connection/reset', () => {
      void Promise.resolve(scope.reload?.()).finally(() => store.refresh())
    }), 'dsh-icon-theme: reconnect')
  }

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'icon-theme',
    order: 110,
    label: () => t('nav'),
    locale: NS,
    inject: () => ({ store, t }),
  }, () => h(IconThemeSection, { store, t })))
}

import { resolveIcon as importResolve } from './resolve.ts'
