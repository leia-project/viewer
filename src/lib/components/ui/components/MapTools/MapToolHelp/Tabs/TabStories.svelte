<script lang="ts">
    export let _: any;
    export let base: string; 
</script>


<div class="heading-04">{$_("tools.help.tabs.stories")}</div>

<div class="body-02">
    {$_("tools.help.stories.description")}
</div>

<div class="heading-02">{$_("tools.help.stories.headingOpenStories")}</div>
<div class="body-02">
    {$_("tools.help.stories.openStories")}
</div>

<div class="img-left">
    <img src="{base}/images/help_story_menu.png" alt="story menu" />
</div>


<div class="heading-02">{$_("tools.help.stories.headingStoryNavigation")}</div>
<div class="body-02">
    {$_("tools.help.stories.storyNavigation")}
</div>

<div class="img">
    <img src="{base}/images/help_story_navigation.png" style="width:100%" alt="story navigation" />
</div>

<div class="heading-02">{$_("tools.help.stories.headingStoryDrawArea")}</div>
<div class="body-02">
    {$_("tools.help.stories.storyDrawArea")}
</div>

<div class="img">
    <img src="{base}/images/help_story_draw_area.png" style="width:100%" alt="story draw area" />
</div>

<div class="heading-02">{$_("tools.help.stories.headingStoryUploadArea")}</div>
<div class="body-02">
    {$_("tools.help.stories.storyUploadArea")}
</div>

<div class="img">
    <img src="{base}/images/help_story_upload_area.png" style="width:100%" alt="story upload area" />
</div>

<div class="heading-02">{$_("tools.help.stories.headingStoryDataDonut")}</div>
<div class="body-02">
    {$_("tools.help.stories.storyDataDonut")}
</div>

<div class="img">
    <img src="{base}/images/help_story_data_donut.png" style="width:100%" alt="story data donut" />
</div>

<div class="heading-02">{$_("tools.help.stories.headingStoryExportPDF")}</div>
<div class="body-02">
    {$_("tools.help.stories.storyExportPDF")}
</div>

<div class="img-left">
    <img src="{base}/images/help_story_export_pdf.png" alt="story PDF export" />
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