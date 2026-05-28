<script>
  import '../app.css';
  import {_} from 'svelte-i18n';
</script>

<div class="not-found">
  <img src="/images/404_Pagenotfound.png" alt="404 - Page Not Found" class="error-image" />

  <p class="description">{$_('general.notFound.description')}</p>

  <a href="https://virtueel.zeeland.nl/" class="cta-button">
    {$_('general.notFound.linktext')}
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12h14"/>
      <path d="m12 5 7 7-7 7"/>
    </svg>
  </a>
</div>

<style>
  .not-found {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: 2rem;
    box-sizing: border-box;
    background: linear-gradient(180deg, #f5f7f5 0%, #e8ede6 100%);
  }

  .error-image {
    max-width: min(85vw, 560px);
    height: auto;
    max-height: 50vh;
    object-fit: contain;
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    margin-bottom: 1.5rem;
  }

  .description {
    font-size: 1.1rem;
    color: #555;
    margin: 0 0 1.5rem;
    max-width: 440px;
    line-height: 1.6;
  }

  .cta-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.75rem;
    background: var(--tosti-color-primary, #39870c);
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 8px;
    text-decoration: none;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 14px rgba(57, 135, 12, 0.25);
  }

  .cta-button:hover {
    background: var(--tosti-color-primary-accent, #74ab54);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(57, 135, 12, 0.35);
    text-decoration: none;
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