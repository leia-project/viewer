<script lang="ts">
	import { onMount } from "svelte";
    import Cube from "carbon-icons-svelte/lib/Cube.svelte";

    export let header: string;
    export let thumbnail: string;

    let imageLoaded = false;
    let imageLoading = false;

    onMount(() => {
        const img = new Image();
        img.src = thumbnail;
        imageLoading = true;

        img.onload = () => {
            imageLoading = false;
            imageLoaded = true;
        };
})
</script>
<button class="card" on:click tabindex="0">
    {#if imageLoading}
        <div class="card-thumbnail loading"><Cube size={20} /></div>
    {/if}
    {#if imageLoaded}
        <img class="card-thumbnail" src="{thumbnail}" alt="{header}" />
    {/if}
    <div class="card-content">
        <div class="card-title">{header}</div>
    </div>
</button>

<style lang="scss">
    .card {
        display: flex;
        flex-direction: column;
        background-color: #ededed;
        cursor: pointer;
        border: 0;
        padding: 0;
    }
    .card:hover {
        box-shadow: 0 4px 4px 0 rgba(0, 0, 0, 0.1);
    }
    .card-content {
        padding: 10px;
        width: 100%;
    }
    .card-thumbnail {
        width: 100%;
        height: 200px;
        object-fit: cover;
        &.loading {
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #cccccc;
        }
    }
    .card-title {
        font-size: 1.5em;
    }
</style>
