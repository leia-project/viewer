<script lang="ts">
	import { _ } from "svelte-i18n";
	import {
		OverflowMenuVertical,
		ArrowUp,
		ArrowDown,
		ChooseItem,
		Rotate
	} from "carbon-icons-svelte";
	import type { Map } from "$lib/map-cesium/map";
	import Button from "$lib/components/theme/Button/Button.svelte";
	import Divider from "$lib/components/theme/Divider/Divider.svelte";

	export let map: Map;

	const configLoaded = map.configLoaded;
	const use3DMode = map.options.use3DMode;

	let expanded = false;

	$: accessibility = $configLoaded ? map.viewerSettings?.accessibility : undefined;
	$: enabled = accessibility?.trackpadMode === true;
	$: stepAngle = Number(accessibility?.trackpadStepAngle) || 5;
	$: stepHeightFactor = Number(accessibility?.trackpadStepHeightFactor) || 0.1;
</script>

{#if enabled}
	<Divider direction="vertical"></Divider>
	<div class="trackpad-controls">
		{#if expanded}
			<div class="trackpad-buttons">
				<Button
					kind="secondary"
					class="icon-rotate-up"
					icon={ChooseItem}
					on:click={() => map.adjustHeight(stepHeightFactor)}
					tooltipPosition="left"
					iconDescription={$_("tools.help.movement.buttonsHeightUp")}
				/>
				<Button
					kind="secondary"
					class="icon-rotate-down"
					icon={ChooseItem}
					on:click={() => map.adjustHeight(-stepHeightFactor)}
					tooltipPosition="left"
					iconDescription={$_("tools.help.movement.buttonsHeightDown")}
				/>
				<Button
					kind="secondary"
					icon={ArrowUp}
					disabled={!$use3DMode}
					on:click={() => map.adjustPitch(stepAngle)}
					tooltipPosition="left"
					iconDescription={$_("tools.help.movement.buttonsPitchUp")}
				/>
				<Button
					kind="secondary"
					icon={ArrowDown}
					disabled={!$use3DMode}
					on:click={() => map.adjustPitch(-stepAngle)}
					tooltipPosition="left"
					iconDescription={$_("tools.help.movement.buttonsPitchDown")}
				/>
				<Button
					kind="secondary"
					icon={Rotate}
					on:click={() => map.adjustHeading(-stepAngle)}
					tooltipPosition="left"
					iconDescription={$_("tools.help.movement.buttonsRotateLeft")}
				/>
				<Button
					kind="secondary"
					class="mirrored-icon"
					icon={Rotate}
					on:click={() => map.adjustHeading(stepAngle)}
					tooltipPosition="left"
					iconDescription={$_("tools.help.movement.buttonsRotateRight")}
				/>
			</div>
		{/if}
		<Button
			kind="secondary"
			icon={OverflowMenuVertical}
			aria-expanded={expanded}
			aria-label={expanded
				? $_("tools.help.movement.buttonsTrackpadHide")
				: $_("tools.help.movement.buttonsTrackpadShow")}
			on:click={() => {
				expanded = !expanded;
			}}
		/>
	</div>
{/if}

<style>
	.trackpad-controls {
		position: relative;
		display: flex;
	}

	.trackpad-buttons {
		position: absolute;
		bottom: 100%;
		right: 0;
		display: flex;
		flex-direction: column;
	}

	:global(.icon-rotate-up .bx--btn__icon) {
		transform: rotate(-90deg);
	}

	:global(.icon-rotate-down .bx--btn__icon) {
		transform: rotate(90deg);
	}

	:global(.mirrored-icon .bx--btn__icon) {
		transform: scaleX(-1);
	}
</style>
