<script lang="ts">
    import type { INotification } from "../../notification-log";
    import { UserAvatarFilled } from "carbon-icons-svelte";
    import { onMount } from "svelte";

	export let notification: INotification;

	let translateX = -100;
	let opacity = 0;
	onMount(() => {
		setTimeout(() => {
			opacity = 1;
			translateX = 0;
		}, 100);	
	});

</script>


<div class="notification" style="opacity:{opacity};transform:translate({translateX}%);">
	<div class="gravatar">
		<UserAvatarFilled />
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


<style>

	.notification {
		background-color: rgba(33, 33, 33, 0.8);
		backdrop-filter: blur(5px);
		color: white;
		padding: 0.5rem;
		margin: 0.5rem;
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