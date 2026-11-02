<script lang="ts">
  import { page } from '$app/state';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  const menu = [
    { label: 'Dashboard', href: '/', icon: '◈' },
    { label: 'Files', href: '/files', icon: '▤' },
    { label: 'Telephone', href: '/telephone', icon: '☎' }
  ];
</script>

<svelte:head>
  <title>Nortel Control Center</title>
  <meta name="theme-color" content="#101416" />
</svelte:head>

<div class="app">
  <aside>
    <div class="brand">
      <div class="brand-icon">☎</div>
      <div>
        <strong>NORTEL</strong>
        <small>CONTROL CENTER</small>
      </div>
    </div>

    <div class="menu-label">WORKSPACE</div>

    <nav>
      {#each menu as item}
        <a
          href={item.href}
          class:active={page.url.pathname === item.href}
        >
          <span class="nav-icon">{item.icon}</span>
          {item.label}
        </a>
      {/each}
    </nav>

    <div class="sidebar-bottom">
      <span class="status-dot"></span>
      RASPBERRY PI
    </div>
  </aside>

  <main>
    <header>
      <span>NORTEL / CONTROL</span>
      <span class="environment">LOCAL ENVIRONMENT</span>
    </header>

    <div class="content">
      {@render children()}
    </div>
  </main>
</div>

<style>
  :global(*) { box-sizing: border-box; }

  :global(body) {
    margin: 0;
    background: #101416;
    color: #e7ece8;
    font-family: system-ui, -apple-system, sans-serif;
  }

  :global(a) { color: inherit; }

  .app { display: flex; min-height: 100vh; }

  aside {
    width: 250px;
    flex-shrink: 0;
    background: #171d1e;
    border-right: 1px solid #303a38;
    padding: 28px 18px;
    display: flex;
    flex-direction: column;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 0 10px 48px;
  }

  .brand-icon {
    width: 44px;
    height: 44px;
    background: #b7d58a;
    color: #172019;
    border-radius: 12px;
    display: grid;
    place-items: center;
    font-size: 25px;
  }

  .brand strong {
    display: block;
    letter-spacing: 3px;
    font-size: 19px;
  }

  .brand small {
    display: block;
    font-size: 9px;
    letter-spacing: 2px;
    color: #8e9d96;
    margin-top: 5px;
  }

  .menu-label {
    font-size: 10px;
    letter-spacing: 2px;
    color: #778781;
    padding: 0 14px 15px;
  }

  nav { display: grid; gap: 7px; }

  nav a {
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 14px;
    border-radius: 9px;
    color: #a9b7b0;
    font-size: 14px;
  }

  nav a:hover { background: #26302c; }

  nav a.active {
    background: #303d32;
    color: #c5e69a;
  }

  .nav-icon { font-size: 20px; width: 24px; }

  .sidebar-bottom {
    margin-top: auto;
    padding: 20px 10px 0;
    color: #889b91;
    font-size: 10px;
    letter-spacing: 1.5px;
  }

  .status-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #b7d58a;
    margin-right: 8px;
  }

  main { flex: 1; min-width: 0; }

  header {
    height: 72px;
    border-bottom: 1px solid #303a38;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 40px;
    font-size: 11px;
    letter-spacing: 2px;
    color: #9eada5;
  }

  .environment { color: #b7d58a; }

  .content { max-width: 1200px; padding: 45px 40px; }

  @media (max-width: 700px) {
    .app { flex-direction: column; }
    aside { width: 100%; padding: 16px; }
    .brand { padding-bottom: 15px; }
    .menu-label, .sidebar-bottom { display: none; }
    nav { display: flex; overflow-x: auto; }
    nav a { padding: 10px; font-size: 12px; }
    header { padding: 0 20px; }
    .content { padding: 25px 20px; }
  }
</style>
