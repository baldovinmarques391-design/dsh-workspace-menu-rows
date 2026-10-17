/**
 * Client half: keep the workspace picker dropdown at four visible rows and let
 * the rest scroll inside the card.
 *
 * The picker is the shared `Menu` primitive rendered into a portal under
 * `document.body`, so no Slot owns its geometry. Its card carries
 * `role="menu"`, the scrolling item area is the card's first
 * `[role="presentation"]` child, and the picker's pinned footer (the
 * "Add workspace..." row) is the `[role="presentation"]` sibling right after
 * it. That sibling pair is the hook this plugin uses: menus with a pinned
 * footer are the only ones whose item list grows long enough to need a cap.
 *
 * The cap is expressed in rows, not pixels: on every open the first
 * `role="menuitem"` row is measured and the region is capped at ROWS times
 * that height, so density, zoom, and theme changes stay correct. The injected
 * stylesheet is only a fallback for the brief moment before the measurement
 * lands and for browsers without `:has()` support.
 */

const MODULE_ID = '@local/dsh-workspace-menu-rows'
const STYLE_ID = `${MODULE_ID}/workspace-menu-rows.css`
const LABEL = 'workspace-menu-rows: four-row workspace list'

/** How many workspace rows stay visible before the list starts scrolling. */
const ROWS = 4
/** Row height used by the stylesheet fallback (`Menu` rows are at least 34px). */
const FALLBACK_ROW_HEIGHT = 34

const CSS = [
  '/* workspace picker: four visible rows, the rest scrolls */',
  '[role="menu"] > [role="presentation"]:has(+ [role="presentation"]) {',
  `  max-height: ${ROWS * FALLBACK_ROW_HEIGHT}px;`,
  '  overflow-y: auto;',
  '  overscroll-behavior: contain;',
  '}',
  '',
].join('\n')

/**
 * The scrolling item area of a menu card that pins a footer below it.
 * @param menu - one `role="menu"` card.
 * @returns the item area, or null for menus without a pinned footer.
 */
function scrollingRegion(menu) {
  const region = menu.querySelector(':scope > [role="presentation"]')
  if (region === null) return null
  const footer = region.nextElementSibling
  if (footer === null || footer.getAttribute('role') !== 'presentation') return null
  return region
}

/**
 * Cap one open menu at ROWS visible rows, measured from its own row height.
 * @param menu - one `role="menu"` card appended to the page.
 */
function capRows(menu) {
  const region = scrollingRegion(menu)
  if (region === null) return
  const row = region.querySelector('button[role="menuitem"]')
  const measured = row === null ? 0 : row.getBoundingClientRect().height
  const rowHeight = measured > 0 ? measured : FALLBACK_ROW_HEIGHT
  region.style.maxHeight = `${ROWS * rowHeight}px`
  region.style.overflowY = 'auto'
  region.style.overscrollBehavior = 'contain'
}

window.__ModuleLoader__.load({
  id: MODULE_ID,
  factory() {
    return {
      apply(ctx) {
        ctx.effect(() => {
          const style = document.createElement('style')
          style.dataset.plugin = MODULE_ID
          style.dataset.pluginCss = STYLE_ID
          style.textContent = CSS
          document.head.appendChild(style)

          // The menu card is appended straight to document.body on open and
          // removed on close, so watching direct body children is enough and
          // stays out of the cost of in-page streaming updates.
          const observer = new MutationObserver((records) => {
            for (const record of records) {
              for (const node of record.addedNodes) {
                if (node.nodeType !== 1) continue
                if (node.getAttribute('role') === 'menu') capRows(node)
              }
            }
          })
          observer.observe(document.body, { childList: true })

          return () => {
            observer.disconnect()
            style.remove()
          }
        }, LABEL)
      },
    }
  },
})
