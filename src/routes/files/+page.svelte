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
      const response = await fetch('/api/files/direct-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root: nextRoot, path: nextPath })
      });

      const result = await response.json();

      if (!response.ok || !Array.isArray(result.files)) {
        throw new Error(result.error ?? 'Impossible de charger les fichiers');
      }

      if (currentRequest !== requestNumber) return;

      files = result.files.map((file: {
        name: string;
        size: number;
        modified: number;
      }) => ({
        name: file.name,
        isDirectory: false,
        size: file.size,
        modified: new Date(file.modified * 1000).toISOString()
      }));

    } catch (err) {
      if (currentRequest !== requestNumber) return;
      error = err instanceof Error ? err.message : 'Erreur inconnue';
    } finally {
      if (currentRequest === requestNumber) {
        loading = false;
      }
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

    playingFile = name;
    audioLoading = false;
    audioError = '';

    const params = new URLSearchParams({
      root,
      filename: name
    });

    audioUrl = `/api/files/direct-audio?${params.toString()}`;
  }


  const UPLOAD_CHUNK_SIZE = 64 * 1024;
  const UPLOAD_MAX_SIZE = 16 * 1024 * 1024;

  let uploading = $state(false);
  let uploadProgress = $state(0);
  let uploadMessage = $state('');
  let uploadError = $state('');
  let dragging = $state(false);
  let fileInput: HTMLInputElement;

  async function uploadFiles(selected: FileList | File[]) {
    if (uploading) return;

    const selectedFiles = Array.from(selected);
    if (!selectedFiles.length) return;

    const selectedRoot = root;
    const selectedPath = path;

    uploading = true;
    uploadError = '';
    uploadMessage = '';
    uploadProgress = 0;

    try {
      for (let index = 0; index < selectedFiles.length; index++) {
        const file = selectedFiles[index];

        if (!/\.(mp3|wav|ogg|m4a)$/i.test(file.name)) {
          throw new Error(`Format non autorisé : ${file.name}`);
        }

        if (file.size === 0 || file.size > 4 * 1024 * 1024) {
          throw new Error(`Maximum 4 Mio : ${file.name}`);
        }

        if (file.name.includes('/') || file.name.includes('\\\\')) {
          throw new Error(`Nom invalide : ${file.name}`);
        }

        if (files.some((entry) => entry.name === file.name)) {
          throw new Error(`Ce fichier existe déjà : ${file.name}`);
        }

        uploadMessage = `Envoi de ${file.name} (${index + 1}/${selectedFiles.length})`;

        const form = new FormData();
        form.set('file', file);

        const response = await fetch(
          `/api/files/direct-upload?root=${encodeURIComponent(selectedRoot)}`,
          {
            method: 'POST',
            body: form
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            typeof result.error === 'string'
              ? result.error
              : JSON.stringify(result.error ?? 'Erreur de transfert')
          );
        }

        uploadProgress = Math.round(
          ((index + 1) / selectedFiles.length) * 100
        );
      }

      uploadMessage = '✓ Transfert terminé!';

      if (root === selectedRoot && path === selectedPath) {
        await loadFiles(selectedRoot, selectedPath);
      }
    } catch (err) {
      uploadError = err instanceof Error ? err.message : 'Erreur inconnue';
      uploadMessage = 'Transfert interrompu';
    } finally {
      uploading = false;
      if (fileInput) fileInput.value = '';
    }
  }


  let fileActionError = $state('');
  let busyFile = $state('');

  async function renameFile(name: string) {
    const newName = window.prompt('Nouveau nom du fichier :', name);

    if (newName === null || newName === name) return;

    if (
      !newName ||
      newName === '.' ||
      newName === '..' ||
      newName.includes('/') ||
      newName.includes('\\') ||
      !/\.(mp3|wav|ogg|m4a)$/i.test(newName)
    ) {
      fileActionError = 'Nom de fichier invalide';
      return;
    }

    if (files.some((file) => file.name === newName)) {
      fileActionError = 'Un fichier porte déjà ce nom';
      return;
    }

    const selectedRoot = root;
    fileActionError = '';
    busyFile = name;

    try {
      const response = await fetch('/api/files/direct-rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          root: selectedRoot,
          old_name: name,
          new_name: newName
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Impossible de renommer');
      }

      if (playingFile === name) stopAudio();

      if (root === selectedRoot) {
        await loadFiles(selectedRoot);
      }
    } catch (err) {
      fileActionError = err instanceof Error ? err.message : 'Erreur inconnue';
    } finally {
      busyFile = '';
    }
  }

  async function deleteFile(name: string) {
    if (!window.confirm(`Supprimer définitivement « ${name} » du Raspberry ?`)) {
      return;
    }

    const selectedRoot = root;
    fileActionError = '';
    busyFile = name;

    try {
      const response = await fetch('/api/files/direct-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          root: selectedRoot,
          filename: name
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Impossible de supprimer');
      }

      if (playingFile === name) stopAudio();

      if (root === selectedRoot) {
        await loadFiles(selectedRoot);
      }
    } catch (err) {
      fileActionError = err instanceof Error ? err.message : 'Erreur inconnue';
    } finally {
      busyFile = '';
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragging = false;
    if (event.dataTransfer?.files) {
      void uploadFiles(event.dataTransfer.files);
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
    <p class="subtitle">Fichiers du Raspberry Pi · Lecture et importation</p>
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


  <div
    class="upload-zone"
    class:dragging
    role="region"
    aria-label="Importer des fichiers audio"
    ondragover={(event) => {
      event.preventDefault();
      dragging = true;
    }}
    ondragleave={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
        dragging = false;
      }
    }}
    ondrop={handleDrop}
  >
    <p>♫ Glisse tes fichiers audio ici</p>
    <p class="upload-hint">MP3, WAV, OGG, M4A · Maximum 4 Mio par fichier</p>

    <input
      type="file"
      accept=".mp3,.wav,.ogg,.m4a"
      multiple
      bind:this={fileInput}
      disabled={uploading}
      onchange={(event) => {
        if (event.currentTarget.files) {
          void uploadFiles(event.currentTarget.files);
        }
      }}
    />

    {#if uploading}
      <p>{uploadMessage} — {uploadProgress}%</p>
      <progress value={uploadProgress} max="100"></progress>
    {:else if uploadMessage}
      <p>{uploadMessage}</p>
    {/if}

    {#if uploadError}
      <p class="error">⚠ {uploadError}</p>
    {/if}
  </div>

  {#if fileActionError}
    <p class="message error">⚠ {fileActionError}</p>
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
          {#if !file.isDirectory}
            <div class="file-actions">
              <button
                onclick={() => renameFile(file.name)}
                disabled={!!busyFile || uploading}
              >✏️ Renommer</button>
              <button
                class="delete-button"
                onclick={() => deleteFile(file.name)}
                disabled={!!busyFile || uploading}
              >🗑️ Supprimer</button>
            </div>
          {/if}
          <span class="size">{file.isDirectory ? 'DOSSIER' : formatSize(file.size)}</span>
          <span class="modified">{file.modified ? new Date(file.modified).toLocaleDateString('fr-CA') : '—'}</span>
        </div>
          {#if playingFile === file.name && !file.isDirectory}
            <div class="inline-audio-player">
              <div class="player-heading">
                <strong>♫ {file.name}</strong>
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
      {/each}
    </div>
  {/if}
</section>

<style>

  .upload-zone {
    padding: 22px;
    margin: 16px 0;
    background: #14251a;
    border: 2px dashed #568e66;
    border-radius: 10px;
    text-align: center;
  }
  .upload-zone.dragging {
    background: #254d32;
    border-color: #b4efbd;
  }
  .upload-zone p { margin: 8px 0; }
  .upload-hint { color: #849b8b; font-size: 13px; }
  .upload-zone input {
    display: block;
    max-width: 100%;
    margin: 14px auto;
    color: #c9f5d4;
  }
  .upload-zone progress {
    display: block;
    width: 100%;
    margin-top: 12px;
  }
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


  .file-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .file-actions button {
    background: #17251d;
    color: #c9f5d4;
    border: 1px solid #35513e;
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 12px;
  }

  .file-actions .delete-button {
    color: #f1a4a4;
    border-color: #704343;
  }

  .entry {
    grid-template-columns: minmax(0, 1fr) auto 100px 120px;
  }

  @media (max-width: 750px) {
    .entry {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .size, .modified {
      display: none;
    }
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

  .inline-audio-player {
    padding: 16px 20px;
    background: #1c3022;
    border-bottom: 1px solid #568e66;
  }

  .inline-audio-player audio {
    display: block;
    width: 100%;
  }

  .inline-audio-player .player-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .inline-audio-player .player-heading button {
    background: transparent;
    border: 0;
    color: #c9f5d4;
    cursor: pointer;
  }

</style>
