<script>

import '../app.css';
import {_} from 'svelte-i18n';

</script>

<div class="not-found">
    
<h1>{$_('general.notFound.title')}</h1>
<h2>{$_('general.notFound.description')}</h2>
    <br>
    <h1><a href="https://virtueel.zeeland.nl/">{$_('general.notFound.linktext')} https://virtueel.zeeland.nl/</a></h1>
    

<img src="/images/Zeehond_Zeeland_Error.png" alt="Error" class="error-image" />

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
  }
  .error-image {
    width: 40vw;
    height: auto;
    margin-bottom: 1.5rem;
}
  h1 {
    font-size: 1.8rem;
    margin-bottom: 0.5rem;
  }

  a {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background-color: var(--tosti-color-primary, #39870c);
    color: white;
    border-radius: 4px;
    text-decoration: none;
    font-size: 2rem;
  }

  a:hover {
    background-color: var(--tosti-color-primary-accent, #74ab54);
    text-decoration: none;
  }
</style>