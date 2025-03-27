<script lang="ts">

	const roles = [
		{
			role: "army",
			image: "./images/tank-war-svgrepo-com.svg",
			layersIds: [
				"2",
				"3"
			]
		},
		{
			role: "firefighter",
			image: "./images/fire-station-svgrepo-com.svg",
			layersIds: [
				"2",
				"3"
			]
		},
		{
			role: "police",
			image: "./images/police-car-svgrepo-com.svg",
			layersIds: [
				"2",
				"3"
			]
		},
		{
			role: "GHOR",
			image: "./images/ambulance-svgrepo-com.svg",
			layersIds: [
				"2",
				"3"
			]
		}
	]

</script>


<div class="role-menu">
	{#each roles as role}
		<img src={role.image} alt="{role.role}" width=60>
	{/each}

</div>


<style>
	.role-menu {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		margin-left: 5%;
		margin-bottom: 1%;
		pointer-events: all;
	}

	img {
		display: flex;
		align-items: center;
		justify-content: center;
	}

</style>