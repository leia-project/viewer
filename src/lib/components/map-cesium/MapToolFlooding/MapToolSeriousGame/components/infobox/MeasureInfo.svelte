<script lang="ts">
	import { Button } from "carbon-components-svelte";
	import { Checkmark, CloseFilled } from "carbon-icons-svelte";
	import { Measure } from "../../module/game-elements/roads/measure";
	import type { NotificationLog } from "../../module/notification-log";
	import { NotificationType } from "$lib/components/map-core/notifications/notification-type";

	export let measure: Measure;
	export let notificationLog: NotificationLog;

	const applied = measure.applied;

	function sendMeasureInfo(): void {
		notificationLog.send({
			type: NotificationType.INFO,
			title: "Measure Info",
			message: measure.config.description,
			duration: 20000
		})
	}

</script>

<div class="measure-info">
	<div>
		<div>{measure.config.name}</div>
	</div>
	<div>
		{#if $applied}
			<Checkmark color="green" />
		{:else}
			<CloseFilled color="red" />
		{/if}
		<div>{$applied ? "Applied" : "Not applied"}</div>
	</div>
	<div class="measure-actions">
		<Button
			kind="primary"
			size="small"
			on:click={() => applied.set(!$applied)}
		>Apply</Button>
		<Button
			kind="primary"
			size="small"
			on:click={sendMeasureInfo}
		>More Info</Button>
	</div>
</div>


<style>

</style>