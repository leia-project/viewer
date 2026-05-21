<script>
  import '../../routes/app.css';
  import {_} from 'svelte-i18n';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
</script>

<div class="overlay" role="presentation">
  <div class="modal">
    <img src="images/404_Pagenotfound.png" alt="404 - Page Not Found" class="error-image" />
    <p>{$_('general.notFound.description')}</p>
    <a href="https://virtueel.zeeland.nl/">
      {$_('general.notFound.linktext')}
    </a>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .modal {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    max-width: 500px;
    width: 90vw;
    text-align: center;
    position: relative;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  }

  .error-image {
    width: 60%;
    height: auto;
    margin-bottom: 1rem;
  }
  a {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background-color: var(--tosti-color-primary, #39870c);
    color: white;
    border-radius: 4px;
    text-decoration: none;
  }

  a:hover {
    background-color: var(--tosti-color-primary-accent, #74ab54);
  }
</style>