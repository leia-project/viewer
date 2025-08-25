<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Repeat, SkipForwardSolidFilled } from "carbon-icons-svelte";
	import type { Game } from "../module/game";
	import GameButton from "./general/GameButton.svelte";

	export let game: Game;

	let video: HTMLVideoElement;
	let progress = 0;
	let duration = 0;

	function exit(): void {
		game.dispatch("cutscene-ended", {});
	}

	function replay(): void {
		if (video) {
			video.currentTime = 0;
			video.play();
		}
	}

	function updateProgress() {
		if (video) {
			progress = video.currentTime;
			duration = video.duration || 100;
		}
		requestAnimationFrame(updateProgress);
	}

	function onVideoLoaded() {
		duration = video.duration;
		updateProgress();
	}

</script>


<!-- svelte-ignore a11y-media-has-caption -->
<div id="cutscene-overlay">
	<video 
		id="cutscene" 
		bind:this={video}
		autoplay 
		on:ended={exit}
		on:loadedmetadata={onVideoLoaded}
	>
		<source src="https://storage.googleapis.com/sogelink-research-public/projects/zeeland/serious-game-zeeland-cutscene.mp4" type="video/mp4">
	</video>

	<div id="cutscene-logo">
		<img src="https://www.interregnorthsea.eu/sites/default/files/media-object/2024-09/FIER-Logo-PO-DeepWater_Klein%20formaat_wit.png" alt="FIER Logo" width=200 />
	</div>

	<div id="cutscene-title">
		<span>Serious Game</span>
		<span style="color: var(--game-color-highlight);">Overstromingen Zeeland</span>
	</div>

	<div class="cutscene-controls">
		<div class="progress-container">
			<div class="progress-bar" style="width: {(progress / duration) * 100}%"></div>
		</div>
		<div class="control-buttons">
			<GameButton
				buttonText={$_("game.buttons.skip")}
				icon={SkipForwardSolidFilled}
				hasTooltip={false}
				borderHighlight={true}
				on:click={exit}
			/>
			<GameButton
				icon={Repeat}
				hasTooltip={false}
				borderHighlight={true}
				on:click={replay}
			/>
		</div>

	</div>
</div>


<style>

	#cutscene-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: black;
		z-index: 1000;
	}

	#cutscene {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	#cutscene-logo {
		position: absolute;
		top: 30px;
		left: 30px;
	}

	#cutscene-title {
		position: absolute;
		top: 30px;
		left: 50%;
		transform: translateX(-50%);
		text-align: right;
		font-size: 24px;
		font-weight: bold;
		line-height: 1.2;
		display: flex;
		flex-direction: column;
		align-items: center;
		display: none;
	}

	.cutscene-controls {
		position: absolute;
		bottom: 20px;
		left: 0;
		right: 0;
		z-index: 1001;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 20px;
	}

	.progress-container {
		width: 100%;
		max-width: 800px;
		height: 5px;
		background-color: rgba(255, 255, 255, 0.3);
		border-radius: 4px;
		margin-bottom: 15px;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		background-color: var(--game-color-highlight, #3498db);
		transition: width 0.1s linear;
	}

	.control-buttons {
		display: flex;
		gap: 15px;
	}

</style>