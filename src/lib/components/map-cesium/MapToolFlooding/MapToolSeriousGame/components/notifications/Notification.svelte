<script lang="ts">
	import { onMount } from "svelte";
	import { CheckmarkFilled, ErrorFilled, InformationFilled, WarningHexFilled } from "carbon-icons-svelte";
	import { NotificationType } from "../../external-dependencies";
	import type { INotification } from "../../module/notification-log";

	export let notification: INotification;
	export let showProgress = false;

	let translateX = -100;
	let opacity = 0;
	let progress = 100;
	onMount(() => {
		setTimeout(() => {
			opacity = 1;
			translateX = 0;
			progress = 0;
		}, 0);
	});

	const progressDuration = notification.duration || 10000;

	const icon = 
		notification.type === NotificationType.ERROR ? ErrorFilled :
		notification.type === NotificationType.INFO ? InformationFilled :
		notification.type === NotificationType.SUCCESS ? CheckmarkFilled :
		notification.type === NotificationType.WARN ? WarningHexFilled :
		InformationFilled;
	const color = 
		notification.type === NotificationType.ERROR ? "red" :
		notification.type === NotificationType.INFO ? "#ddf4ff" :
		notification.type === NotificationType.SUCCESS ? "green" :
		notification.type === NotificationType.WARN ? "orange" :
		"ddf4ff";

</script>


<div class="notification-container">
	{#if showProgress}
		<div class="progress-bar">
			<div class="progress" style="width: {progress}%; transition: width {progressDuration}ms linear"></div>
		</div>
	{/if}
	<div class="notification" style="opacity: {opacity}; transform: translate({translateX}%);">
		<div class="icon">
			<svelte:component this={icon} {...{color: color, size: 20}} />
		</div>
		<div class="content">
			<span class="notification-title">{@html notification.title}</span>
			<hr>
			<p class="notification-message">{@html notification.message}</p>
			{#if notification.component?.component}
				<svelte:component this={notification.component.component} {...notification.component.props} />
			{/if}
		</div>
	</div>
</div>


<style>

	.progress-bar {
		width: 100%;
		height: 4px;
		background: rgba(255,255,255,0.1);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress {
		height: 100%;
		background: #4caf50;
	}

	.notification-container {
		margin: 0.5rem;
	}

	.notification {
		background-color: rgba(33, 33, 33, 0.8);
		backdrop-filter: blur(5px);
		color: white;
		padding: 0.5rem;
		border-radius: 2px;
		max-width: 25rem;
		display: flex;
		column-gap: 10px;
		transition: 0.5s;
	}

	.notification-title {
		display: block;
		font-weight: bold;
		margin-bottom: 5px;
	}

	:global(.notification-message > *) {
		margin-bottom: 0.3rem;
	}

</style>