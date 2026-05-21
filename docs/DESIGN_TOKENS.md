# Design tokens

The visual reference is **`hearth-mockup.html`** (open it in a browser). The mockup uses the working title "Hearth" — production code uses "Saké" everywhere instead.

Design language: warm editorial cookbook. Cream paper background, terracotta as the primary accent, olive for confirms, honey for highlights. Display type uses Fraunces (serif with optical sizing); body uses DM Sans. Generous whitespace, soft borders, dashed dividers, big emoji as visual anchors instead of photos.

## CSS variables

Drop these into `app/globals.css` under a single `:root` block. They're already used throughout the mockup — keep names identical.

```css
:root {
  /* surfaces */
  --bg:          #F5EFE4;     /* page */
  --bg-paper:    #FAF5EB;     /* sunken / subtle */
  --bg-card:     #FFFFFF;     /* cards */

  /* ink */
  --ink:         #1F1814;
  --ink-soft:    #6B5D4F;

  /* lines */
  --line:        #E5DCC8;
  --line-soft:   #EFE7D6;

  /* accents */
  --terracotta:      #C8552C;
  --terracotta-soft: #F2D9CC;
  --olive:           #4A5D3A;
  --olive-soft:      #DCE3D2;
  --honey:           #D9A441;
  --honey-soft:      #F5E5C2;
  --rose:            #D17A6A;
  --rose-soft:       #F2D5CE;
  --plum:            #8E5A7A;
  --plum-soft:       #E8D5DF;
  --slate:           #5B6B7A;
  --slate-soft:      #D9E0E6;

  /* shadow */
  --shadow: 0 1px 0 rgba(31,24,20,.04), 0 8px 24px -12px rgba(31,24,20,.12);
}
```

## Category color mapping

When a recipe card shows its meal category, the color strip + gradient uses these:

| meal_category | accent | gradient soft |
|---|---|---|
| `breakfast` | `--honey` | `--honey-soft` |
| `lunch` | `--olive` | `--olive-soft` |
| `dinner` | `--terracotta` | `--terracotta-soft` |
| `dessert` | `--rose` | `--rose-soft` |
| `sweets` | `--plum` | `--plum-soft` |
| `snack` | `--slate` | `--slate-soft` |

## Typography

```html
<!-- Add to app/layout.tsx <head> via next/font -->
import { Fraunces, DM_Sans } from 'next/font/google';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-serif' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' });
```

Then in `globals.css`:

```css
body { font-family: var(--font-sans), system-ui, sans-serif; }
.serif { font-family: var(--font-serif), serif; font-optical-sizing: auto; }
```

Display headings use Fraunces (often italic for the accent word, e.g. "Your *recipes.*"). Body and UI labels use DM Sans.

## Components & patterns

All of these have HTML reference implementations in `hearth-mockup.html`. Copy structure, then re-implement as React components.

### Recipe card

- Color-coded category strip on top (4px tall, full bleed)
- Soft gradient background fading from category-soft → white
- Three rows: meta (category label + heart), emoji + times, body (title + tags + ingredient preview chips)
- Hover: subtle lift + terracotta border

### Topbar

- Brand mark (terracotta circle with flame icon) + wordmark "saké."
- Language switcher (EN / NL / FR pill toggle)
- Settings icon + avatar

### Tabs

- Pill-shaped buttons in a horizontal row
- Active state: black background, cream text
- Optional count badge in terracotta

### List item (shopping list)

- Checkbox (square, olive fill when checked)
- Item emoji
- Item main column (name + source chip + optional note + optional add-note button)
- Quantity cell on the right (inline stepper when active; static text otherwise)
- Urgent variant: terracotta left edge accent + red "Urgent" pill + tinted background gradient

### Meal slot

- Color-coded by meal type (honey-soft / olive-soft / terracotta-soft)
- Small uppercase eyebrow ("Breakfast" / "Lunch" / "Dinner")
- Big bold emoji + title
- Servings line in italic Fraunces
- Hover reveals X button to remove

### Modal pattern

- Backdrop: `rgba(31,24,20,.55)` + `backdrop-filter:blur(4px)`
- Modal: cream paper background, 24px radius, soft shadow
- Header: white background, bottom border, title in Fraunces with italic accent
- Body: scrolls inside (max-height: 60vh)
- Footer: cream background, top border, left-aligned secondary action, right-aligned cancel + primary

## Layout rules

- Max content width: 1280px, centered
- Page padding: 24px 32px desktop, 16px mobile
- Card border radius: 14-20px (smaller = denser)
- Section gap: 24-32px
- Item gap inside cards: 12-16px
- Avoid hairlines under 1px; use `dashed` for soft dividers inside cards
- Hover always adds a subtle lift (`translateY(-2px)`) + the `--shadow`

## Iconography

Use `lucide-react` exclusively. Common ones in the mockup: `flame`, `book-open`, `shopping-basket`, `plus-circle`, `users`, `bell`, `share-2`, `search`, `heart`, `clock`, `users`, `leaf`, `x`, `check`, `external-link`, `edit-3`, `chevron-left/right`, `arrow-up-down`, `grip-vertical`, `eye`, `eye-off`, `settings`, `calendar-days`, `history`, `alert-circle`, `message-square`, `copy`.

Emoji are used inline for ingredients, meal types, food tags, and as the hero of recipe cards. Use the system emoji font — don't load Twemoji or similar (looks inconsistent across platforms; system emoji feels native).
