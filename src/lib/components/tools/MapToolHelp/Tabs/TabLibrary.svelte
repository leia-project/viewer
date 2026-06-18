<script lang="ts">   
    export let _: any;
    export let base: string;
</script>

<div class="img-library">
    <img src="{base}/images/help_library_1.png" alt="library icon" />
</div>

<div class="body-02">
    {$_("tools.help.library.description")}<br /><br />
</div>

<div class="heading-02">{$_("tools.help.library.headingLibraryOpen")}</div>
<div class="body-02">
    {$_("tools.help.library.openLibrary")}<br /><br />
</div>

<div class="heading-02">{$_("tools.help.library.headingUsingLibrary")}</div>
<div class="body-02">
    {$_("tools.help.library.libraryDescription")}<br /><br />
</div>

<img src="{base}/images/help_library_2.png" style="width:100%" alt="library view" />
