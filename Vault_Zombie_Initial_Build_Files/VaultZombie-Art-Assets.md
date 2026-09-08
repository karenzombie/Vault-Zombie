# VaultZombie Art Assets (Build Reference)

This is the grab-list for vault cover art. Every piece is a flat single-color silhouette, released under CC0 (public domain), so it can be downloaded, modified, recolored, and bundled into the product with no attribution and nothing to track. At build time, pull each asset from the link in its row.

For the artwork policy (who can upload, one image per vault, free vs paid), see the master build brief, section 10. This document is assets only.

## Sources and licenses

All three are blanket CC0. No per-item checking needed.

| Source | License | License reference |
|---|---|---|
| Openclipart | CC0 1.0 public domain | https://openclipart.org/share |
| freesvg.org | CC0 1.0 public domain | https://freesvg.org |
| publicdomainvectors.org | CC0 1.0 public domain | https://publicdomainvectors.org |

Avoid aggregators like SVG Repo unless a specific piece is labeled CC0, since their licenses vary per item.

### Openclipart direct-download patterns (for scripting the grab)

For any Openclipart row, the ID gives you deterministic file URLs:

- SVG: `https://openclipart.org/download/{ID}`
- PNG (800px): `https://openclipart.org/image/800px/{ID}`
- Detail page: `https://openclipart.org/detail/{ID}`

freesvg.org rows link to the piece page, which carries the Download SVG and PNG buttons.

## Build note

On import, normalize every silhouette to one flat token color (strip the source fill, set to a single color variable). That is what lets covers recolor cleanly to each vault's theme, and it erases any small differences between sources so the whole library reads as one set.

## Coverage

Five of the ten vault types have art below: Marriage, Couple, New Baby, Child Growth, and College. Job, Travel, Retirement, New Business, and New Year have none yet. They are sourced the same way, from the same three sources, under the same silhouette-and-recolor rule, and get their own sections here when added.

---

## Marriage / Wedding

Wedding-specific silhouettes. Marriage covers can also draw from the Couple set below.

| Piece | Source | ID | Grab |
|---|---|---|---|
| Wedding rings silhouette | Openclipart | 325166 | [page](https://openclipart.org/detail/325166) |
| Wedding rings silhouette (alt) | Openclipart | 321332 | [page](https://openclipart.org/detail/321332) |
| Bride and groom silhouette | Openclipart | 272133 | [page](https://openclipart.org/detail/272133) |
| Couple silhouette | Openclipart | 329214 | [page](https://openclipart.org/detail/329214) |

## Couple

| Piece | Source | ID | Grab |
|---|---|---|---|
| Couple heart hands silhouette | Openclipart | 241481 | [page](https://openclipart.org/detail/241481) |
| Couple holding hands silhouette | Openclipart | 246170 | [page](https://openclipart.org/detail/246170) |
| Embracing couple silhouette | Openclipart | 237022 | [page](https://openclipart.org/detail/237022) |
| Romantic couple silhouette | Openclipart | 236675 | [page](https://openclipart.org/detail/236675) |
| Couple holding hands, facing away | Openclipart | 313406 | [page](https://openclipart.org/detail/313406) |
| Heart hands silhouette | Openclipart | 275966 | [page](https://openclipart.org/detail/275966) |
| Love hands silhouette | Openclipart | 247240 | [page](https://openclipart.org/detail/247240) |
| Male and female symbols, heart | Openclipart | 271399 | [page](https://openclipart.org/detail/271399) |

## New Baby

| Piece | Source | ID | Grab |
|---|---|---|---|
| Mother and baby silhouette | Openclipart | 252870 | [page](https://openclipart.org/detail/252870) |
| Pregnant woman silhouette with baby | Openclipart | 320352 | [page](https://openclipart.org/detail/320352) |
| Baby silhouette | Openclipart | 28709 | [page](https://openclipart.org/detail/28709) |
| Baby footprints | Openclipart | 211278 | [page](https://openclipart.org/detail/211278) |
| Baby footprints (blue) | Openclipart | 211279 | [page](https://openclipart.org/detail/211279) |

## Child Growth

Child Growth covers can also draw from the New Baby set above for a vault that starts in infancy.

| Piece | Source | ID | Grab |
|---|---|---|---|
| Family with child in the middle | Openclipart | 246645 | [page](https://openclipart.org/detail/246645) |
| Mother and child silhouette | Openclipart | 22579 | [page](https://openclipart.org/detail/22579) |

## College / Graduation

Sourced mostly from freesvg.org, which has the deepest graduation coverage.

| Piece | Source | ID | Grab |
|---|---|---|---|
| Graduating student silhouette | freesvg | n/a | [page](https://freesvg.org/graduate-silhouette) |
| Graduate student silhouette | freesvg | n/a | [page](https://freesvg.org/graduate-student-silhouette) |
| Graduation cap silhouette | freesvg | n/a | [page](https://freesvg.org/graduation-cap-silhouette) |
| Graduation cap and books (mono) | freesvg | n/a | [page](https://freesvg.org/graduation-cap-and-books) |
| Mortar board hat and diploma | freesvg | n/a | [page](https://freesvg.org/mortar-board-hat-and-diploma) |
| College diploma and hat | freesvg | n/a | [page](https://freesvg.org/college-diploma-and-hat) |
| Graduation cap | freesvg | n/a | [page](https://freesvg.org/graduation-cap) |
| Graduation boy silhouette | Openclipart | 247249 | [page](https://openclipart.org/detail/247249) |
| Academic cap (mortarboard) | Openclipart | 202668 | [page](https://openclipart.org/detail/202668) |
| Owl silhouette (scholar motif) | Openclipart | 319745 | [page](https://openclipart.org/detail/319745) |

---

## Expansion

New vault types get their own section here, populated from the same three CC0 sources under the same silhouette-plus-recolor rule. Any existing category can be widened the same way. Keep this document as the single source of truth for where the art comes from.
