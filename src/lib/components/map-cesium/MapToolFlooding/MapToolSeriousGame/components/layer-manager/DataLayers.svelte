<script lang="ts">
	import type { IRole } from "../../module/models";
	import BaseLayer from "./BaseLayer.svelte";
	import type { GameController } from "../../module/game-controller";

	export let role: IRole | undefined;
	export let mainLayerIds: Array<string>;
	export let gameController: GameController;

	const layers = gameController.map.layers;
	$: mainLayers = $layers.filter((l) => mainLayerIds.includes(l.id));
	$: roleLayers = $layers.filter((l) => role?.layerIds.includes(l.id)); 

</script>


<div class="layer-manager">
	<div>
		<div class="list-header">
			<span>Achtergrondlagen</span>
		</div>
		{#each mainLayers as mL}
			<BaseLayer layer={mL}></BaseLayer>
		{/each}
	</div>
	{#if role}
		<div class="divider"></div>
		<div>
			<div class="list-header">
				<div class="role-icon">
					{@html role?.svgIcon}
				</div>
				<span>{role?.role}</span>
			</div>
			{#if roleLayers.length > 0}
				<div>
					{#each roleLayers as rL}
						<BaseLayer layer={rL}></BaseLayer>
					{/each}
				</div>
			{:else}
				<div>Geen specifieke kaartlagen voor deze rol</div>
			{/if}
		</div>
	{/if}
</div>


<style>

	.layer-manager {
		margin: 1rem 0;
		min-width: 300px;
	}

	.list-header {
		display: flex;
		align-items: center;
		column-gap: 0.5rem;
		font-weight: 500;
		font-size: 1rem;
		color: var(--game-color-highlight);
		margin-bottom: 0.5rem;
	}

	.role-icon {
		background-color: transparent;
		padding: 0.45rem;
		border-radius: 50%;
		background-color: var(--game-color-highlight);
	}

	:global(.role-icon svg) {
		display: block;
		margin: 0 auto;
		width: 20px;
		height: 20px;
		filter: drop-shadow(0 0 2px #054569);
	}

	.divider {
		border-top: 1px solid lightslategray;
		margin: 1rem 1rem;
	}

</style>