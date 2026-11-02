<script lang="ts">

  import { onMount } from 'svelte';
  type FileEntry = {
    name: string;
    isDirectory: boolean;
    size: number;
    modified: string;
  };

  type Root = 'sounds' | 'sounds-kids' | 'voicemail';

  let root: Root = $state('sounds');
  let path = $state('');
  let files: FileEntry[] = $state([]);
  let loading = $state(false);
  let error = $state('');
  let requestNumber = 0;

  const roots: { id: Root; label: string }[] = [
    { id: 'sounds', label: 'Sounds' },
    { id: 'sounds-kids', label: 'Sounds Kids' },
    { id: 'voicemail', label: 'Voicemail' }
  ];

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  async function loadFiles(nextRoot: Root, nextPath = '') {
    const currentRequest = ++requestNumber;

    root = nextRoot;
    path = nextPath;
    files = [];
    error = '';
    loading = true;

    try {
      const response = await fetch('/api/files/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root: nextRoot, path: nextPath })
      });

      const job = await response.json();

      if (!response.ok || !job.id) {
        throw new Error(job.error ?? 'Impossible de demander les fichiers');
      }

      for (let attempt = 0; attempt < 15; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (currentRequest !== requestNumber) return;

        const check = await fetch(
          `/api/pi/status?id=${encodeURIComponent(job.id)}`
        );

        if (!check.ok) throw new Error('Erreur de communication');

        const result = await check.json();

        if (result.status === 'error') {
          throw new Error(result.message ?? 'Erreur du Raspberry');
        }

        if (result.status === 'done') {
          if (!Array.isArray(result.files)) {
            throw new Error('Réponse invalide du Raspberry');
          }

          files = result.files;
          loading = false;
          return;
        }
      }

      throw new Error('Le Raspberry ne répond pas (30 secondes)');
    } catch (err) {
      if (currentRequest !== requestNumber) return;
      error = err instanceof Error ? err.message : 'Erreur inconnue';
      loading = false;
    }
  }


  let playingFile = $state('');
  let audioUrl = $state('');
  let audioLoading = $state(false);
  let audioProgress = $state(0);
  let audioError = $state('');
  let audioRequest = 0;

  function stopAudio() {
    audioRequest++;
    audioLoading = false;
    playingFile = '';
    audioProgress = 0;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = '';
  }

  async function waitForJob(id: string, current: number) {
    for (let attempt = 0; attempt < 20; attempt++) {
      if (current !== audioRequest) throw new Error('Cancelled');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await fetch(
        `/api/pi/status?id=${encodeURIComponent(id)}`
      );
      if (!response.ok) throw new Error('Erreur de communication');

      const result = await response.json();
      if (result.status === 'error') {
        throw new Error(result.message ?? 'Erreur audio');
      }
      if (result.status === 'done') return result;
    }
    throw new Error('Le Raspberry ne répond pas');
  }

  async function playAudio(name: string) {
    stopAudio();
    const current = audioRequest;
    const selectedRoot = root;
    const selectedPath = path ? `${path}/${name}` : name;

    playingFile = name;
    audioLoading = true;
    audioError = '';

    try {
      const chunks: Uint8Array[] = [];
      let total = 1;
      let mime = 'audio/mpeg';

      for (let index = 0; index < total; index++) {
        if (current !== audioRequest) return;

        const response = await fetch('/api/files/audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            root: selectedRoot,
            path: selectedPath,
            index
          })
        });

        const job = await response.json();
        if (!response.ok || !job.id) {
          throw new Error(job.error ?? 'Impossible de lire le fichier');
        }

        const result = await waitForJob(job.id, current);
        if (current !== audioRequest) return;

        if (
          typeof result.audio !== 'string' ||
          result.index !== index ||
          !Number.isInteger(result.total) ||
          result.total < 1 ||
          result.total > 128
        ) {
          throw new Error('Réponse audio invalide');
        }

        if (index === 0) {
          total = result.total;
          mime = result.mime;
        } else if (result.total !== total || result.mime !== mime) {
          throw new Error('Le fichier a changé pendant le transfert');
        }

        const binary = atob(result.audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        chunks.push(bytes);
        audioProgress = Math.round(((index + 1) / total) * 100);
      }

      if (current !== audioRequest) return;

      const blob = new Blob(
        chunks.map((chunk) => Uint8Array.from(chunk).buffer),
        { type: mime }
      );
      audioUrl = URL.createObjectURL(blob);
      audioLoading = false;
    } catch (err) {
      if (current !== audioRequest) return;
      audioLoading = false;
      audioError = err instanceof Error ? err.message : 'Erreur audio';
    }
  }

  function openDirectory(name: string) {
    loadFiles(root, path ? `${path}/${name}` : name);
  }

  function goBack() {
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    loadFiles(root, parts.join('/'));
  }


onMount(() => {
  loadFiles('sounds');
});
</script>

<svelte:head>
  <title>Files | Nortel Control Center</title>
</svelte:head>

<section class="file-manager">
  <header>
    <p class="eyebrow">NORTEL CONTROL CENTER / STORAGE</p>
    <h1>File Manager</h1>
    <p class="subtitle">Fichiers du Raspberry Pi · Lecture seule</p>
  </header>

  <nav class="roots" aria-label="Dossiers principaux">
    {#each roots as item}
      <button
        class:active={root === item.id}
        onclick={() => loadFiles(item.id)}
      >
        📁 {item.label}
      </button>
    {/each}
  </nav>

  <div class="toolbar">
    <button onclick={goBack} disabled={!path || loading}>← Retour</button>
    <span class="location">/ {root}{path ? ` / ${path.split('/').join(' / ')}` : ''}</span>
    <button onclick={() => loadFiles(root, path)} disabled={loading}>↻ Actualiser</button>
  </div>

  {#if playingFile}
    <div class="audio-player">
      <div class="player-heading">
        <strong>♫ {playingFile}</strong>
        <button onclick={stopAudio}>✕ Fermer</button>
      </div>
      {#if audioLoading}
        <p>Chargement audio : {audioProgress}%</p>
        <progress value={audioProgress} max="100"></progress>
      {:else if audioUrl}
        <audio controls autoplay src={audioUrl}></audio>
      {/if}
      {#if audioError}
        <p class="error">{audioError}</p>
      {/if}
    </div>
  {/if}

  {#if loading}
    <p class="message">◌ Communication avec le Raspberry...</p>
  {:else if error}
    <p class="message error">⚠ {error}</p>
  {:else if files.length === 0}
    <p class="message">Ce dossier est vide.</p>
  {:else}
    <div class="entries">
      {#each files as file (file.name)}
        <div class="entry">
          {#if file.isDirectory}
            <button class="filename" onclick={() => openDirectory(file.name)}>
              <span>📁</span>
              <span>{file.name}</span>
            </button>
          {:else}
            <div class="filename">
              <span>♫</span>
              <span>{file.name}</span>
              {#if /\.(mp3|wav|ogg|m4a)$/i.test(file.name)}
                <button
                  class="play-button"
                  onclick={() => playAudio(file.name)}
                  disabled={audioLoading}
                >▶ Écouter</button>
              {/if}
            </div>
          {/if}
          <span class="size">{file.isDirectory ? 'DOSSIER' : formatSize(file.size)}</span>
          <span class="modified">{file.modified ? new Date(file.modified).toLocaleDateString('fr-CA') : '—'}</span>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .file-manager { max-width: 1050px; color: #d5e8d6; }
  header { margin-bottom: 28px; }
  .eyebrow { color: #75b58b; font-size: 11px; letter-spacing: 2px; }
  h1 { font-size: 34px; margin: 8px 0; color: #e3f6e7; }
  .subtitle { color: #849b8b; }
  .roots { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
  button { cursor: pointer; font: inherit; }
  .roots button, .toolbar button {
    background: #17251d; color: #a7cbb0; border: 1px solid #35513e;
    border-radius: 8px; padding: 10px 14px;
  }
  .roots button.active { background: #254d32; border-color: #6bb783; color: #e0ffe8; }
  .roots button:hover, .toolbar button:hover:not(:disabled) { border-color: #9ce0a9; }
  button:disabled { opacity: .4; cursor: default; }
  .toolbar {
    display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
    padding: 14px; background: #111b15; border: 1px solid #2a4030;
    border-radius: 10px 10px 0 0;
  }
  .location { flex: 1; min-width: 170px; color: #b8d9c0; overflow-wrap: anywhere; }
  .entries { border: 1px solid #2a4030; border-top: 0; border-radius: 0 0 10px 10px; overflow: hidden; }
  .entry {
    display: grid; grid-template-columns: minmax(0, 1fr) 100px 120px;
    align-items: center; gap: 12px; padding: 14px;
    background: #101b14; border-bottom: 1px solid #26382b;
  }
  .entry:last-child { border-bottom: 0; }
  .filename { display: flex; align-items: center; gap: 12px; min-width: 0; overflow-wrap: anywhere; }
  button.filename { background: none; border: 0; color: #9ee0b0; text-align: left; padding: 0; }
  button.filename:hover { text-decoration: underline; }
  .size, .modified { font-size: 12px; color: #809987; }
  .message { padding: 30px 15px; color: #a7cbb0; }
  .error { color: #f1a4a4; }
  @media (max-width: 650px) {
    .entry { grid-template-columns: minmax(0, 1fr) 80px; }
    .modified { display: none; }
  }

  .play-button {
    background: #254d32;
    color: #c9f5d4;
    border: 1px solid #568e66;
    border-radius: 6px;
    padding: 5px 9px;
    font-size: 12px;
    white-space: nowrap;
  }
  .audio-player {
    padding: 18px;
    margin-bottom: 14px;
    background: #17251d;
    border: 1px solid #568e66;
    border-radius: 10px;
  }
  .player-heading {
    display: flex;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 12px;
  }
  .player-heading button {
    background: transparent;
    color: #c9f5d4;
    border: 0;
  }
  .audio-player audio, .audio-player progress {
    display: block;
    width: 100%;
  }
</style>
