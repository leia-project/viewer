<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { _ } from "svelte-i18n";
	import { ChevronLeft, ChevronRight, Close, Image } from "carbon-icons-svelte";
	import type { StoryMarkerAction } from "./story-marker";
	import StoryImageComparison from "./StoryImageComparison.svelte";

	export let images: Array<string> = [];
	export let action: StoryMarkerAction | undefined = undefined;
	export let title = "";
	export let onClose: () => void;

	let dialog: HTMLDialogElement;
	let htmlFrame: HTMLIFrameElement | undefined;
	let index = 0;
	let failed = new Set<number>();
	let comparisonFailed = false;
	const closeBridge =
		'<script>addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();parent.postMessage("story-marker:close","*");}});<' +
		"/script>";
	$: htmlDocument =
		action?.type === "html" && action.html !== undefined ? action.html + closeBridge : undefined;

	onMount(() => dialog.showModal());
	onDestroy(() => dialog?.close());

	function onImageError(i: number): void {
		failed.add(i);
		failed = failed;
	}

	function next(): void {
		index = (index + 1) % images.length;
	}

	function previous(): void {
		index = (index - 1 + images.length) % images.length;
	}

	function onKeydown(event: KeyboardEvent): void {
		event.stopPropagation();
		if (action || images.length < 2) return;
		if (event.key === "ArrowRight") {
			event.preventDefault();
			next();
		} else if (event.key === "ArrowLeft") {
			event.preventDefault();
			previous();
		}
	}

	function onBackdropClick(event: MouseEvent): void {
		if (event.target === dialog) onClose();
	}

	function onContentMessage(event: MessageEvent<unknown>): void {
		if (
			htmlFrame &&
			event.source === htmlFrame.contentWindow &&
			event.data === "story-marker:close"
		) {
			onClose();
		}
	}
</script>

<svelte:window on:message={onContentMessage} />

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<dialog
	bind:this={dialog}
	class="gallery-backdrop"
	aria-label={title || $_("tools.stories.galleryTitle")}
	on:cancel|preventDefault={onClose}
	on:click={onBackdropClick}
	on:keydown={onKeydown}
>
	<div class="gallery-content">
		<button class="gallery-close" aria-label={$_("general.close")} on:click={onClose}>
			<Close size={24} />
		</button>
		{#if title}
			<h2 class="gallery-title">{title}</h2>
		{/if}
		{#if action?.type === "beforeAfter"}
			{#if comparisonFailed}
				<div class="gallery-placeholder gallery-image-active">
					<Image size={32} />
					<span>{$_("tools.stories.galleryImageUnavailable")}</span>
				</div>
			{:else}
				<StoryImageComparison
					before={action.before}
					after={action.after}
					on:error={() => (comparisonFailed = true)}
				/>
			{/if}
		{:else if action?.type === "html"}
			<iframe
				bind:this={htmlFrame}
				class="gallery-html"
				title={title || $_("tools.stories.galleryTitle")}
				src={action.url}
				srcdoc={htmlDocument}
				sandbox="allow-scripts"
			/>
		{:else}
			{#if images.length > 1}
				<button
					class="gallery-nav gallery-nav-left"
					aria-label={$_("tools.stories.galleryPrevious")}
					on:click={previous}
				>
					<ChevronLeft size={32} />
				</button>
			{/if}
			{#each images as image, i}
				{#if failed.has(i)}
					<div class="gallery-placeholder" class:gallery-image-active={i === index}>
						<Image size={32} />
						<span>{$_("tools.stories.galleryImageUnavailable")}</span>
					</div>
				{:else}
					<img
						src={image}
						alt=""
						class="gallery-image"
						class:gallery-image-active={i === index}
						on:error={() => onImageError(i)}
					/>
				{/if}
			{/each}
			{#if images.length > 1}
				<button
					class="gallery-nav gallery-nav-right"
					aria-label={$_("tools.stories.galleryNext")}
					on:click={next}
				>
					<ChevronRight size={32} />
				</button>
			{/if}
		{/if}
	</div>
</dialog>

<style>
	.gallery-backdrop {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100dvh;
		max-width: none;
		max-height: none;
		margin: 0;
		padding: 3rem 0;
		border: 0;
		box-sizing: border-box;
		background: rgba(0, 0, 0, 0.85);
		color: #ffffff;
		z-index: 1000000;
		align-items: center;
		justify-content: center;
	}

	.gallery-backdrop[open] {
		display: flex;
	}

	.gallery-backdrop::backdrop {
		background: transparent;
	}

	.gallery-content {
		position: relative;
		max-width: 90vw;
		max-height: calc(100dvh - 6rem);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
	}

	.gallery-title {
		max-width: 90vw;
		font-size: 1rem;
		line-height: 1.4;
		overflow-wrap: anywhere;
	}

	.gallery-html {
		width: min(960px, 90vw);
		height: min(640px, 70dvh);
		border: 0;
		background: #ffffff;
	}

	.gallery-image {
		display: none;
		max-width: 90vw;
		max-height: calc(100dvh - 6rem);
		object-fit: contain;
	}

	.gallery-placeholder {
		display: none;
		width: min(640px, 90vw);
		height: min(420px, 70dvh);
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		background: #262626;
		color: #c6c6c6;
		text-align: center;
	}

	.gallery-image-active {
		display: block;
	}

	.gallery-placeholder.gallery-image-active {
		display: flex;
	}

	.gallery-close {
		position: absolute;
		top: -2.5rem;
		right: 0;
		background: transparent;
		border: none;
		color: #ffffff;
		cursor: pointer;
		padding: 0.25rem;
	}

	.gallery-nav {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		background: rgba(0, 0, 0, 0.65);
		border: none;
		border-radius: 50%;
		color: #ffffff;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.gallery-nav-left {
		left: 0.5rem;
	}

	.gallery-nav-right {
		right: 0.5rem;
	}
</style>
