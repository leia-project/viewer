<!-- Adapted from https://observablehq.com/@mootari/range-slider to svelte and to match Carbon's slider style -->
<script lang="ts">
	import { createEventDispatcher } from "svelte";

	export let min = 0;
	export let max = 1;
	export let step = 0.01;
	export let value: [number, number] = [min, max];
	export let label = "";
	export let format: (value: number) => string = (v) => v.toFixed(2);

	const dispatch = createEventDispatcher<{ change: [number, number] }>();

	type Handle = "min" | "max" | "band";

	let track: HTMLDivElement;
	let dragging: Handle | null = null;
	let startX = 0;
	let startValue: [number, number] = value;

	let trackRect: DOMRect;

	$: [lo, hi] = value;
	$: span = max - min || 1;
	$: minPercent = ((lo - min) / span) * 100;
	$: maxPercent = ((hi - min) / span) * 100;

	const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

	function quantize(v: number): number {
		return clamp(Math.round((v - min) / step) * step + min, min, max);
	}

	// Controlled component: never mutate `value`, just announce the next interval.
	function commit(a: number, b: number): void {
		const [nextLo, nextHi] = [Math.min(a, b), Math.max(a, b)] as const;

		if (nextLo !== lo || nextHi !== hi) {
			dispatch("change", [nextLo, nextHi]);
		}
	}

	function startDrag(event: PointerEvent, handle: Handle): void {
		dragging = handle;
		startX = event.clientX;
		startValue = [lo, hi];
		trackRect = track.getBoundingClientRect();
		event.preventDefault();
	}

	function onPointerMove(event: PointerEvent): void {
		if (!dragging) return;

		const delta = ((event.clientX - startX) / trackRect.width) * span;
		const [a, b] = startValue;

		if (dragging === "min") {
			commit(quantize(a + delta), b);
		} else if (dragging === "max") {
			commit(a, quantize(b + delta));
		} else {
			// Drag the band: move both ends together, keeping the window width.
			const width = b - a;
			const newLo = clamp(quantize(a + delta), min, max - width);
			commit(newLo, newLo + width);
		}
	}

	function onPointerUp(): void {
		dragging = null;
	}

	function onKey(event: KeyboardEvent, handle: "min" | "max"): void {
		const { key } = event;
		const dir =
			key === "ArrowRight" || key === "ArrowUp"
				? 1
				: key === "ArrowLeft" || key === "ArrowDown"
					? -1
					: 0;

		if (!dir) return;
		event.preventDefault();

		if (handle === "min") {
			commit(quantize(lo + dir * step), hi);
		} else {
			commit(lo, quantize(hi + dir * step));
		}
	}

	// Click on the empty track: jump the nearest handle to the click, then grab it.
	function onTrackDown(event: PointerEvent): void {
		const rect = track.getBoundingClientRect();
		const t = clamp((event.clientX - rect.left) / rect.width, 0, 1);
		const v = quantize(min + t * span);

		if (Math.abs(v - lo) <= Math.abs(v - hi)) {
			commit(v, hi);
			startDrag(event, "min");
		} else {
			commit(lo, v);
			startDrag(event, "max");
		}
	}
</script>

<svelte:window on:pointermove={onPointerMove} on:pointerup={onPointerUp} />

<div class="range">
	<div class="range-header">
		<span class="range-label">{label}</span>
		<output class="range-value">{format(lo)} – {format(hi)}</output>
	</div>

	<div class="range-row">
		<span class="end-label">0</span>

		<div class="track" bind:this={track} on:pointerdown={onTrackDown}>
			<div class="rail" />

			<div
				class="thumb"
				role="slider"
				tabindex="0"
				aria-label="{label} minimum"
				aria-valuemin={min}
				aria-valuemax={max}
				aria-valuenow={lo}
				style="left: {minPercent}%;"
				on:pointerdown|stopPropagation={(event) => startDrag(event, "min")}
				on:keydown={(event) => onKey(event, "min")}
			/>

			<div
				class="thumb"
				role="slider"
				tabindex="0"
				aria-label="{label} maximum"
				aria-valuemin={min}
				aria-valuemax={max}
				aria-valuenow={hi}
				style="left: {maxPercent}%;"
				on:pointerdown|stopPropagation={(event) => startDrag(event, "max")}
				on:keydown={(event) => onKey(event, "max")}
			/>

			<!-- after the thumbs so `.thumb:focus ~ .band` can highlight it -->
			<div class="band" style="left: {minPercent}%; width: {maxPercent - minPercent}%;" />
		</div>

		<span class="end-label">100</span>
	</div>
</div>

<style>
	.range {
		user-select: none;
		--thumb-size: 14px;
		--thumb-scale: calc(20 / 14);
	}

	.range-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--cds-spacing-03);
	}

	.range-label {
		font-size: var(--cds-label-01-font-size);
		letter-spacing: var(--cds-label-01-letter-spacing);
		color: var(--cds-text-02);
	}

	.range-value {
		font-family: var(--cds-code-02-font-family);
		font-size: var(--cds-code-02-font-size);
		letter-spacing: var(--cds-code-02-letter-spacing);
		color: var(--cds-text-01);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.range-row {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-05);
	}

	.end-label {
		flex-shrink: 0;
		font-family: var(--cds-code-02-font-family);
		font-size: var(--cds-code-02-font-size);
		letter-spacing: var(--cds-code-02-letter-spacing);
		color: var(--cds-text-01);
		white-space: nowrap;
	}

	.track {
		position: relative;
		flex: 1;
		height: var(--cds-spacing-06);
		cursor: pointer;
		touch-action: none;
	}

	.rail {
		position: absolute;
		top: 50%;
		left: 0;
		width: 100%;
		height: var(--cds-spacing-01);
		background: var(--cds-ui-03);
		transform: translate(0, -50%);
	}

	/* centre notch, matching Carbon's slider track */
	.rail::before {
		content: "";
		position: absolute;
		top: -0.3125rem;
		left: 50%;
		width: var(--cds-spacing-01);
		height: var(--cds-spacing-02);
		background: var(--cds-ui-03);
		transform: translate(-50%, 0);
	}

	.band {
		position: absolute;
		top: 50%;
		height: var(--cds-spacing-01);
		background: var(--cds-ui-05);
		pointer-events: none;
		transform: translate(0, -50%);
		transition: background 110ms cubic-bezier(0.2, 0, 0.38, 0.9);
	}

	.thumb {
		position: absolute;
		top: 50%;
		z-index: 3;
		width: var(--thumb-size);
		height: var(--thumb-size);
		background: var(--cds-ui-05);
		border-radius: 50%;
		outline: none;
		transform: translate(-50%, -50%);
		transition-property: transform, background, box-shadow;
		transition-duration: 110ms;
		transition-timing-function: cubic-bezier(0.2, 0, 0.38, 0.9);
	}

	.thumb:hover {
		transform: translate(-50%, -50%) scale(var(--thumb-scale));
	}

	.thumb:focus {
		background-color: var(--cds-interactive-04);
		box-shadow:
			inset 0 0 0 2px var(--cds-interactive-04),
			inset 0 0 0 3px var(--cds-ui-01);
		transform: translate(-50%, -50%) scale(var(--thumb-scale));
	}

	.thumb:active {
		box-shadow: inset 0 0 0 2px var(--cds-interactive-04);
		transform: translate(-50%, -50%) scale(var(--thumb-scale));
	}

	/* focusing a thumb tints the selected band, like Carbon's filled track */
	.thumb:focus ~ .band {
		background-color: var(--cds-interactive-04);
	}
</style>
