<script lang="ts">
	import { Button, Modal } from "carbon-components-svelte";
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
				kind="primary"
				on:click={() => gameController.exit()}
			>Exit Game</Button>
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