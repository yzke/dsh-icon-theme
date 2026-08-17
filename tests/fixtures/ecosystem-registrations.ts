export interface PinnedRegistrationFixture {
  project: string
  commit: string
  sourcePath: string
  sourceUrl: string
  sourceBlobSha: string
  surface: string
  id: string
  order: number
  label: string
  sourceExcerpt: string
}

export const PINNED_REGISTRATIONS: readonly PinnedRegistrationFixture[] = [
  {
    project: 'JUANWANG-BUAA/dsh-full-remote',
    commit: '88a34f79f9cee34715d91bb661ec244571bace41',
    sourcePath: 'src/client/index.ts',
    sourceUrl: 'https://raw.githubusercontent.com/JUANWANG-BUAA/dsh-full-remote/88a34f79f9cee34715d91bb661ec244571bace41/src/client/index.ts',
    sourceBlobSha: 'db26581b618def25ac379b5dc8b8e897873f1eb0',
    surface: 'settings.section',
    id: 'reverse-proxy',
    order: 30,
    label: 'Reverse Proxy',
    sourceExcerpt: "{ name: 'settings.section', id: 'reverse-proxy', order: 30, label: () => t('action.label') }",
  },
  {
    project: 'bowenliang123/dsh-context',
    commit: 'a4deb93e21104be439b8ca789c38445d37cabd4f',
    sourcePath: 'src/client/index.ts',
    sourceUrl: 'https://raw.githubusercontent.com/bowenliang123/dsh-context/a4deb93e21104be439b8ca789c38445d37cabd4f/src/client/index.ts',
    sourceBlobSha: '776dd364f16f256cfc8c1bd96cd2423467a244d0',
    surface: 'conversation.view',
    id: 'context',
    order: 20,
    label: 'Context',
    sourceExcerpt: "{ name: 'conversation.view', id: 'context', order: 20, locale: NS, label: () => t('tab') }",
  },
  {
    project: 'ZSeven-W/dsh-openpencil',
    commit: '5cfadc511f08dbc5c09f76e6943b709e846d1cae',
    sourcePath: 'src/client/index.tsx',
    sourceUrl: 'https://raw.githubusercontent.com/ZSeven-W/dsh-openpencil/5cfadc511f08dbc5c09f76e6943b709e846d1cae/src/client/index.tsx',
    sourceBlobSha: 'f9e13259ad55994b84668e0f5ee4edfa557fa8c2',
    surface: 'conversation.input.dock',
    id: 'openpencil-selection',
    order: 30,
    label: 'OpenPencil',
    sourceExcerpt: "{ name: 'conversation.input.dock', id: 'openpencil-selection', order: 30 }",
  },
  {
    project: 'timeance/dsh-approve-for-me',
    commit: 'b22695df059185f2591c122473c33822c40a9a4e',
    sourcePath: 'src/client/index.ts',
    sourceUrl: 'https://raw.githubusercontent.com/timeance/dsh-approve-for-me/b22695df059185f2591c122473c33822c40a9a4e/src/client/index.ts',
    sourceBlobSha: '815c226a6f6d46e652a0376b3b7db389b3c64351',
    surface: 'settings.plugin.item',
    id: 'approve-for-me',
    order: 20,
    label: 'Approve for me',
    sourceExcerpt: "{ name: 'settings.plugin.item', id: 'approve-for-me', order: 20, locale: LOCALE_NS }",
  },
  {
    project: 'tianji-qingtian/dsh-composer-polish',
    commit: 'ce4daad54dcd174f5fb43a1bb290a29bb1ceec4f',
    sourcePath: 'src/client/index.js',
    sourceUrl: 'https://raw.githubusercontent.com/tianji-qingtian/dsh-composer-polish/ce4daad54dcd174f5fb43a1bb290a29bb1ceec4f/src/client/index.js',
    sourceBlobSha: '42c862edcb5d9f91bae35ffbe460733009eb2197',
    surface: 'conversation.input.right',
    id: 'composer-polish',
    order: 100,
    label: 'Polish draft',
    sourceExcerpt: "{ name: 'conversation.input.right', id: 'composer-polish', order: 100, label: 'Polish draft' }",
  },
]
