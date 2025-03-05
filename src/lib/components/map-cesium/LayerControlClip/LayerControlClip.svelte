<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Toggle, Slider, Button } from "carbon-components-svelte";
	import Reset from "carbon-icons-svelte/lib/Reset.svelte";
	import ViewFilled from "carbon-icons-svelte/lib/ViewFilled.svelte";
	import ViewOffFilled from "carbon-icons-svelte/lib/ViewOffFilled.svelte";



	import type { ClipSlider } from "./clip-slider";


	export let clipSlider: ClipSlider;

	let layerVisible = clipSlider.layer.visible;
	let clipActive = clipSlider.active;
	let showSlider = clipSlider.showSlider;
	let sliderXY = clipSlider.angleXY;
	let sliderZ = clipSlider.angleZ;

	let heightSliceActive = clipSlider.heightSliceActive;
	let minSliceHeight = clipSlider.minSliceHeight;
	let maxSliceHeight = clipSlider.maxSliceHeight;
	let heightSliceHeight = clipSlider.heightSliceHeight;
</script>


{#if $layerVisible}
	<div class="slicer">
		<div class="slicer-checkbox">
			<span class="label-02">Slicer</span>
			<Toggle
				toggled={$clipActive}
				hideLabel={true}
				on:toggle={() => {
					if ($layerVisible) clipActive.set(!$clipActive)
				}}
				labelA={$_("general.off")}
				labelB={$_("general.on")}
			/>
			<!-- Finn Testing -->
			<span class="label-02">Test</span>
			<Toggle
			toggled={$heightSliceActive}
			hideLabel={true}
			on:toggle={() => {
				if ($layerVisible) heightSliceActive.set(!$heightSliceActive);
			}}
			labelA={$_("general.off")}
			labelB={$_("general.on")}
			/>
			<div class="top-buttons">
				{#if $clipActive}
					{#if ($sliderXY !== 180 || $sliderZ !== 0)}
					<Button
						iconDescription={$_("general.buttons.reset")}
						icon={Reset}
						tooltipPosition="bottom"
						tooltipAlignment="center"
						size="field"
						on:click={() => clipSlider.reset()}
					/>
					{/if}
				<Button
					iconDescription={$showSlider ? $_("general.buttons.hide") :  $_("general.buttons.show")}
					icon={$showSlider ? ViewOffFilled : ViewFilled}
					tooltipPosition="bottom"
					tooltipAlignment="end"
					size="field"
					on:click={() => clipSlider.showSlider.set(!$showSlider)}
				/>
				{/if}
			</div>
		</div>

		{#if $clipActive }
			<div class="clip-angle-sliders">
				<div class="slider-label">{$_("tools.layerTools.slicer.rotationVerticalAxis")}</div>
				<Slider
					bind:value={$sliderXY}
					min={0}
					max={360}
					step={1}
					hideTextInput={true}
					id="slider-1"
				/>
				<div class="slider-label">{$_("tools.layerTools.slicer.rotationHorizontalAxis")}</div>
				<Slider
					bind:value={$sliderZ}
					min={-90}
					max={90}
					step={1}
					hideTextInput={true}
				/>
			</div>
		{/if}
	</div>
{/if}


<style>

	.slicer {
		margin: 10px 0 15px;
		background-color: var(--cds-ui-01);
		border-radius: 5px;
	}
	.slicer-checkbox {
		display: flex;
		align-items: center;
		column-gap: 20px;
		margin-bottom: 10px;
		padding-left: 10px;
	}
	.label-02 {
		padding: 15px 0;
	}

	.clip-angle-sliders {
		padding: 0 10px 10px;
	}

	.slider-label {
		width: 100%;
		text-align: center;
		display: block;
		color: #565656;
		font-size: 14px;
		margin-top: 10px;
	}

	.clip-angle-sliders :global(.bx--slider-container) {
		width: 100% !important;
	}
	.clip-angle-sliders :global(.bx--slider) {
		min-width: 100px !important;
	}
</style>