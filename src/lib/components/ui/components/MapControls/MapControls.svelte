<script lang="ts">
    import { getContext } from "svelte";
    import { get } from "svelte/store";
    import Home from "carbon-icons-svelte/lib/Home.svelte";
    import Add from "carbon-icons-svelte/lib/Add.svelte";
    import Subtract from "carbon-icons-svelte/lib/Subtract.svelte";
    import Compass from "carbon-icons-svelte/lib/Compass.svelte";
    import Button from "../Button/Button.svelte";
    import Divider from "../Divider/Divider.svelte";

    export let place: string = "bottom-right";

    const { app } = getContext<any>("page")

    $: map = get(app.map);

    function mapZoomIn() {
        map.zoomIn();
    }

    function mapZoomOut() {
        map.zoomOut();
    }

    function mapCenter() {
        map.options.use3DMode.set(true);
        map.home();
    }

    function mapResetNorth() {
        map.resetNorth();
    }
</script>

<div
    class="wrapper"
    class:bottom-right={place === "bottom-right"}
    class:bottom-left={place === "bottom-left"}
    class:top-right={place === "top-right"}
    class:top-left={place === "top-right"}
>
        <Button
        kind="secondary"
            icon={Home}
            on:click={(e) => {
                mapCenter();
            }}
        />
        <Button
        kind="secondary"
            icon={Compass}
            on:click={(e) => {
                mapResetNorth();
            }}
        />
        <Divider direction="vertical"></Divider>
        <Button
        kind="secondary"
            icon={Subtract}
            on:click={(e) => {
                mapZoomOut();
            }}
        />
        <Button
        kind="secondary"
            icon={Add}
            on:click={(e) => {                
                mapZoomIn();
            }}
        />
</div>

<style>
    .wrapper {
        position: absolute;
        display: flex;
        width: fit-content;
        height: fit-content;
    }

    .bottom-right {
        bottom: var(--cds-spacing-05);
        right: var(--cds-spacing-05);
    }

    .bottom-left {
        bottom: var(--cds-spacing-05);
        left: var(--cds-spacing-05);
    }

    .top-right {
        top: var(--cds-spacing-05);
        right: var(--cds-spacing-05);
    }

    .top-left {
        top: var(--cds-spacing-05);
        left: var(--cds-spacing-05);
    }
</style>
