<script lang="ts">
    import { _ } from "svelte-i18n";
 	import { Pedestrian, Home, Add, Plane, Subtract, Compass } from "carbon-icons-svelte";
    import Button from "../Button/Button.svelte";
    import Divider from "../Divider/Divider.svelte";
	import type { Map } from "$lib/components/map-cesium/module/map";

    export let map: Map;
    export let place: string = "bottom-right";

    function mapZoomIn() {
        map.zoomIn();
    }

    function mapZoomOut() {
        map.zoomOut();
    }

    function mapCenter() {
        map.home();
    }

    function mapResetNorth() {
        map.resetNorth();
    }

</script>

<div
    class="wrapper"
    id="navfooter"
    class:bottom-right={place === "bottom-right"}
    class:bottom-left={place === "bottom-left"}
    class:top-right={place === "top-right"}
    class:top-left={place === "top-left"}
>
    <Button
        kind="secondary"
        icon={Plane}
        on:click={(e) => {
            map.addFlyCamera();
            map.flyCamera?.bringToFlyingPOV()
        }}
        tooltipPosition="top"
        iconDescription={map.flyCamera?.enabled ? undefined : $_("tools.help.movement.buttonsFlyMode")}
    />
    <Button
        kind="secondary"
        icon={Pedestrian}
        on:click={(e) => {
            map.addFlyCamera();
            map.flyCamera?.bringToGroundPOV()
        }}
        tooltipPosition="top"
        id="walkModeButton"
        iconDescription={$_("tools.help.movement.buttonsWalkMode")}
    />
    <Button
        kind="secondary"
        icon={Home}
        on:click={(e) => {
            mapCenter();
        }}
        tooltipPosition="top"
        iconDescription={$_("tools.help.movement.buttonsHome")}
    />
    <Button
        kind="secondary"
        icon={Compass}
        on:click={(e) => {
            mapResetNorth();
        }}
        tooltipPosition="top"
        iconDescription={$_("tools.help.movement.buttonsCompass")}
    />
    <Divider direction="vertical"></Divider>
    <Button
        kind="secondary"
        icon={Subtract}
        on:click={(e) => {
            mapZoomOut();
        }}
        tooltipPosition="top"
        iconDescription={$_("tools.help.movement.buttonsZoomOut")}
    />
    <Button
        kind="secondary"
        icon={Add}
        on:click={(e) => {                
            mapZoomIn();
        }}
        tooltipAlignment="end"
        tooltipPosition="top"
        iconDescription={$_("tools.help.movement.buttonsZoomIn")}
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
