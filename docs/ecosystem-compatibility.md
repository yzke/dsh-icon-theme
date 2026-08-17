# Ecosystem compatibility fixtures

Research date: 2026-08-17. Star counts are snapshots used only to choose representative projects; runtime behavior never depends on GitHub metadata or network access.

| Project | Stars | Pinned revision | Observed contribution | Expected behavior |
| --- | ---: | --- | --- | --- |
| [dsh-full-remote](https://github.com/JUANWANG-BUAA/dsh-full-remote) | 10 | [`88a34f7`](https://github.com/JUANWANG-BUAA/dsh-full-remote/commit/88a34f79f9cee34715d91bb661ec244571bace41) | `settings.section`, id `reverse-proxy`, order 30 | Discover generically; preserve an original icon, or use the Settings gear if none exists; allow manual override. |
| [dsh-context](https://github.com/bowenliang123/dsh-context) | 107 | [`a4deb93`](https://github.com/bowenliang123/dsh-context/commit/a4deb93e21104be439b8ca789c38445d37cabd4f) | `conversation.view`, id `context` | Outside this plugin's two surfaces; never misidentify it. |
| [dsh-openpencil](https://github.com/ZSeven-W/dsh-openpencil) | 99 | [`5cfadc5`](https://github.com/ZSeven-W/dsh-openpencil/commit/5cfadc511f08dbc5c09f76e6943b709e846d1cae) | `conversation.input.dock`, id `openpencil-selection` | Outside scope; never misidentify it. |
| [dsh-approve-for-me](https://github.com/timeance/dsh-approve-for-me) | 9 | [`b22695d`](https://github.com/timeance/dsh-approve-for-me/commit/b22695df059185f2591c122473c33822c40a9a4e) | `settings.plugin.item`, id `approve-for-me` | A plugin-management item, not a Settings navigation section. |
| [dsh-composer-polish](https://github.com/tianji-qingtian/dsh-composer-polish) | 11 | [`ce4daad`](https://github.com/tianji-qingtian/dsh-composer-polish/commit/ce4daad54dcd174f5fb43a1bb290a29bb1ceec4f) | `conversation.input.right`, id `composer-polish` | Outside scope; never misidentify it. |

The machine-readable test fixture records each exact source path, Git blob SHA, immutable raw URL, and registration excerpt from these pinned revisions. None of the projects is required or installed by the test. This deliberately exercises the public slot contract rather than adapting to one local profile.
