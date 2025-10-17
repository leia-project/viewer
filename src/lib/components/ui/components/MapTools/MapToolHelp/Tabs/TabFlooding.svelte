<script lang="ts">    
    export let _: any;
    export let base: string; 
</script>


<div class="img-left">
    <img src="{base}/images/help_flood_open.png" alt="flood icon" />
</div>

<div class="body-02">
    {$_("tools.help.flood.description")}
</div>

<div class="heading-02">{$_("tools.help.flood.headingFloodOpen")}</div>
<div class="body-02">
    {$_("tools.help.flood.openFlood")}
</div>

<div class="heading-02">{$_("tools.help.flood.headingUsingFlood")}</div>
<div class="body-02">
    {$_("tools.help.flood.floodBreachDescription")}
</div>

<div class="img">
    <img src="{base}/images/help_flood_breach.png" style="width:100%" alt="breach selection" />
</div>

<div class="img-left">
    <img src="{base}/images/help_flood_menu.png" style="height:500px" alt="flood view" />
</div>

<div class="body-02">
    {$_("tools.help.flood.floodMenuDescription")}
</div>

<div class="heading-02">{$_("tools.help.flood.headingMeasureDepth")}</div>
<div class="body-02">
    {$_("tools.help.flood.measureDepthDescription")}
</div>


<style>
    [class*="img"] {
        border: 1px solid var(--cds-ui-03);
        margin-bottom: var(--cds-spacing-03);
        margin-top: var(--cds-spacing-03);
    }

    .img-left {
        width: fit-content;
    }

    .body-02 {
        margin-bottom: var(--cds-spacing-05);
    }

</style>