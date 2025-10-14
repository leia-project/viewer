<script lang="ts">
    export let _: any;
    export const base = process.env.APP_URL;
</script>

<div class="heading-02">{$_("tools.help.movement.headingZoom")}</div>
<div class="video">
    <video autoplay loop muted style="width:100%">
        <source src="{base}/images/movement.mp4" type="video/mp4" />
    </video>
</div>
<div class="body-02">
    {$_("tools.help.movement.zoomDescription")}<br />
    {$_("tools.help.movement.zoomOption1")}<br />
    {$_("tools.help.movement.zoomOption2")}<br />
    {$_("tools.help.movement.zoomOption3")}<br /><br />
</div>

<div class="heading-02">{$_("tools.help.movement.headingRotatePitch")}</div>

<div class="body-02">
    {$_("tools.help.movement.rotatePitchDescription")} <br />
    {$_("tools.help.movement.rotatePitchOption1")} <br />
    {@html $_("tools.help.movement.rotatePitchOption2")}<br /><br />
</div>

<div class="heading-02">{$_("tools.help.movement.headingButtons")}</div>
<div class="body-02">{$_("tools.help.movement.buttonsDescription")}</div>

<div class="button">
    <img src="{base}/images/map_home.png" alt="home" />
    <div class="body-01">{$_("tools.help.movement.buttonsHome")}</div>
</div>

<div class="button">
    <img src="{base}/images/map_compass.png" alt="compass" />
    <div class="body-01">{$_("tools.help.movement.buttonsCompass")}</div>
</div>

<div class="button">
    <img src="{base}/images/map_zoom_in.png" alt="zoom-in" />
    <div class="body-01">{$_("tools.help.movement.buttonsZoomIn")}</div>
</div>
<div class="button">
    <img src="{base}/images/map_zoom_out.png" alt="zoom-out" />
    <div class="body-01">{$_("tools.help.movement.buttonsZoomOut")}</div>
</div>

<style>
    .video {
        margin-top: var(--cds-spacing-05);
        margin-left: var(--cds-spacing-05);
        width: 100%;
        text-align: center;
    }

    video {
    border: 1px solid var(--cds-ui-03);
    float: right;
    }
    
    .button {
        display: flex;
        margin-top: var(--cds-spacing-03);
    }

    .button .body-01 {
        padding-left: var(--cds-spacing-05);
        height: 100%;
        padding-top: var(--cds-spacing-04);
    }
</style>