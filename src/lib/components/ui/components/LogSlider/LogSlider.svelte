<script lang="ts">
	import { Slider } from "carbon-components-svelte";
	import { scaleLog } from "d3-scale";

	/** Bound value in real units; the log mapping stays internal.
	    Undefined is tolerated so a not-yet-initialized store can be bound. */
	export let value: number | undefined;
	export let min = 1;
	export let max = 100;
	export let labelText = "";
	/** Appended to tick labels, e.g. "×" or "m". */
	export let unit = "";
	/** Tick values in real units; defaults to a 1-2-5 series over [min, max]. */
	export let ticks: number[] | undefined = undefined;

	$: scale = scaleLog().domain([min, max]).range([0, 100]);
	$: tickValues = ticks ?? defaultTicks(min, max);

	function defaultTicks(lo: number, hi: number): number[] {
		const out: number[] = [];
		for (let mag = Math.pow(10, Math.floor(Math.log10(lo))); mag <= hi; mag *= 10) {
			for (const mantissa of [1, 2, 5]) {
				const v = mantissa * mag;
				if (v >= lo && v <= hi) out.push(v);
			}
		}
		if (out[0] !== lo) out.unshift(lo);
		if (out[out.length - 1] !== hi) out.push(hi);
		return out;
	}

	let pos = 0;

	function toValue(p: number): number {
		return Number(scale.invert(p).toPrecision(2));
	}

	// Only depends on `value`: pos is read inside the function, so dragging
	// the slider does not re-trigger this and snap the thumb back to the
	// stale bound value.
	$: syncFromValue(value);

	function syncFromValue(v: number | undefined) {
		if (v !== undefined && v !== toValue(pos)) {
			pos = Math.round(scale(v));
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
		bind:value={pos}
		on:change={() => (value = toValue(pos))}
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
		height: 1rem;
		margin: -0.5rem 1rem 0;
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
		top: -0.25rem;
		left: 50%;
		width: 1px;
		height: 0.25rem;
		background: currentColor;
	}
</style>
