# AGENTS.md

Leia Open Source 3D Viewer — a generic, config-driven Cesium-based 3D viewer for Digital Twin purposes, built with **SvelteKit + TypeScript + Svelte 4** and the **Carbon Design System** (`carbon-components-svelte`). An initiative by Geodan and Provincie Zeeland.

## Maintaining this file

Keep this document a living source of truth. Whenever a change warrants it — new architectural decisions, conventions, build/setup steps, gotchas, or pitfalls discovered while working — update AGENTS.md in the same change so it stays accurate. Conversely, if a change documented here is later reverted, revert the corresponding AGENTS.md entry as well so the docs never describe code that no longer exists.

## Setup & commands

```sh
npm install
npm run dev              # vite dev server on port 4200
npm run build            # Node (SSR) build → ./build
npm run build --adapter=static   # static build (uses src/routes-static, output in ./build)
npm run check            # svelte-kit sync + svelte-check (type/a11y checks)
npm run lint             # prettier --check + eslint
npm run format           # prettier --write
```

- **Environment:** Copy `.env.example` to `.env`. `APP_URL` **must** be set or `svelte.config.js` and `vite.config.ts` will throw — both read it at config-evaluation time. `APP_URL` is the base path of the deployment (e.g. `https://site.com/some/path/`); `CESIUM_BASE_URL` and the SvelteKit `base` path are derived from it.
- **No test suite.** Validate changes with `npm run check`. `svelte-check` has a baseline of ~148 pre-existing errors and 2 pre-existing CSS warnings — do not treat those as regressions you introduced. Known baseline offenders: `Button.svelte`, `MapToolCesiumMeasure` ('editting'), Stories, `VectorTilesLayer` private `createLayer`, `set source` indexing unknown.
- **Docker:** `docker build -t 3d-viewer .` then `docker run -p 3000:3000 3d-viewer`.

## Architecture

Two-layer design — **keep the boundary intact**:

- **`src/lib/map-core/`** — framework-agnostic abstraction. Abstract `MapCore`, abstract `Layer`, `LayerConfig`, `LayerLibrary`, `LayerConfigGroup`, an event `Dispatcher`, and `library-connectors/` (CKAN, GeoNetwork) that fetch remote layer catalogs into the layer library. Layer types are registered in `src/lib/map-core/layer-type.ts`.
- **`src/lib/map-cesium/`** — the Cesium implementation. `Map extends MapCore` wraps a `Cesium.Viewer`; `CesiumLayer<T> extends Layer`; `CesiumLayerFactory` turns a `LayerConfig` into a concrete layer class.

Data flow: **JSON config → `LayerConfig` → `CesiumLayerFactory` → `CesiumLayer<T>` subclass → `Map.viewer`**.

Concrete Cesium layers in `src/lib/map-cesium/layers/`:

- **Imagery:** `WmsLayer`, `WmtsLayer`, `BasiskaartLayer`, `ArcGISLayer`, `VectorTilesLayer`.
- **Vector / custom:** `GeoJsonLayer`, `WfsLayer`, `OgcFeaturesLayer`, `IconLayer`, `DroppedGLBLayer`.
- **3D / primitive:** `ThreedeeLayer` (3D Tiles), `I3sLayer`, `ModelAnimation`, `FloodLayer`.

## Configuration (config-driven design)

Behavior comes from a JSON config, **not hardcoded**. New layer/tool capabilities should be exposed through config `settings`. An example is `static/example.config.json`.

Config loading (static build) supports two ways:

1. `?url=http://host/some_config.json` — load config from URL.
2. A `config.json` placed at the build root (ignored when `?url` is supplied).

Top-level config shape:

```jsonc
{
	"viewer": {
		/* base viewer settings (below) */
	},
	"groups": [
		/* layer-library grouping tree */
	],
	"layers": [
		/* layer definitions */
	],
	"tools": [
		/* tool enablement + settings */
	]
}
```

### `viewer`

| key                                  | description                                                                                                                                                        | type    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| `startPosition`                      | Start camera position (below)                                                                                                                                      | object  |
| `startCameraMode3D`                  | Start in 3D (true) or 2D (false; pitch forced to -90)                                                                                                              | boolean |
| `startToolOpen`                      | Tool id to open on start (e.g. `layermanager`, `stories`)                                                                                                          | string  |
| `colors`                             | Carbon Design color tokens plus header colors `header-color` (bar background), `title-color` / `sub-title-color` (any CSS color); see `static/example.config.json` | object  |
| `title` / `subTitle`                 | Header title / subtitle                                                                                                                                            | string  |
| `logo`                               | Header logo image URL                                                                                                                                              | string  |
| `logoMarginLeft` / `logoMarginRight` | Header logo margins                                                                                                                                                | string  |

`startPosition` / `cameraPosition` fields: `x` (lon), `y` (lat), `z` (height m), `heading`, `pitch` (-90 down, 0 forward, 90 up), `duration` (fly seconds).

### `groups`

Hierarchical grouping for the layer library; root parent first. Fields: `id` (unique), `title`, `parentId` (empty for root).

### `layers`

Common layer fields: `id`, `type`, `title`, `groupId`, `description`, `imageUrl`, `legendEnabled`, `legendUrl`, `isBackground` (only one active at a time), `defaultAddToManager`, `defaultOn`, `attribution`, `metadata` (array of `{key,value}`), `transparent`, `disablePopup`, `opacity` (0 opaque … 100 transparent), `cameraPosition`, `settings`.

Supported `type` values: `basiskaart`, `wms`, `wmts`, `tms`, `vectortiles`, `3dtiles`, `geojson`, `modelanimation`, `custom` (plus the other classes listed under Architecture). `settings` differs per type — examples:

- **wms:** `url`, `featureName`, `contenttype` (default `image/png`); optional `tools.styleSwitcher.enabled` to pull styles + dynamic legend from GetCapabilities.
- **wmts:** `url`, `featureName`, `contentType`, `matrixids[]`, `tileMatrixSetID` (default `EPSG:3857`), `tileWidth`/`tileHeigth` (256), `maximumLevel`.
- **3dtiles:** `url` (tileset.json), `shadows`, `tilesetHeight`, `enableHeightControl`, `defaultTheme`, `style` (Cesium3DTileStyle; `pointSize` for point clouds), `themes[]`, `filter`.

Refer to `static/example.config.json` for concrete, copy-pasteable examples of every type.

## Key conventions

- **Dual build.** `src/routes/` (Node/SSR, includes `+layout.server.ts` and `hooks.server.ts`) vs `src/routes-static/` (static, no server scripts). `svelte.config.js` swaps the routes folder via `npm_config_adapter` and selects `adapter-node` vs `adapter-static`. A change in one routes folder usually needs mirroring in the other.
- **Cesium import:** `import * as Cesium from "cesium"`. Assets are copied to `/Cesium` via `viteStaticCopy`; `CESIUM_BASE_URL` is derived from `APP_URL`. The viewer is `Map.viewer`; layers attach via `viewer.imageryLayers`, `viewer.dataSources`, `viewer.scene.primitives`.
- **Tools** (`src/lib/components/tools/`): each tool self-registers via `getContext("mapTools").registerTool(new MapToolMenuOption(...))`; `Page.svelte` holds a `toolOrder` map from tool id → Svelte component. Tools are enabled/configured through the config `tools` array.
- **Dependency attributions:** whenever a new package is introduced/installed (for example in `package.json`), add a matching `new Attribution(...)` entry in `src/lib/components/tools/MapToolInfo/MapToolInfoView.svelte` so the in-app attribution list stays complete.
- **PDF exports (Stories + Zonal):** shared page branding/layout primitives live in `src/lib/components/tools/pdf/pdf-layout.ts` (A4 portrait frame, logo header, footer, page metrics, text/pagination helpers). Keep feature-specific content rendering in each tool, but do not duplicate branding constants or header/footer drawing logic.
- **`zonalStatistics` is a generic tool.** It ships **no** built-in colours, branding, or klimaatlabels specifics — the "Labelpaspoort" look is entirely config-driven (see `static/example.config.json`). It renders one table **row per data layer** and one or more configurable **columns per selected zone** (each column reads an attribute from the row-layer's feature), so it can show categorical labels, numeric statistics, or any mix. Settings: `zoneLayerId` (required, clickable zone geometry layer); `layers` (required, data layers via `{ id, title? }` — one row each, `title` defaults to the layer config title); `columns` (required, array of `{ attribute, label?, tooltipAttribute?, styled? }` — `label` defaults to `attribute`, `tooltipAttribute` adds a hover/description + PDF description column, `styled:true` colours the cell via `valueStyles`); `zoneCodeAttribute` (defaults to `postcode`); `valueStyles` (array of `{ value, color, label? }` mapping categorical cell values to colours — drives styled cell backgrounds, the legend, and PDF cell fills; the text colour is derived automatically from the background via WCAG contrast (black or white), so it is not configurable; PDF fills require **hex** colours, other CSS colours render plain in the PDF); export branding `exportTitle`, `exportFileName`, `pdfFooterText`, `pdfLeftLogo` (title/filename default to the tool title/alias; footer + left logo default to `DEFAULT_PDF_BRANDING` in `pdf/pdf-layout.ts`). The panel/table headers and export title use the tool title (the resolved `label`/`alias`, passed as a `title` prop), not a hardcoded i18n string. Domain model in `zonal-statistics-controller.ts` is `ZoneTable`/`ZoneTableRow` (per-column value+tooltip arrays aligned to `settings.columns`) — no `Passport`/`target` concepts remain.
- **`zonalStatistics` performance:** selection is **click-only** (`mouseLeftClick`). Do **not** add per-`mouseMove` `scene.pick` hover behaviour — it was implemented and removed because picking on every mouse move is far too slow. Key perf-critical implementation details in `zonal-statistics-controller.ts`: (a) the black per-zone outlines are drawn as **one batched `GroundPolylinePrimitive`** in `scene.groundPrimitives` (`addZoneOutlines`, `allowPicking:false`, `loop:true`), **not** thousands of ground-clamped polyline Entities — do not revert to a per-zone Entity `CustomDataSource`; ring positions **must** be passed through `cleanRing` first (strips consecutive + closing duplicate vertices) or `GroundPolylineGeometry` throws `DeveloperError: normalized result is not a number` on the zero-length segments that closed GeoJSON rings produce; (b) selection highlights are drawn as **one batched `GroundPolylinePrimitive`** (`rebuildHighlights`, per-instance colour, `asynchronous:false`), added to `scene.groundPrimitives` **after** the black outline so the blue/yellow selection always renders on top of the black zone outline — rebuilt on each selection/active change (selections are few); do **not** revert to entity `CustomDataSource` highlights (the batched black outline primitive draws over entity ground-polylines, so the black line would show through the selection); (c) clicks resolve the zone code via a cached `entityCodeIndex` (entity → code, built during `indexZoneEntities`/`indexLayer`) instead of calling `entity.properties.getValue(...)` per click; (d) the view builds the table **incrementally** (`buildZoneSlice` + `updateTable` in `ZonalStatisticsView.svelte`) — one zone column added/removed per selection change instead of a full `buildTable()` rebuild (`buildTable`/`buildExportRows` remain for exports).
- **`zonalStatistics` view UX (`ZonalStatisticsView.svelte`):** the floating table has CSS scroll-shadow edges (`.edge-*`, toggled by an `on:scroll` handler that also runs on resize and after each table rebuild), row hover, and a live `zonesSelected` count badge in the header. Exports show a `busy-overlay` with a Carbon `InlineLoading` (label from `tools.zonalStatistics.exporting`) and surface failures via a header `InlineLoading` `status="error"` (`tools.zonalStatistics.exportFailed`, auto-clears after 5s). The active zone's map outline is drawn wider (7px, `DEEPSKYBLUE`) than the inactive selected zones (4px, `YELLOW`) — see `rebuildHighlights` + `HIGHLIGHT_ACTIVE_COLOR`/`HIGHLIGHT_INACTIVE_COLOR` in `zonal-statistics-controller.ts`. Every zone feature also gets a thin black outline (1.5px), drawn as a single batched `GroundPolylinePrimitive` (`addZoneOutlines`) added **before** the highlight primitive so the selection draws on top; its visibility follows the zone layer's `visible` store. Added transitions honour `prefers-reduced-motion`.
- **`zonalStatistics` panel behavior:** left-menu panel reuses `MapToolLayerManager/MapToolLayerControl.svelte` per resolved data layer for visibility, legend, opacity, and metadata link behavior; empty-state text is localized via `tools.zonalStatistics.noDataLayers`.
- **State:** Svelte `writable` stores; the `Map` is a singleton store on `app` (`src/lib/app/app.ts`). Persist a store with `register(store, key)` in `src/lib/app/stores/app-storage.ts` (syncs to `localStorage`).
- **i18n:** `svelte-i18n` with `$_('key.path')`. When adding a key, add it to **all three** files in `src/lib/i18n/json/`: `en.json`, `nl.json`, `fr.json`. `document.documentElement.lang` is kept in sync inside `selectedLanguage.subscribe` in `src/lib/i18n/localization.ts`.
- **Styling:** SCSS + Carbon tokens (`var(--cds-*)`). Global rules (scrollbars, focus-visible outline, `prefers-reduced-motion`) live in `src/lib/styles/tosti.scss` (imported via `CarbonTheme.svelte`); do not add per-component scrollbar overrides.
- **Accessibility:** Use the `use:clickable` action (`src/lib/actions/clickable.ts`) to add Enter/Space activation to div-buttons — and still add a `<!-- svelte-ignore a11y-click-events-have-key-events -->` comment at each site (Svelte can't see into actions). The skip link in `Page.svelte` targets `#main-content`.

## Pitfalls (verified, hard-won)

- **Lazy layer loading.** `CesiumLayer` defers data loading until the layer is first visible or a tool explicitly requests it. `protected startLoading()` runs once (latched by `loadInitiated`, never reloads); `public ensureLoaded(): Promise<void>` lets tools load a hidden layer's data without toggling visibility. Most layers (imagery base / threedee / i3s / vectortiles / wfs / ogc) create the SOURCE in `startLoading()`; `addToMap()` is attach-only, triggered by the base `_source.subscribe` — no extra guard needed. A tool that needs a hidden layer's data must `await layer.ensureLoaded()`, not rely on `loaded`.
- **`GeoJsonLayer` is the deliberate exception** to the lazy-source pattern: its source is created eagerly in the constructor and `addToMap` is gated by `if (!this.loadInitiated || !this.source) return;`, with `startLoading()` overridden to call `addToMap()`. Reason: its `addToMap → addListeners()` path reads subclass fields (`this.style`, color defaults, `clampToGround`) that only initialize **after** `super()`, while for `defaultOn:true` layers `startLoading` fires _during_ `super()`. Do **not** centralize the `loadInitiated` check into the base `_source.subscribe` — non-lazy layers (icon/custom/dropped-glb/flood/model) set source in the ctor and rely on the unguarded subscription to attach eagerly.
- **GeoJson `setCustomStyle`.** When `config.settings.style` is an object without a `fill` (e.g. `{stroke:'#0000ff'}`), `Cesium.Color.fromCssColorString(style.fill)` throws (`fill` undefined). Guard it: `const colorProp = settings.style?.fill ? new ColorMaterialProperty(fromCssColorString(...)) : this.defaultColorPolygon;`. Note: reading `entity.properties[attr] * factor` on a Cesium `ConstantProperty` is correct (it coerces via `valueOf`) — do **not** "fix" it with `.getValue()`.
- **GeoJson class style naming.** The strict naming convention is to set `style` to the GeoJSON attribute name (for example `"label"`) and optionally provide `settings.classMapping` for deterministic value-to-color maps on that style attribute.
- **Localized numeric input.** Numeric UI values (e.g. height control) can arrive as locale strings like `4,5` despite numeric typing; normalize before feeding Cesium math, and guard matrix/model transforms against non-finite numbers to avoid render crashes.
- **In-panel tooltips.** Carbon tooltips on right-aligned icon buttons inside a scrolling panel get clipped (the panel's `overflow-y:auto` traps them) and appear "behind the map". z-index does **not** help — set `tooltipPosition="left"` so they open inward. (Separately, the collapsed left-menu icon tooltips that extend right over the map _are_ a stacking issue, fixed by `.tosti-tool-menu { z-index:10 }` in `MapToolMenu.svelte` + `.map-body { position:relative; z-index:1 }` in `Page.svelte`.)
- **Tooltips inside a horizontally-scrollable table (zonalStatistics cells).** Do **not** use Carbon `TooltipDefinition`/popover tooltips inside the `overflow:auto` zonal table: their absolutely-positioned tooltip content is counted in Chrome's scrollable overflow (but not Firefox's), which adds a phantom scrollable empty strip on the right even when the table fits. The cell value tooltips use a plain native `title` attribute (`.cell-tooltip`, dotted underline) instead — no abspos layout, no phantom scroll. Relatedly, the table is `width: max-content` with **no** `min-width:100%` (that `min-width` caused the same phantom strip in Firefox).
- **Scrollbars.** Apply `scrollbar-width: thin; scrollbar-color: var(--cds-text-secondary) transparent;` on a universal `*` selector in `tosti.scss`, not on `html` alone (`scrollbar-width` is not inherited, unlike `scrollbar-color`). Do not add a custom `::-webkit-scrollbar` block alongside the standard props — it makes Chromium ignore `scrollbar-gutter: stable`. To avoid content shift, reserve gutter only in Chromium via `@supports selector(::-webkit-scrollbar) { .content-wrapper { scrollbar-gutter: stable; } }`.
- **Nested opacity slider overflow.** Carbon `.bx--slider` has a default `min-width: ~12.5rem` and won't shrink in a narrowed container. In `MapToolLayerControl.svelte`, wrap the Slider and override `:global(.bx--slider){min-width:0; flex:1 1 auto}` + `:global(.bx--slider-container){width:100%}` (the `min-width:0` override is the critical part).
