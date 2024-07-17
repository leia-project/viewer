<script lang="ts">
    import { setContext } from "svelte";
    import {
        HeaderUtilities,
        HeaderNav,
        SideNav,
        SideNavItems
    } from "carbon-components-svelte";
    import CarbonHeader from "./CarbonHeader.svelte";

    export let company: string | undefined = undefined;
    export let platformName: string | undefined = undefined;
    export let logo: any | undefined = undefined;
    export let logoMarginLeft = "0rem";
    export let logoMarginRight = "0rem";
    export let persistantHamburgerMenu: boolean = false;
    export let isSideNavOpen: boolean = true;

</script>

<CarbonHeader {logo} {logoMarginLeft} {logoMarginRight} {company} {platformName} bind:isSideNavOpen persistentHamburgerMenu={persistantHamburgerMenu}>
    
    {#if $$slots.headerNav}
        <HeaderNav>
            <slot name="headerNav" />
        </HeaderNav>
    {/if}

    {#if $$slots.headerUtilities}
        <HeaderUtilities>
            <slot name="headerUtilities" />
        </HeaderUtilities>
    {/if}
</CarbonHeader>

{#if $$slots.sideNav}
    <SideNav bind:isOpen={isSideNavOpen}>
        <SideNavItems>
            <slot name="sideNav" />
        </SideNavItems>
    </SideNav>
{/if}

