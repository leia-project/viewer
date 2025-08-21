<script lang="ts">
	import type { Game } from "../../module/game";

	export let game: Game;


	function onClose(): void {
		game.onCloseLevelDescription();
	}
	
</script>


<div>
	Description of level
</div>