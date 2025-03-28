<script lang="ts">
    export let roleData;
    export let mainLayerData;

    // const layerConfig = this.map.layerLibrary.findLayer("1");
</script>

<section>
    <span><strong>{roleData.role}</strong></span>
    <br><br>
    <div>
        <span>Main layers</span>
        {#each mainLayerData as mainLayer}
            <p>
                <input type="checkbox" id="myCheckbox">
                <label for="myCheckbox">{mainLayer}</label>
            </p>
        {/each}
    </div>
    <br><br>
    <div>
        <span>Role specific layers</span>
        {#each roleData.layersIds as layerId}
            <p>
                <input type="checkbox" id="myCheckbox">
                <label for="myCheckbox">{layerId}</label>
            </p>
        {/each}
    </div>
</section>

<style>
    section {
        width: 500%;
        padding: 5%;
        background-color: white;
        border-radius: 10px;
    }

    span {
        font-size: 1.5em;
    }
</style>