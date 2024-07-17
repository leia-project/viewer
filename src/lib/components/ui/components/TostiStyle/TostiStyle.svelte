<script lang="ts">
    import "carbon-components-svelte/css/all.css";
    //import "carbon-components-svelte/css/white.css";
    import { Theme } from "carbon-components-svelte";
    import { light } from "../../style/themes";
    import { onMount } from "svelte";

    onMount(() => {
        if (!mounted) {
            mounted = true;
        }

        // disable focus state on elements
        document.addEventListener(
            "focus",
            function (e) {
                if (e && e.target) {
                    const element = e.target as HTMLInputElement;
                    if (element.type === "button" || element.type === "radio" || element.type === "checkbox" || element.role === "tab") {
                        (e.target as HTMLElement).blur();
                    }
                }
            },
            true
        );
        //document.documentElement.setAttribute("theme", "white");
    });

    //https://github.com/carbon-design-system/carbon-website-archive/blob/686cf6bb93ffd709844ae8673a283f35ea8efedf/src/data/guidelines/color-tokens.js
    //https://github.com/carbon-design-system/carbon/blob/v10.7.0/packages/themes/scss/generated/_themes.scss#L14-L454
    //https://themes.carbondesignsystem.com/?nav=accordion

    export let style = light;

    $: mounted = false;
</script>

{#if mounted}
    <div class="theme">
        <Theme theme="white" bind:tokens={style} />
    </div>
{/if}

<style lang="scss">
    :global {
        @import "../../style/tosti.scss";
    }

    .theme {
        display: none;
    }
</style>
