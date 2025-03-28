<script lang="ts">
	import { Button, Modal } from "carbon-components-svelte";
	import { Exit, CaretRight } from "carbon-icons-svelte";
	import type { GameController } from "../module/game-controller";

	export let gameController: GameController;
	export let open: boolean;

</script>


<Modal
	bind:open
	passiveModal={true}
	modalHeading={""}
>
	<h1>Serious Game - Floods</h1>
	<div class="start-menu-content">
		<div>[image]</div>
		<p>
			Explanations about the game...
		</p>
		<div class="start-menu-actions">
			<Button
				kind="danger"
				icon={Exit}
				on:click={() => gameController.exit()}
			>Exit Game</Button>
			<Button
				kind="primary"
				icon={CaretRight}
				on:click={() => open = false}
			>Start</Button>
		</div>
	</div>
</Modal>


<style>
	.start-menu-content {
		text-align: center;
		padding: 1rem;
	}
	.start-menu-actions {
		margin-top: 2rem;
	}
</style>