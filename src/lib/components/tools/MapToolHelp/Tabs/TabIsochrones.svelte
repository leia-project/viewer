<script lang="ts">
    export let _: any;
    export let toolTitle: string;

</script>


<div class="heading-04">{toolTitle}</div>

<div class="body-02">
    {$_("tools.help.isochrones.description", { values: { title: toolTitle } })}
</div>
