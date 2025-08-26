<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { writable } from "svelte/store";
	import { fade } from "svelte/transition";
	import { QuestionAnswering } from "carbon-icons-svelte";
	import { DrawnGeometry, MarvinAvatar, NotificationType, QA } from "../../external-dependencies";
	import type { EvacuationController } from "../../module/game-elements/evacuation-controller";

	export let evacuationController: EvacuationController;
	export let geoJSON: any;
	export let questions: Array<string>;

		
	function askMarvin(question: string): void {
		const marvin = evacuationController.game.marvin;
		if (!marvin) {
			evacuationController.game.notificationLog.send({
				type: NotificationType.WARN,
				title: "Marvin error",
				message: "Marvin is not available.",
				duration: 5000
			});
			return;
		}
		const geom = new DrawnGeometry(Math.random().toString(), geoJSON);
		const qa = new QA(
			marvin,
			question,
			geom.getWkt()
		)
		marvin.qaManager.addEntry(qa);
		marvin.openMenu.set(true);
	}

	const marvinQuestionListOpen = writable(false);

	let marvinQuestionListRef: HTMLDivElement | undefined;

	function handleClickOutside(event: MouseEvent) {
		if (
			$marvinQuestionListOpen &&
			marvinQuestionListRef &&
			!marvinQuestionListRef.contains(event.target as Node)
		) {
			$marvinQuestionListOpen = false;
		}
	}

	onMount(() => {
		document.addEventListener("mousedown", handleClickOutside);
	});

	onDestroy(() => {
		document.removeEventListener("mousedown", handleClickOutside);
		marvinQuestionListOpen.set(false);
	});


</script>


<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<div class="marvin-button" bind:this={marvinQuestionListRef} >
	<MarvinAvatar
		animate={marvinQuestionListOpen}
		bind:open={$marvinQuestionListOpen}
	/>
	{#if $marvinQuestionListOpen}
		<div class="marvin-question-list" transition:fade={{ duration: 200 }}>
			{#each questions as question}
				<li class="marvin-question" on:click={() => askMarvin(question)}>
					<QuestionAnswering size={16} />
					<span>{question}</span>
				</li>
			{/each}
		</div>
	{/if}
</div>


<style>

	.marvin-question-list {
		position: absolute;
		top: 0;
		left: calc(100% + 0.5rem);
		border: 1px solid var(--game-color-highlight);
		background-color: rgb(var(--game-color-bg));
		border-radius: 4px;
		width: 300px;
	}

	.marvin-question {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		cursor: pointer;
		padding: 0.5rem;
		gap: 0.5rem;
	}

	.marvin-question:hover {
		background-color: var(--game-color-highlight);
		color: rgb(var(--game-color-bg));
	}

</style>