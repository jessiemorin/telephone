<script lang="ts">
  const modules = [
    {
      icon: '▤',
      title: 'File Manager',
      description: 'Manage sounds, recordings and files stored on your Raspberry Pi.',
      href: '/files',
      action: 'Open files'
    },
    {
      icon: '☎',
      title: 'Telephone',
      description: 'Control the payphone, manage playback and monitor activity.',
      href: '/telephone',
      action: 'Coming soon'
    }
  ];
</script>

<div class="eyebrow">SYSTEM OVERVIEW</div>
<h1>Welcome back <span>✳</span></h1>
<p class="intro">Your Nortel payphone, all in one place.</p>

<div class="hero">
  <div>
    <div class="eyebrow">NORTEL PAYPHONE PROJECT</div>
    <h2>One phone.<br />Endless possibilities.</h2>
    <p>Manage your custom payphone experience from anywhere.</p>
  </div>
  <div class="hero-phone">☎</div>
</div>

<h3>Modules</h3>

<div class="grid">
  {#each modules as module}
    <a href={module.href} class="card">
      <div class="icon">{module.icon}</div>
      <h4>{module.title}</h4>
      <p>{module.description}</p>
      <span>{module.action} →</span>
    </a>
  {/each}
</div>

<style>
  .eyebrow {
    color: #b7d58a;
    font-size: 11px;
    letter-spacing: 2px;
    font-weight: 700;
  }

  h1 { font-size: clamp(30px, 5vw, 48px); margin: 15px 0 8px; }
  h1 span { color: #b7d58a; }
  .intro { color: #98a9a0; margin-bottom: 35px; }

  .hero {
    border: 1px solid #465b42;
    background: linear-gradient(120deg, #293a2e, #19231f);
    border-radius: 18px;
    padding: 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    overflow: hidden;
  }

  .hero h2 {
    font-size: clamp(27px, 4vw, 43px);
    line-height: 1.15;
    margin: 22px 0;
  }

  .hero p { color: #a9b9aa; }
  .hero-phone { font-size: 115px; color: #b7d58a; opacity: .7; }
  h3 { margin: 38px 0 18px; font-size: 20px; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }

  .card {
    background: #1b2222;
    border: 1px solid #34403d;
    padding: 27px;
    border-radius: 14px;
    text-decoration: none;
    transition: .2s;
  }

  .card:hover { border-color: #b7d58a; transform: translateY(-2px); }

  .icon {
    width: 47px;
    height: 47px;
    border-radius: 12px;
    background: #303d32;
    color: #c5e69a;
    display: grid;
    place-items: center;
    font-size: 25px;
  }

  h4 { font-size: 19px; margin: 22px 0 10px; }
  .card p { color: #9aaba2; font-size: 14px; line-height: 1.7; min-height: 65px; }
  .card span { color: #c5e69a; font-size: 13px; font-weight: 600; }

  @media (max-width: 700px) {
    .grid { grid-template-columns: 1fr; }
    .hero { padding: 25px; }
    .hero-phone { font-size: 65px; }
  }
</style>
