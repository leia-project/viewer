<script>
  /** Set to `false` to hide the side nav by default */
  export let expandedByDefault = true;

  /** Set to `true` to open the side nav */
  export let isSideNavOpen = false;

  /**
   * Specify the ARIA label for the header
   * @type {string}
   */
  export let uiShellAriaLabel = undefined;

  /**
   * Specify the `href` attribute
   * @type {string}
   */
  export let href = undefined;

  /**
   * Specify the company name
   * @type {string}
   */
  export let company = undefined;

  /**
   * Specify the platform name
   * Alternatively, use the named slot "platform" (e.g., <span slot="platform">...</span>)
   */
  export let platformName = "";

  /** Set to `true` to persist the hamburger menu */
  export let persistentHamburgerMenu = false;

  /**
   * The window width (px) at which the SideNav is expanded and the hamburger menu is hidden
   * 1056 represents the "large" breakpoint in pixels from the Carbon Design System:
   * small: 320
   * medium: 672
   * large: 1056
   * x-large: 1312
   * max: 1584
   */
  export let expansionBreakpoint = 1056;

  /** Obtain a reference to the HTML anchor element */
  export let ref = null;

  /**
   * Specify the icon to render for the closed state.
   * Defaults to `<Menu size={20} />`
   * @type {typeof import("svelte").SvelteComponent}
   */
  export let iconMenu = Menu;

  /**
   * Specify the icon to render for the opened state.
   * Defaults to `<Close size={20} />`
   * @type {typeof import("svelte").SvelteComponent}
   */
  export let iconClose = Close;

  export let logo = undefined;
  export let logoMarginLeft = "0rem";
  export let logoMarginRight = "0rem";
  export let headerColor = "#161616";
  export let titleColor = "#ffffff";
  export let subTitleColor = "#ffffff";

  import Menu from "carbon-components-svelte/src/icons/Menu.svelte";
  import Close from "carbon-components-svelte/src/icons/Close.svelte";
  import HamburgerMenu from "carbon-components-svelte/src/UIShell/HamburgerMenu.svelte";
  import { shouldRenderHamburgerMenu } from "carbon-components-svelte/src/UIShell/navStore.js";
  import { _ } from "svelte-i18n";
  import { searchActive } from "./search-active";

  
  //import Close from "../icons/Close.svelte";
  //import Menu from "../icons/Menu.svelte";
  //import { shouldRenderHamburgerMenu } from "./navStore";
  //import HamburgerMenu from "./HamburgerMenu.svelte";

  let winWidth = undefined;

  $: isSideNavOpen =
    expandedByDefault &&
    winWidth >= expansionBreakpoint &&
    !persistentHamburgerMenu;
  $: ariaLabel = company
    ? `${company} `
    : "" + (uiShellAriaLabel || $$props["aria-label"] || platformName);

  /**
   * Parse a hex color string (#rgb, #rrggbb, #rrggbbaa) into an {r,g,b} object.
   * Returns null when the value is not a hex color.
   */
  function hexToRgb(color) {
    if (typeof color !== "string") return null;
    let hex = color.trim().replace(/^#/, "");
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split("").map((c) => c + c).join("");
    }
    if (hex.length !== 6 && hex.length !== 8) return null;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].some((v) => Number.isNaN(v))) return null;
    return { r, g, b };
  }

  /**
   * Derive a "similar but different" hover tint from the header color:
   * lighten dark colors and darken light colors so the hover is always visible.
   */
  function computeHoverColor(color) {
    const rgb = hexToRgb(color);
    if (!rgb) return `color-mix(in srgb, ${color}, #ffffff 13%)`;
    const { r, g, b } = rgb;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const target = luminance < 0.5 ? 255 : 0;
    const amount = 0.13;
    const mix = (c) => Math.round(c + (target - c) * amount);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
  }

  $: headerHoverColor = computeHoverColor(headerColor);
  $: headerStyle =
    `background-color:${headerColor};` +
    `--tosti-header-color:${headerColor};` +
    `--tosti-header-hover:${headerHoverColor};`;
</script>

<svelte:window bind:innerWidth="{winWidth}" />

<header aria-label="{ariaLabel}" class:bx--header="{true}" style={headerStyle}>
  <slot name="skip-to-content" />
  {#if logo !== undefined}
    <img class="logo" src={logo} alt={$_("general.logoAlt")} style="margin-left:{logoMarginLeft};margin-right:{logoMarginRight}" />
  {/if}
  {#if ($shouldRenderHamburgerMenu && winWidth < expansionBreakpoint) || persistentHamburgerMenu}
    <HamburgerMenu
      bind:isOpen="{isSideNavOpen}"
      iconClose="{iconClose}"
      iconMenu="{iconMenu}"
    />
  {/if}
  <a
    href="{href}"
    class:bx--header__name="{true}"
    class:search-active="{$searchActive}"
    bind:this="{ref}"
    {...$$restProps}
    on:click
  >
    {#if company}
      <span class:bx--header__name--prefix="{true}" style={titleColor ? `color:${titleColor};` : undefined}>{company}&nbsp;</span>
    {/if}
    <span class="header-subtitle" style={subTitleColor ? `color:${subTitleColor};` : undefined}>
      <slot name="platform">{platformName}</slot>
    </span>
  </a>
  <slot />
</header>

<style>
    .logo {
        max-height: 2.5rem;
        margin: 0.5rem;
    }

    /* Header utility buttons (language, github) match the header background,
       with a similar-but-different tint on hover / when active. */
    :global(.bx--header .bx--header__action:hover),
    :global(.bx--header .bx--header__action--active),
    :global(.bx--header .bx--header__action--active:hover) {
        background-color: var(--tosti-header-hover);
    }

    /* Search box: collapsed state blends with the header, expanded/active state
       uses the hover tint. */
    :global(.bx--header .bx--header__search:not(.bx--header__search--active)) {
        background-color: var(--tosti-header-color);
    }

    :global(.bx--header .bx--header__search) {
        background-color: var(--tosti-header-hover);
    }

    :global(.bx--header__name) {
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .header-subtitle {
        overflow: hidden;
        text-overflow: ellipsis;
    }

    @media (max-width: 42rem) {
        .header-subtitle {
            display: none;
        }

        :global(.bx--header__name.search-active) {
            display: none;
        }
    }
</style>