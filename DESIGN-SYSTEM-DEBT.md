# Design-system debt — known violations

> Files that violate the explicit rules in `tokens.css`. Each entry needs a designer pass to replace gradients with solid fills + hard-offset shadows. `./lint-design-system.sh` will keep failing until these are reconciled.

## Gradient violations (12 files)

The system bans `linear-gradient` and `radial-gradient` on components. Each file below uses one of these for a section background, hero wash, or feature panel. Replacement strategy: solid fill in `--g-100` / `--g-200` / `--paper`, with the visual interest carried by the existing `1px var(--line)` borders and the hard-offset hover shadow pattern.

| File | Likely use | Suggested replacement |
|---|---|---|
| `brand-guidelines.html` | Brand swatch washes | Solid fills per swatch, no fade |
| `brand-kit.html` | Template preview panels | Solid `--paper-soft` panels |
| `ci-cd-best-practices.html` | Topic-page hero | Solid `--g-100` with grid line via `repeating-linear-gradient` (allowed) |
| `contact.html` | Form section bg | Solid `--paper-soft` |
| `devops-hub.html` | Topic-page hero | Same as ci-cd above |
| `free-ebooks.html` | Lead-cap hero | Solid `--ink` band with cream text |
| `kubernetes-guide.html` | Topic-page hero | Same pattern |
| `platform-engineering-hub.html` | Topic-page hero | Same pattern |
| `services.html` | Service-tile hover state | Solid hover bg + offset shadow |
| `states.html` | Empty/error illustration bg | Solid `--g-100` |
| `styleguide.html` | Component documentation backgrounds | Solid swatches (it's the styleguide — must comply) |
| `what-is-devops.html` | Topic-page hero | Same pattern |

## How to fix one file

1. Open the file
2. Search for `linear-gradient` or `radial-gradient`
3. For each match: identify the visual intent (band, hero wash, hover state, illustration bg)
4. Replace with the closest solid colour from `tokens.css` palette
5. If the gradient was conveying state (e.g. light → dark for a CTA), use the hard-offset shadow pattern instead
6. Run `./lint-design-system.sh` to verify

## Don't fix

These uses are explicitly permitted and should not be flagged:

- `repeating-linear-gradient(...)` for **grid washes** on body backgrounds (the brand identity)
- `border-radius: 9999px` for **status pills**
- `border-radius: 50%` for **status dots** (small circular indicators ≤8px)
- `backdrop-filter: blur(...)` on the **homepage nav only** (`.nav` in `index.html`)

## Process

When introducing new gradients during page work:

1. Run `./lint-design-system.sh` before commit
2. If you genuinely need a gradient, raise it in design review — there may be a system-level pattern we add for it
3. Don't suppress the linter for a single page — fix or escalate

---

Last audit: 2026-04-27.
