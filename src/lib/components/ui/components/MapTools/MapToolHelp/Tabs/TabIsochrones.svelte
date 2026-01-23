<script lang="ts">
    import { _ } from "svelte-i18n";
    
    $: description = $_("tools.help.isochrones.description");

</script>


<div class="body-02">
    {description}
</div>
