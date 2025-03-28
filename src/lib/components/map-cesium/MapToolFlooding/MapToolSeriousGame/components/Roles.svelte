<script lang="ts">
	export let map;
	import RoleData from "./RoleData.svelte";

	const layerConfig = map.layerLibrary.findLayer("1");

	const roles = [
		{
			role: "Army",
			image: "./images/tank-war-svgrepo-com.svg",
			layersIds: [
				"4",
				"5"
			]
		},
		{
			role: "Firefighter",
			image: "./images/fire-station-svgrepo-com.svg",
			layersIds: [
				"6",
				"7"
			]
		},
		{
			role: "Police",
			image: "./images/police-car-svgrepo-com.svg",
			layersIds: [
				"8",
				"9"
			]
		},
		{
			role: "GHOR",
			image: "./images/ambulance-svgrepo-com.svg",
			layersIds: [
				"10",
				"11"
			]
		}
	]

	const mainLayerIds = ["1", "2", "3"]
	let selectedRole: any = null;
	
	function changeRole(index: number) {
		selectedRole = roles[index];
	}

</script>


<div class="role-menu">
	{#if selectedRole}
		<div class="role-data">
			<RoleData roleData={selectedRole} mainLayerData={mainLayerIds}/>
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