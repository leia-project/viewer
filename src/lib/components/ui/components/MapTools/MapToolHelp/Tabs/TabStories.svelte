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