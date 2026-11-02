<script lang="ts">
  import type { PageProps } from './$types';

  let { form }: PageProps = $props();
  let loading = $state(false);
</script>

<svelte:head>
  <title>Login — Nortel Control Center</title>
</svelte:head>

<div class="login-page">
  <div class="login-card">
    <div class="brand-icon">☎</div>

    <div class="eyebrow">PRIVATE TERMINAL / 001</div>
    <h1>NORTEL</h1>
    <div class="subtitle">CONTROL CENTER</div>

    <div class="divider"></div>

    <div class="section-title">SYSTEM AUTHENTICATION</div>
    <p>Enter your credentials to access the control center.</p>

    <form method="POST" onsubmit={() => (loading = true)}>
      <label for="password">ACCESS PASSWORD</label>

      <input
        id="password"
        name="password"
        type="password"
        autocomplete="current-password"
        placeholder="••••••••••••"
        required
      />

      {#if form?.error}
        <div class="error" role="alert">{form.error}</div>
      {/if}

      <button type="submit" disabled={loading}>
        {loading ? 'AUTHENTICATING...' : 'ACCESS CONTROL CENTER →'}
      </button>
    </form>

    <div class="footer">
      <span class="dot"></span>
      SECURE CONNECTION
      <span class="version">NORTEL / 2026</span>
    </div>
  </div>
</div>

<style>
  .login-page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
    background: #101416;
    color: #e7ece8;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .login-card {
    width: 100%;
    max-width: 440px;
    padding: 42px;
    background: #171d1e;
    border: 1px solid #303a38;
    border-radius: 16px;
  }

  .brand-icon {
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    border-radius: 14px;
    background: #b7d58a;
    color: #172019;
    font-size: 32px;
    margin-bottom: 30px;
  }

  .eyebrow, .subtitle, .section-title, label, .footer {
    font-size: 10px;
    letter-spacing: 2px;
  }

  .eyebrow { color: #8e9d96; }
  h1 { font-size: 42px; letter-spacing: 7px; margin: 12px 0 4px; }
  .subtitle { color: #b7d58a; }
  .divider { border-top: 1px solid #303a38; margin: 34px 0; }
  .section-title { color: #b7d58a; }

  p {
    color: #93a39a;
    font-size: 13px;
    line-height: 1.7;
    margin: 14px 0 28px;
  }

  label { display: block; color: #a9b7b0; margin-bottom: 12px; }

  input {
    width: 100%;
    padding: 16px;
    border: 1px solid #394840;
    border-radius: 8px;
    background: #101416;
    color: #e7ece8;
    font-size: 15px;
    outline: none;
  }

  input:focus { border-color: #b7d58a; }

  button {
    width: 100%;
    margin-top: 20px;
    padding: 17px;
    border: none;
    border-radius: 8px;
    background: #b7d58a;
    color: #172019;
    font-weight: 800;
    font-size: 12px;
    letter-spacing: 1px;
    cursor: pointer;
  }

  button:hover { background: #c9e5a4; }
  button:disabled { opacity: 0.6; }

  .error { color: #f5a9a9; font-size: 12px; margin-top: 12px; }

  .footer {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #71877b;
    margin-top: 36px;
    letter-spacing: 1px;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #b7d58a;
  }

  .version { margin-left: auto; }

  @media (max-width: 480px) {
    .login-card { padding: 28px; }
  }
</style>
