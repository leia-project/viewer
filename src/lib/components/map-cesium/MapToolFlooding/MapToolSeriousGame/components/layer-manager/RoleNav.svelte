<script lang="ts">
	import { Game } from "../../module/game";
	import type { IRole } from "../../module/models";
	import MarvinInfoBoxAddOn from "../infobox/MarvinInfoBoxAddOn.svelte";

	export let game: Game | undefined;
	export let roles: Array<IRole>;
	export let selectedRole: IRole | undefined;

	function changeRole(index: number): void {
		const newRole = roles[index];
		if (selectedRole === newRole) {
			selectedRole = undefined;
		} else {
			selectedRole = roles[index];
		}
	}

</script>


{#if game && selectedRole?.marvinQuestions && selectedRole.marvinQuestions.length > 0}
	<div class="marvin-container">
		<MarvinInfoBoxAddOn 
			{game}
			geoJSON={game.outlineGeoJSON}
			questions={selectedRole.marvinQuestions} 
		/>
	</div>
{/if}

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="role-nav">

	{#each roles as role, roleId}
		<div
			class="role-button"
			on:click={() => changeRole(roleId)}
			on:keydown={(e) => e.key === "Enter" && changeRole(roleId)}
			class:selected={selectedRole === role}
		>
			{@html role.svgIcon}
		</div>
	{/each}
</div>


<style>

	.marvin-container {
		display: flex;
		justify-content: center;
		margin-bottom: 1rem;
	}

   .role-nav {
		display: flex;
		flex-direction: column;
		align-items: center;
		row-gap: 0.25rem;
		padding: 0.5rem;
		background-color: rgba(var(--game-color-bg), 0.4);
		border-radius: 200px;
	}

	.role-button {
		background-color: transparent;
		padding: 0.45rem;
		border-radius: 50%;
		cursor: pointer;
		transition: background-color 0.3s ease;
	}

	/* Hover effect: background changes to grey */
	.role-button:hover {
		background-color: var(--game-color-highlight);
	}

	.role-button:active,
	.role-button.selected {
		background-color: var(--game-color-highlight);
	}

	/* Style the image inside the button */
	:global(.role-button svg) {
		display: block;
		margin: 0 auto;
		width: 30px;
		height: 30px;
		filter: drop-shadow(0 0 2px #054569) ;
	}

</style>
