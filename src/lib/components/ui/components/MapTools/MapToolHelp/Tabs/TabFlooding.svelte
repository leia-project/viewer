<script lang="ts">    
    export let _: any;
    export let base: string; 
</script>

<div class="img-library">
    <img src="{base}/images/help_flood_open.png" alt="flood icon" />
</div>

<div class="body-02">
    {$_("tools.help.flood.description")}<br /><br />
</div>

<div class="heading-02">{$_("tools.help.flood.headingFloodOpen")}</div>
<div class="body-02">
    {$_("tools.help.flood.openFlood")}<br /><br />
</div>

<div class="heading-02">{$_("tools.help.flood.headingUsingFlood")}</div>
<div class="body-02">
    {$_("tools.help.flood.floodBreachDescription")}<br /><br />
</div>

<img src="{base}/images/help_flood_breach.png" style="width:100%" alt="breach selection" />

<br /> <br />

<div class="img-library">
    <img src="{base}/images/help_flood_menu.png" style="height:500px" alt="flood view" />
</div>

<div class="body-02">
    {$_("tools.help.flood.floodMenuDescription")}<br /><br />
</div>

<div class="heading-02">{$_("tools.help.flood.headingMeasureDepth")}</div>
<div class="body-02">
    {$_("tools.help.flood.measureDepthDescription")}<br /><br />
</div>

<style>
    .img-library {
        float: right;
        border: 1px solid var(--cds-ui-03);
        margin-left: var(--cds-spacing-05);
    }
</style>