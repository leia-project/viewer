<script lang="ts">
	import { _ } from "svelte-i18n";
	import { CheckmarkFilled, CloseFilled, InformationFilled, ToolKit } from "carbon-icons-svelte";
	import { Measure } from "../../module/game-elements/roads/measure";
	import type { NotificationLog } from "../../module/notification-log";
	import { NotificationType } from "$lib/components/map-core/notifications/notification-type";
	import GameButton from "../general/GameButton.svelte";

	export let measure: Measure;
	export let notificationLog: NotificationLog;
	export let type: "hover" | "selected";

	const applied = measure.applied;
	const toggleEnabled = measure.toggleEnabled;

	function sendMeasureInfo(): void {
		notificationLog.send({
			type: NotificationType.INFO,
			title: "Measure Info",
			message: measure.config.description,
			duration: 20000
		})
	}

</script>


<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="measure-info">
	<div class="measure-title">
		<div>{measure.config.name}</div>
		{#if type === "selected"}
			<div class="info-button" on:click={sendMeasureInfo}>
				<InformationFilled size={16} />
			</div>
		{/if}
	</div>
	<div class="measure-effect">
		{$_("game.measure")}: {$_(`game.measureTypes.${measure.config.type}`)}
	</div>
	<div class="measure-bottom">
		<div class="measure-status">
			{#if $applied}
				<CheckmarkFilled color="green" />
			{:else}
				<CloseFilled color="red" />
			{/if}
			<div>{$applied ? "Applied" : "Not applied"}</div>
		</div>
		{#if type === "selected" && $toggleEnabled}
			<div class="measure-actions">
				<GameButton
					buttonText={$applied ? "Undo" : "Apply"}
					icon={ToolKit}
					hasTooltip={false}
					borderHighlight={false}
					size={14}
					on:click={() => applied.set(!$applied)}
				/>
			</div>
		{/if}
	</div>
</div>


<style>

	.measure-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-weight: 700;
	}

	.info-button {
		color: var(--game-color-highlight);
		transition: color 0.2s;
		cursor: pointer;
		margin-left: 1rem;
	}
	.info-button:hover {
		color: var(--game-color-contrast);
	}

	.measure-effect {
		margin: 0.1rem 0;
	}

	.measure-status {
		display: flex;
		align-items: center;
		column-gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.measure-bottom {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		column-gap: 1rem;
		margin-top: 0.1rem;
	}

</style>