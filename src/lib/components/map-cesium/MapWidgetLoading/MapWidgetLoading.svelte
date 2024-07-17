<script lang="ts">
	import { tweened } from "svelte/motion";
	import { cubicOut } from "svelte/easing";
	import { fade } from "svelte/transition";

	import type { Map } from "../module/map";

	export let map: Map;

	let loadingTilesTotal = 0;
	let hideDelay: any;
	let show = false;

	const progress = tweened(0, {
		duration: 100,
		easing: cubicOut
	});

	map.ready.subscribe((r) => {
		if (r) {
			addLoadListener();
		}
	});

	function addLoadListener() {
		map.viewer.scene.globe.tileLoadProgressEvent.addEventListener((queuedTileCount) => {
			if(!queuedTileCount) {
				progress.set(1);
				hideDelay = setTimeout(()=>{ show = false }, 600);
				return;
			}

			if(hideDelay) {
				clearTimeout(hideDelay);
			}

			show = true;
			const tempLoadingTilesTotal = queuedTileCount > loadingTilesTotal ? queuedTileCount : loadingTilesTotal;
			const perc = (100 * (tempLoadingTilesTotal - queuedTileCount)) / tempLoadingTilesTotal / 100;

			try {
				progress.set(isNaN(perc) ? 1 : perc <= 0 ? 0 : perc >= 1 ? 1 : perc);	
			} catch (error) {
				console.log("Error setting progress bar");
			}
			
			loadingTilesTotal = tempLoadingTilesTotal;
		});
	}
</script>

{#if show}
	<div
		class="wrapper"
		in:fade={{ delay: 0, duration: 150 }}
		out:fade={{ delay: 0, duration: 600 }}
	>
		<progress class="progress" value={$progress} />
	</div>
{/if}

<style>
	.wrapper {
		position: absolute;
		bottom: 0;
		left: 0;
		height: 3px;
		width: 100%;
		line-height: 0;
		z-index: 1;
		display: flex;
	}

	.progress {
		width: 100%;
		height: 100%;
		display: inline;
		border: none; /* Needed for Firefox */
		background:  transparent;
		-webkit-appearance: none;
	}
	.progress::-webkit-progress-bar {
		background-color: transparent;
	}

	.progress::-webkit-progress-value {
		background-color: var(--cds-interactive-01);
	}

	.progress::-moz-progress-bar {
		background-color: var(--cds-ui-01);
	}

	.progress::-moz-progress-bar {
		background-color: var(--cds-interactive-01);
	}
</style>
