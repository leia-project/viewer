<script lang="ts">
	import { _ } from "svelte-i18n";
	import { ChevronLeft, ChevronRight, Close, Image } from "carbon-icons-svelte";

	export let images: Array<string>;
	export let onClose: () => void;

	let index = 0;
	let failed = new Set<number>();

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
		if (event.key === "Escape") onClose();
		else if (event.key === "ArrowRight" && images.length > 1) next();
		else if (event.key === "ArrowLeft" && images.length > 1) previous();
	}
</script>

<svelte:window on:keydown={onKeydown} />

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="gallery-backdrop" on:click={onClose}>
	<div class="gallery-content" on:click|stopPropagation>
		<button
			class="gallery-close"
			aria-label={$_("general.close")}
			on:click={onClose}
		>
			<Close size={24} />
		</button>
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
	</div>
</div>

<style>
	.gallery-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		z-index: 1000000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.gallery-content {
		position: relative;
		max-width: 90vw;
		max-height: 90vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.gallery-image {
		display: none;
		max-width: 90vw;
		max-height: 90vh;
		object-fit: contain;
	}

	.gallery-placeholder {
		display: none;
		width: min(640px, 90vw);
		height: min(420px, 90vh);
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
