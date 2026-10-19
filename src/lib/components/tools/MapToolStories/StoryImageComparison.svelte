<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { _ } from "svelte-i18n";
	import { ChevronLeft, ChevronRight } from "carbon-icons-svelte";
	import type { StoryMarkerImage } from "./story-marker";

	export let before: StoryMarkerImage;
	export let after: StoryMarkerImage;

	const dispatch = createEventDispatcher<{ error: string }>();
	let position = 50;
	$: beforeLabel = before.label ?? $_("tools.stories.comparisonBefore");
	$: afterLabel = after.label ?? $_("tools.stories.comparisonAfter");
</script>

<div class="comparison">
	<img
		class="comparison-before"
		src={before.url}
		alt={beforeLabel}
		draggable="false"
		on:error={() => dispatch("error", before.url)}
	/>
	<img
		class="comparison-after"
		src={after.url}
		alt={afterLabel}
		draggable="false"
		style:clip-path={`inset(0 0 0 ${position}%)`}
		on:error={() => dispatch("error", after.url)}
	/>
	<span class="comparison-label before-label">{beforeLabel}</span>
	<span class="comparison-label after-label">{afterLabel}</span>
	<div class="comparison-divider" style:left={`${position}%`} aria-hidden="true">
		<span class="comparison-handle">
			<ChevronLeft size={16} /><ChevronRight size={16} />
		</span>
	</div>
	<input
		type="range"
		class="comparison-slider"
		min="0"
		max="100"
		step="1"
		bind:value={position}
		aria-label={$_("tools.stories.comparisonSlider")}
		aria-valuetext={$_("tools.stories.comparisonPosition", {
			values: {
				before: beforeLabel,
				after: afterLabel,
				beforeValue: position,
				afterValue: 100 - position
			}
		})}
	/>
</div>

<style>
	.comparison {
		position: relative;
		overflow: hidden;
		max-width: 90vw;
		background: #262626;
	}

	.comparison-before {
		display: block;
		max-width: min(960px, 90vw);
		max-height: calc(100dvh - 10rem);
	}

	.comparison-after {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.comparison-label {
		position: absolute;
		top: 0.75rem;
		max-width: 40%;
		padding: 0.25rem 0.5rem;
		background: rgba(0, 0, 0, 0.7);
		color: #ffffff;
		font-size: 0.875rem;
		overflow-wrap: anywhere;
		pointer-events: none;
	}

	.before-label {
		left: 0.75rem;
	}

	.after-label {
		right: 0.75rem;
	}

	.comparison-divider {
		position: absolute;
		inset-block: 0;
		width: 2px;
		background: #ffffff;
		transform: translateX(-50%);
		box-shadow: 0 0 3px #161616;
		pointer-events: none;
	}

	.comparison-handle {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		background: #ffffff;
		color: #161616;
		box-shadow: 0 0 3px #161616;
	}

	.comparison-slider {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		opacity: 0;
		cursor: ew-resize;
		touch-action: none;
	}

	.comparison:focus-within {
		outline: 2px solid var(--cds-focus, #0f62fe);
		outline-offset: 2px;
	}
</style>
