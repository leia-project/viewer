<!-- @component Carbon Slider on a logarithmic scale: `value` binds in real units while the thumb moves in log space, useful for displaying data across multiple orders of magnitude -->
<script lang="ts">
	import { Slider } from "carbon-components-svelte";
	import { scaleLog } from "d3-scale";

	export let value: number | undefined;
	export let min = 1;
	export let max = 100;
	export let labelText = "";
	export let unit = "";
	export let ticks: number[] | undefined = undefined;

	$: scale = scaleLog().domain([min, max]).range([0, 100]);
	$: tickValues = ticks ?? defaultTicks(min, max);

	function defaultTicks(lo: number, hi: number) {
		const exponent = Math.floor(Math.log10(lo));
		const firstDecade = 10 ** exponent;

		const ticks = [lo];
		for (let decade = firstDecade; decade <= hi; decade *= 10) {
			for (const step of [1, 2, 5]) {
				const tick = step * decade;
				if (tick > lo && tick < hi) {
					ticks.push(tick);
				}
			}
		}
		ticks.push(hi);

		return ticks;
	}

	let position = 0;

	function toValue(p: number): number {
		return Number(scale.invert(p).toPrecision(2));
	}

	$: syncFromValue(value);

	function syncFromValue(v: number | undefined) {
		if (v !== undefined && v !== toValue(position)) {
			position = Math.round(scale(v));
		}
	}
</script>

<div class="log-slider">
	<Slider
		hideTextInput
		{labelText}
		min={0}
		max={100}
		minLabel=" "
		maxLabel=" "
		bind:value={position}
		on:change={() => {
			value = toValue(position);
		}}
		step={1}
	/>

	<div class="ticks" aria-hidden="true">
		{#each tickValues as tick}
			<span class="tick" style="left: {scale(tick)}%">{tick}{unit}</span>
		{/each}
	</div>
</div>

<style>
	/* the tick row replaces Carbon's min/max range labels */
	.log-slider :global(.bx--slider__range-label) {
		display: none;
	}

	/* let the track fill the panel; with the same 1rem side margins as
	   .ticks below, tick percentages line up with the track */
	.log-slider :global(.bx--slider-container) {
		width: 100%;
	}

	.log-slider :global(.bx--slider) {
		width: 100%;
	}

	/* same horizontal margin as .bx--slider so tick percentages line up
	   with the track */
	.ticks {
		position: relative;
		height: var(--cds-spacing-05);
		/* side margin must equal .bx--slider's 1rem margin (= spacing-05) */
		margin: calc(-1 * var(--cds-spacing-03)) var(--cds-spacing-05) 0;
	}

	.tick {
		position: absolute;
		transform: translateX(-50%);
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--cds-text-02, #525252);
	}

	.tick::before {
		content: "";
		position: absolute;
		top: calc(-1 * var(--cds-spacing-02));
		left: 50%;
		width: 1px;
		height: var(--cds-spacing-02);
		background: currentColor;
	}
</style>
