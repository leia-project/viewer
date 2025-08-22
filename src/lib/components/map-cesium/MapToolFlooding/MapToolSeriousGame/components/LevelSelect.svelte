<script lang="ts">
	import { onMount } from "svelte";
	import { _ } from "svelte-i18n";
	import { Button } from "carbon-components-svelte";
	import { GameConsole, PlayOutlineFilled, TrashCan, WatsonHealthSaveSeries } from "carbon-icons-svelte";
	import { notifications } from "$lib/components/map-core/notifications/notifications";
	import { Notification } from "$lib/components/map-core/notifications/notification";
	import { NotificationType } from "$lib/components/map-core/notifications/notification-type";
	import type { GameController } from "../module/game-controller";

	export let gameController: GameController;

	const levels = gameController.settings.levels;
	const savedGames = gameController.savedGames;

	onMount(() => {
		gameController.getGamesFromCache();
	});

	$: canStartNewGame = $savedGames.length < 6;

</script>


<div class="sg-menu">
	<div class="sg-text">
		De Serious Game is een spel waarin je de rol aanneemt van een crisismanager die moet reageren op een overstroming. Je kunt verschillende scenario's kiezen, elk met unieke uitdagingen en doelen.
	</div>
	<div class="header">
		<div class="sg-icon">
			<WatsonHealthSaveSeries size={20} />
		</div>
		<span>{$_("game.savedGames")}</span>
	</div>
	{#if $savedGames.length > 0}
		{#each $savedGames as savedGame}
			<div class="level">
				<div class="level-header">
					<div >
						<div class="level-name">{savedGame.level}</div>
						<div>{savedGame.name}</div>
					</div>
					<p>{$_("game.lastSave")}: {new Date(savedGame.lastUpdate).toLocaleDateString("nl-NL", {
						day: "numeric",
						month: "short",
						hour: "2-digit",
						minute: "2-digit"
					})}</p>
				</div>
				<div class="button-container">
					<Button
						size="small"
						kind="danger"
						icon={TrashCan}
						on:click={() => {
							gameController.deleteGameFromCache(savedGame.uuid);
						}}
					>{$_("game.buttons.delete")}</Button>
					<Button
						size="small"
						kind="primary"
						icon={PlayOutlineFilled}
						on:click={() => {
							const level = levels.find(l => l.name === savedGame.level);
							if (!level) {
								notifications.send(
									new Notification(NotificationType.ERROR, "Error", `Unable to find scenario`, 5000, true, true)
								);
								return;
							}
							gameController.play(level, savedGame);
						}}
					>{$_("game.buttons.load")}</Button>
				</div>
			</div>
		{/each}
	{:else}
		<div class="sg-text">Er zijn nog geen opgeslagen spellen. Kies een scenario uit de lijst hieronder om een nieuw spel te beginnen.</div>
	{/if}

	<div class="header">
		<div class="sg-icon">
			<GameConsole size={20} />
		</div>
		<span>Scenario's</span>
	</div>
	{#if !canStartNewGame}
		<div class="sg-text">Je kunt maximaal 6 spellen tegelijk spelen. Verwijder een spel om een nieuw spel te starten.</div>
	{/if}
	{#each levels as level}
		<div class="level">
			<div class="description">
				<div class="level-name">{level.name}</div>
				<p>{level.description}</p>
			</div>
			<div class="button-container">
				<Button
					size="small"
					kind="primary"
					icon={PlayOutlineFilled}
					disabled={!canStartNewGame}
					on:click={() => {
						gameController.play(level);
					}}
				>Start</Button>
			</div>
		</div>
	{/each}

	<!-- General settings -->
</div>


<style>

	.sg-menu {
		padding: 1rem;
		border-radius: 0.5rem;
		text-align: start;
	}

	.sg-menu .header {
		position: relative;
		font-size: 1.25rem;
		font-weight: 700;
		color: rgb(33, 33, 33);
		margin-bottom: 1rem;	
		margin-top: 3rem;
		display: flex;
		align-items: center;
		column-gap: 1.5rem;
	}

	.sg-menu .header::before {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		height: 1px;
		width: 100%;
		background-color: rgb(33, 33, 33);
		margin-left: 1.5rem;
	}

	.sg-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background-color: rgb(33, 33, 33);
		border-radius: 50%;
		color: #9ccddc;
	}

	.sg-text {
		font-size: 1rem;
		color: var(--game-color-contrast);
	}

	.level {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		border: 1px solid #9ccddc;
		border-radius: 0.375rem;
		background-color: rgb(27, 37, 59);
		color: #fff;
		margin-bottom: 1rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	.level-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.level-name {
		font-size: 1.125rem;
		font-weight: bold;
		color: #9ccddc;
		margin: 0;
	}
	
	.button-container {
		display: flex;
		justify-content: flex-end;
	}

</style>