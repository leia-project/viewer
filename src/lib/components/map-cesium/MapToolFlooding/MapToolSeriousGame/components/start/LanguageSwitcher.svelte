<script lang="ts">
	import { selectedLanguage } from "../../external-dependencies";

</script>


<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<div class="language-switcher">
	<img 
		class="flag"
		class:selected={$selectedLanguage === "nl"}
		src={"/images/flag-nl.webp"}
		alt="Dutch flag" 
		on:click={() => selectedLanguage.set("nl")} 
	/>
	<img 
		class="flag"
		class:selected={$selectedLanguage === "en"}
		src={"/images/flag-uk.webp"}
		alt="English flag" 
		on:click={() => selectedLanguage.set("en")}
	/>
</div>


<style>

	.language-switcher {
		display: flex;
		gap: 0.5rem;
	}

	.flag {
		width: 2rem;
		height: 1.5rem;
		cursor: pointer;
		border-radius: 0.25rem;
	}

	.flag:not(.selected) {
		filter: brightness(0.35);
	}

	.flag:hover {
		filter: brightness(1);
	}

</style>
