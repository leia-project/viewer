<script lang="ts">
	import type { Map } from "$lib/components/map-cesium/module/map";
	import RoleData from "./RoleData.svelte";
	import type { IRole } from "../module/models";
	import type { GameController } from "../module/game-controller";
	export let gameController: GameController;
	

	const roles: Array<IRole> = [
		{
			role: "Defensie",
			image: "./images/tank-war-svgrepo-com.svg",
			layerIds: [
				"4",
				"5"
			]
		},
		{
			role: "Brandweer",
			image: "./images/fire-station-svgrepo-com.svg",
			layerIds: [
				"6",
				"7"
			]
		},
		{
			role: "Politie",
			image: "./images/police-car-svgrepo-com.svg",
			layerIds: [
				"8",
				"9"
			]
		},
		{
			role: "GHOR",
			image: "./images/ambulance-svgrepo-com.svg",
			layerIds: [
				"10",
				"11"
			]
		}
	]
	
	const mainLayerIds = ["1", "2", "3"]
	let selectedRole: IRole;
	
	function changeRole(index: number) {
		selectedRole = roles[index];
	}
</script>


<div class="role-menu">
	{#if selectedRole}
		<div class="role-data">
			<RoleData roleData={selectedRole} {mainLayerIds} {gameController}/>
		</div>
	{/if}

	<div class="image-grid">
		{#each roles as role, roleId}
			<button
				type="button"
				class="role-button"
				on:click={() => changeRole(roleId)}
				on:keydown={(e) => e.key === "Enter" && changeRole(roleId)}
				class:selected={selectedRole === role}
			>
				<img src={role.image} alt="{role.role}" width="60">
			</button>
		{/each}
	</div>
</div>

<style>
	.role-menu {
		margin-left: 5%;
		margin-bottom: 1%;
	}

	.role-data {
		margin-bottom: 20px;
		width: 20%;
	}

	.image-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
	}

	/* Style for the button */
	.role-button {
		background-color: white;
		padding: 10px;
		border-radius: 8px;
		cursor: pointer;
		transition: background-color 0.3s ease;
	}

	/* Hover effect: background changes to grey */
	.role-button:hover {
		background-color: grey;
	}

	/* Active state: background changes to black when clicked */
	.role-button:active,
	.role-button.selected {
		background-color: black;
		color: white; /* Optional: to make text white when selected */
	}

	/* Style the image inside the button */
	.role-button img {
		display: block;
		margin: 0 auto;
		width: 60px;
		height: 60px;
	}

</style>