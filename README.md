# Abide — Shopify theme for abide.clo

Custom Online Store 2.0 theme built from the abide.clo design handoff.
Home, Collection, Product, and an AJAX cart drawer. Checkout is Shopify's native checkout.

## Install

```sh
shopify theme check          # lint (passes with no offenses)
shopify theme dev --store <your-store>.myshopify.com
shopify theme push --unpublished
```

Or zip the repo contents (the `assets/ config/ layout/ locales/ sections/ snippets/ templates/` folders)
and upload them from **Online Store → Themes → Add theme → Upload zip file**.

## Store setup

The theme looks for a product with the handle **`abide-cap`** (header link, hero button, featured product, empty-cart button).
Until it exists, the home page falls back to the bundled photos and static copy.

1. **Product:** "Abide Cap", $28.80, option **Color = Red** (one variant). Handle `abide-cap`.
   Upload 3 images in this order: bench, still, sky. The originals are in the design handoff; resized copies are in `assets/cap-*.jpg`.
   Description: *A six-panel cap in washed red cotton twill. `abide` (italic) is embroidered in white on the front, with John 15:4 stitched along the side.*
2. **Metafields:** Settings → Custom data → Products → add three single-line text definitions:
   `custom.material` (Cotton twill), `custom.fit` (Adjustable strap), `custom.detail` (Embroidered front & side).
   They drive the product page's spec rows. Rows with no value are hidden. Each spec block also has a fallback value in the theme editor.
3. **Collection:** while a collection has a single product, visiting it (e.g. `/collections/all`) forwards straight to that product page. Turn this off in the Collection template settings once there are more products; the header's "Shop" link can be switched back on in Header settings.
4. **Contact page:** create a page with the handle `contact` and assign the template `page.contact` (the footer's "Contact" links to `/pages/contact`).
5. **Store currency:** SGD (Settings → Store details). Prices use the "HTML with currency" format, e.g. "$28.80 SGD".
6. **Local pickup:** Settings → Shipping and delivery → Local pickup.
7. **Social links:** Theme settings → Social media → Instagram URL. The footer's "Instagram" link shows only once this is set.
8. **Checkout branding:** Settings → Checkout → Customize:
   background `#EAE6DA`, text `#221F1A`, buttons `#221F1A`, accent `#B3122A`, **corner radius 0**,
   logo `assets/logo-circle.png`, and the closest serif font for headings.

## What's editable

| Where | Settings |
|---|---|
| Announcement bar | text, link, show/hide |
| Header | menu (optional), featured product link + label ("Shop Abide Cap"), show/hide "Shop" link |
| Hero (split) | eyebrows ("Drop 01 │ The Abide Cap"), two heading lines (italic supported), footnote, buttons (blank label hides one), image (+ built-in sky/still/bench fallback) |
| Featured product | product, eyebrow, heading, text, button label, image override |
| Image banner | image (+ built-in fallback), link, full width |
| Product | breadcrumb, title & price, variant picker, quantity & add to bag, description, spec rows, text, app blocks |
| Footer | shop/contact links or a menu, copyright name |
| Theme settings | colors (design tokens), label case (UPPERCASE / sentence), wordmark text, optional logo image, favicon, share image, "One size" cart label, social links |

## Structure

- `layout/theme.liquid`: fonts, CSS variables, header/footer groups, cart drawer
- `assets/base.css`: all styles (tokens in `snippets/css-variables.liquid`; radius 0 and no shadows throughout)
- `assets/theme.js`: cart drawer (`/cart/add.js`, `/cart/change.js`, and the Section Rendering API refreshing `sections/cart-drawer`), focus trap and Esc, PDP gallery, quantity stepper with a live "Add to bag — $XX.XX" total, variant picker, mobile menu
- Fonts: Cormorant Garamond (300/400 + italics) and DM Mono (400) are self-hosted in `assets/` (latin + latin-ext, SIL OFL).
- Labels, nav and buttons are UPPERCASE per the design; switch to sentence case in Theme settings → Typography.
- Without JavaScript, add to bag falls back to the standard `/cart` page (`sections/main-cart.liquid`)

Below 600px the header nav collapses into a "Menu" toggle. This wasn't in the design; the handoff suggested it.
