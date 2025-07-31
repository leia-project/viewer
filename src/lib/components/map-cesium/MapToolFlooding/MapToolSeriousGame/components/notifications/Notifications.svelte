<script lang="ts">
    import { tick } from "svelte";
    import { Button } from "carbon-components-svelte";
	import { Chat } from "carbon-icons-svelte";
	import type { NotificationLog } from "../../module/notification-log";
    import Notification from "./Notification.svelte";

	export let notificationLog: NotificationLog;
	const log = notificationLog.log;
	const live = notificationLog.live;
	const showLog = notificationLog.showLog;

	$: logLength = $log.length;

	let toggleButton: HTMLButtonElement;

	let notificationsContainer: HTMLDivElement;

	async function scrollToBottom(): Promise<void> {
		if (notificationsContainer) {
			await tick();
			notificationsContainer.scrollTop = notificationsContainer.scrollHeight;
		}
	}

	notificationLog.on("notificationAdded", () => scrollToBottom());
	notificationLog.on("logToggled", () => scrollToBottom());

</script>


<div class="top-right-button" class:hide-tooltip={$showLog}>
	<slot name="extra-buttons" />
	<Button 
		bind:ref={toggleButton}
		kind={$showLog ? "primary" : "secondary"}
		size="default"
		icon={Chat}
		iconDescription={`Berichten (${logLength})`}
		tooltipPosition="right"
		on:click={() => {
			toggleButton.blur();
			showLog.set(!$showLog)
		}} 
	/>
</div>

{#if !$showLog}
	<div class="notifications live" bind:this={notificationsContainer}>
		{#each $live as notification (notification.message)}
			<Notification {notification} showProgress={true} />
		{/each}
	</div>
{:else}
	<div class="notifications log" bind:this={notificationsContainer}>
		{#each $log as notification (notification.message)}
			<Notification {notification} />
		{/each}
	</div>
{/if}


<style>

	:global(.hide-tooltip .bx--btn::before) {
		display: none !important;
	}
	:global(.hide-tooltip .bx--assistive-text) {
		display: none !important;
	}

	.top-right-button {
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		row-gap: 0.5rem;
		z-index: 3;
	}
	.notifications {
		max-height: 50vh;
		overflow-y: auto;
		-ms-overflow-style: none; 
		scrollbar-width: none; 
		pointer-events: auto;
		z-index: 3;
	}
	.notifications::-webkit-scrollbar {
		display: none;
	}

</style>