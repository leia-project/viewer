<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { IRole } from "../../module/models";
	import BaseLayer from "./BaseLayer.svelte";
	import type { GameController } from "../../module/game-controller";

	export let role: IRole | undefined;
	export let generalLayerIds: Array<string>;
	export let gameController: GameController;

	const layers = gameController.map.layers;
	$: mainLayers = $layers.filter((l) => generalLayerIds.includes(l.id));
	$: roleLayers = $layers.filter((l) => role?.layerIds.includes(l.id)); 

	const activeGame = gameController.active;
	$: hexagonLayer = $activeGame?.evacuationController.hexagonLayer;
	$: measureToggled = $activeGame?.evacuationController.roadNetwork.measureToggled;

</script>


<div class="layer-manager">
	<div>
		<div class="list-header">Datasets</div>
		{#each mainLayers as mL}
			<BaseLayer
				visible={mL.visible}
				title={mL.title}
			/>
		{/each}
		{#if hexagonLayer}
			<BaseLayer
				visible={hexagonLayer.visible}
				title={hexagonLayer.title}
			/>
		{/if}
		{#if measureToggled}
			<BaseLayer
				visible={measureToggled}
				title={$_("game.measures")}
			/>
		{/if}
	</div>
	{#if role}
		<div class="divider"></div>
		<div>
			<div class="list-header">
				<div class="role-icon">
					{@html role.svgIcon}
				</div>
				<span>{$_(`game.roles.${role.role}`, { default: role.role })}</span>
			</div>
			{#if roleLayers.length > 0}
				<div>
					{#each roleLayers as rL}
						<BaseLayer
							visible={rL.visible}
							title={rL.title}
						/>
					{/each}
				</div>
			{:else}
				<div>{$_("game.menu.noLayersForRole")}</div>
			{/if}
		</div>
	{/if}
</div>


<style>

	.layer-manager {
		margin-top: 1rem;
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