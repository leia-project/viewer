<script>
  import '../../routes/app.css';
  import { _ } from 'svelte-i18n';

  export let redirectUrl = "https://virtueel.zeeland.nl/";
  export let image = "images/404_Pagenotfound.png";
</script>

<div class="overlay" role="presentation">
  <div class="modal">
    {#if image}
      <img src={image} alt={$_('general.notFound.title')} class="error-image" />
    {/if}
    <h1 class="title">{$_('general.notFound.title')}</h1>
    <p class="description">{$_('general.notFound.description')}</p>
    <a class="cta-button" href={redirectUrl}>
      {$_('general.notFound.linktext')}
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12h14"/>
        <path d="m12 5 7 7-7 7"/>
      </svg>
    </a>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    box-sizing: border-box;
    background: linear-gradient(180deg, #f5f7f5 0%, #e8ede6 100%);
    z-index: 9999;
  }

  .modal {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1.25rem;
    background: #fff;
    border-radius: 16px;
    padding: 2.5rem 2rem;
    max-width: 520px;
    width: 100%;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  }

  .error-image {
    width: 70%;
    max-width: 320px;
    height: auto;
    object-fit: contain;
  }

  .title {
    margin: 0;
    font-size: 1.6rem;
    font-weight: 700;
    color: #2c2c2c;
  }

  .description {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.6;
    color: #555;
    max-width: 420px;
  }

  .cta-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.75rem;
    background-color: var(--tosti-color-primary, #39870c);
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 8px;
    text-decoration: none;
    transition: background-color 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 14px rgba(57, 135, 12, 0.25);
  }

  .cta-button:hover {
    background-color: var(--tosti-color-primary-accent, #74ab54);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(57, 135, 12, 0.35);
  }

  .cta-button:active {
    transform: translateY(0);
  }

  .cta-button svg {
    transition: transform 0.2s;
  }

  .cta-button:hover svg {
    transform: translateX(4px);
  }
</style>