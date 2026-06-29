<script lang="ts">
	import { Toggle, Button } from "carbon-components-svelte";
	import { Reset, ViewFilled, ViewOffFilled } from "carbon-icons-svelte";
	import { _ } from "svelte-i18n";
	import type { VoxelClipSlider } from "$lib/map-cesium/layers/voxel-clip-slider";

	export let clipSlider: VoxelClipSlider;

	const layerVisible = clipSlider.layer.visible;
	const active = clipSlider.active;
	const showPlane = clipSlider.showPlane;
</script>

{#if $layerVisible}
	<div class="clipper">
		<div class="clipper-checkbox">
			<span class="label-02">{$_("tools.voxel.slicePlane")}</span>
			<Toggle
				toggled={$active}
				hideLabel={true}
				on:toggle={() => {
					if ($layerVisible) active.set(!$active);
				}}
				labelA={$_("general.off")}
				labelB={$_("general.on")}
			/>

			{#if $active}
				<div class="top-buttons">
					<Button
						iconDescription={$_("general.buttons.reset")}
						icon={Reset}
						tooltipPosition="bottom"
						tooltipAlignment="center"
						size="field"
						on:click={() => clipSlider.reset()}
					/>
					
					<Button
						iconDescription={$showPlane ? $_("general.buttons.hide") : $_("general.buttons.show")}
						icon={$showPlane ? ViewOffFilled : ViewFilled}
						tooltipPosition="bottom"
						tooltipAlignment="end"
						size="field"
						on:click={() => showPlane.set(!$showPlane)}
					/>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.clipper-checkbox {
		display: flex;
		align-items: center;
		column-gap: var(--cds-spacing-03);
	}

	.top-buttons {
		display: flex;
		margin-left: auto;
	}
</style>
