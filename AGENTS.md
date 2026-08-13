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
- **`zonalStatistics` is a generic tool.** It ships **no** built-in colours, branding, or klimaatlabels specifics — the "Labelpaspoort" look is entirely config-driven (see `static/example.config.json`). It renders one table **row per data layer** and one or more configurable **columns per selected zone** (each column reads an attribute from the row-layer's feature), so it can show categorical labels, numeric statistics, or any mix. Settings: `zoneLayerId` (required, clickable zone geometry layer); `layers` (required, data layers via `{ id, title? }` — one row each, `title` defaults to the layer config title); `columns` (required, array of `{ attribute, label?, tooltipAttribute?, styled? }` — `label` defaults to `attribute`, `tooltipAttribute` adds a hover/description + a description column in the PDF and CSV exports (and is rendered inline in PNG/JPEG image exports), `styled:true` colours the cell via `valueStyles`); `zoneCodeAttribute` (defaults to `postcode`); `valueStyles` (array of `{ value, color, label? }` mapping categorical cell values to colours — drives styled cell backgrounds, the legend, and PDF cell fills; the text colour is derived automatically from the background via WCAG contrast (black or white), so it is not configurable; PDF fills require **hex** colours, other CSS colours render plain in the PDF); `showSummary` (default **true**; set `false` to hide the computed summary section); export branding `exportTitle`, `exportFileName`, `pdfFooterText`, `pdfLeftLogo` (title/filename default to the tool title/alias; footer + left logo default to `DEFAULT_PDF_BRANDING` in `pdf/pdf-layout.ts`). The panel/table headers and export title use the tool title (the resolved `label`/`alias`, passed as a `title` prop), not a hardcoded i18n string. Domain model in `zonal-statistics-controller.ts` is `ZoneTable`/`ZoneTableRow` (per-column value+tooltip arrays aligned to `settings.columns`) — no `Passport`/`target` concepts remain. A computed **summary** (`buildSummary()` → `ZonalSummary`) aggregates the current selection: total selected area, plus per configured column either area-per-category (styled columns) or min/max/mean (non-styled numeric columns, values parsed tolerating a comma decimal). It is rendered as a `.summary` section **inside the left-menu tool panel** (`ZonalStatisticsPanel.svelte`), **not** in the floating table (`ZonalStatisticsView.svelte`). Zone area is computed with **Turf** (`turf.area`) via `zoneAreaSqMeters`/`entityAreaSqMeters` (summed over a zone's polygon parts, cached per code in `areaCache`). Area reads each entity's **full `polygon.hierarchy`** — outer ring **minus interior holes** — directly (via `toClosedLonLatRing`, which re-closes rings for Turf), **not** the `cleanRing`-stripped outline rings, so it matches the full-resolution source geometry and subtracts donut holes. (`ringPositionsFor`/`ringCache` remain for the outline + highlight primitives only.) The panel formats area as km² or m² (< 1 km²). Note: Turf area is **spherical** (mean radius), so it can still differ ~0.1–0.5% from QGIS ellipsoidal-WGS84 or planimetric RD-New (EPSG:28992) measurements — that residual is model choice, not a bug. The summary recomputes on each selection change (cheap; areas cached) and is **not** included in the PNG/JPEG/PDF exports. The styled-cell/legend/chip colours + area/number formatting live in a shared `zonal-style.ts` (`createZonalStyler` → `swatchStyle`/`styleFor`/`cellStyle`/`pdfColor`, plus `formatArea`/`formatNumber`) used by both the view and the panel — do not duplicate the WCAG-contrast colour maths.
- **`zonalStatistics` performance:** selection is **click** (`mouseLeftClick`) and hover is **`mouseMove`**. Key perf-critical implementation details in `zonal-statistics-controller.ts`: the zone + data-layer polygon **fills are batched Cesium primitives**, **not** GeoJson entities — (a) each unique layer (the `zoneLayerId` zone layer + every `settings.layers` data layer, deduped) is rendered as **one batched `Cesium.Primitive`** of flat `PolygonGeometry` instances (`buildFillRender`, `PerInstanceColorAppearance`, `height:0` / `perPositionHeight:false` — **no terrain is assumed**) in `scene.primitives`, coloured per instance from the GeoJson layer's own entity material (`readEntityColor`); the GeoJson entity fills are then **hidden** (`entity.polygon.show=false` via `hideEntityFills`, restored on `destroy` via `restoreEntityFills`) so only the primitive renders. The zone boundaries are outlined by **one batched `Cesium.Primitive` of `PolygonOutlineGeometry`** (`buildZoneOutlines`, only the zone layer since data layers share the geometry, flat at `height:0`, `PerInstanceColorAppearance` `flat:true`, depth-test off, added **after** the fills so the lines sit on top, visibility follows the zone layer's `visible` store; the outline appearance is **`translucent:true`** — it must render in the same translucent pass as the fills, otherwise (as opaque) it draws in the earlier opaque pass and the semi-transparent fills paint over it; being added last to the primitive collection, Cesium's stable equal-depth sort keeps it on top); the outline is a **static** `OUTLINE_COLOR` black and does **not** recolour with selection/active state (only the fills do), but its **alpha tracks the zone layer's opacity slider** (`outlineColor()`/`applyOutlineOpacity()` subscribe to `zoneLayer.opacity`, updating each outline instance's per-instance colour — instances carry unique ids and `releaseGeometryInstances:false`). This is **not** the removed per-zone `GroundPolylinePrimitive`/`cleanRing`/`ringCache` ground-polyline / `rebuildHighlights` approach, and **not** per-zone entities; do **not** revert to either. (b) hover + selection + active state are shown **purely by recolouring the per-instance fill colour** — `stateColor` tints the base label colour (active blends toward `ACTIVE_TINT`, selected + hover **brighten** the base — selected less than hover), preserving the base opacity so the label hue stays visible in every state, applied **incrementally per changed zone code** via `Primitive.getGeometryInstanceAttributes(id).color` (`applyColor`/`paintInstance`, guarded by `primitive.ready`), **never** a full rebuild. Each polygon part carries a unique `{ code }` pick-id object, so all parts of a zone recolour together and picking resolves straight to a code. Hover (`onMouseMove`) picks on every `mouseMove` — this is only viable **because** picking now hits one batched fill primitive per layer instead of thousands of entities (the old entity-based hover was removed for being far too slow; the batched primitive is precisely what makes hover cheap). Layer visible/opacity/style changes are mirrored onto the fill primitive (`buildFillRenders` store subscriptions: `visible` → `primitive.show`; `opacity`/`style` → `refreshBaseColors` re-reads the entity colours + repaints); (c) clicks + hover resolve the zone code from the picked primitive instance id (`pickZoneCode` → `picked.id.code`), validated against `zoneEntityIndex`; (d) the view builds the table **incrementally** (`buildZoneSlice` + `updateTable` in `ZonalStatisticsView.svelte`) — one zone column added/removed per selection change instead of a full `buildTable()` rebuild (`buildTable`/`buildExportRows` remain for exports). (e) **MultiPolygon zones** — Cesium's `GeoJsonDataSource` explodes a MultiPolygon feature into **one entity per part**, all sharing the same code, so `zoneEntityIndex` maps code → **array** of entities and each part becomes its **own fill instance** carrying the same `{ code }` id; `buildFillRender` emits one `PolygonGeometry` instance per part (keyed in `idsByCode` code → id[]) so `applyColor` recolours every part of a multipart zone together (do **not** collapse to a single instance/id per code — only one part would recolour).
- **`zonalStatistics` view UX (`ZonalStatisticsView.svelte`):** the floating table has CSS scroll-shadow edges (`.edge-*`, toggled by an `on:scroll` handler that also runs on resize and after each table rebuild), row hover, and a live `zonesSelected` count badge in the header. Each selected zone's column header carries three buttons: activate (`.zone-code`, focuses/tints the zone), zoom (`.zone-zoom`, `ZoomIn` icon → `controller.zoomToZone(code)` flies the camera to the `BoundingSphere` of the zone's polygon parts), and remove (`.zone-remove`). Exports show a `busy-overlay` with a Carbon `InlineLoading` (label from `tools.zonalStatistics.exporting`) and surface failures via a header `InlineLoading` `status="error"` (`tools.zonalStatistics.exportFailed`, auto-clears after 5s). The table exports as PNG, JPEG, PDF or CSV (overflow menu); the `tooltipAttribute` description text is included in every export — a description column in the PDF (`pdfColumns`) and CSV (`csvColumns`), and rendered inline via `.cell-tooltip-text` in the PNG/JPEG snapshot (native `title` tooltips can't render into an image). The PNG/JPEG export does **not** capture the on-screen (wide, zones-side-by-side) table; instead it renders + captures a dedicated off-screen `.export-sheet` (fixed A4-portrait width, `left:-100000px`, bound to `exportElement`) that stacks **one table per selected zone vertically** (layer rows × configured columns) so the image fits on A4 pages. `exportImage` sets `exportingImage`, `await tick()`s for that sheet to render, then captures `exportElement`. CSV export (`exportCsv`) is synchronous, RFC-4180 quoted, and prefixed with a UTF-8 BOM for Excel. The active zone's map fill uses the strongest tint (blended toward `ACTIVE_TINT`, deep sky blue), the other selected zones a milder `SELECTED_TINT` (yellow) blend, and the hovered zone a brightened base — all via `stateColor` in `zonal-statistics-controller.ts` (no separate outline/highlight primitives). Added transitions honour `prefers-reduced-motion`.
- **`zonalStatistics` panel behavior:** left-menu panel (`ZonalStatisticsPanel.svelte`) reuses `MapToolLayerManager/MapToolLayerControl.svelte` per resolved data layer for visibility, legend, opacity, and metadata link behavior; empty-state text is localized via `tools.zonalStatistics.noDataLayers`. Below the layer controls it renders the computed selection **summary** (see the generic-tool bullet above).
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
