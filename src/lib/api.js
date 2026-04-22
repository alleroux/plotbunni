const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
const TOKEN_KEY = 'plotbunni_auth_token';

function getAuthHeader() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeader(), ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${options.method || 'GET'} ${path} failed (${res.status}): ${text}`);
  }
  if (res.status === 204) return undefined;
  return res.json();
}

// --- Format converters ---

function backendToFrontend(full) {
  const extra = full.extra_data || {};

  // Flatten nested acts → chapters → scenes into flat maps
  const acts = {};
  const chapters = {};
  const scenes = {};
  const actOrder = [];

  for (const act of full.acts || []) {
    actOrder.push(act.id);
    const chapterOrder = [];
    for (const ch of act.chapters || []) {
      chapterOrder.push(ch.id);
      const sceneOrder = [];
      for (const sc of ch.scenes || []) {
        sceneOrder.push(sc.id);
        scenes[sc.id] = {
          id: sc.id,
          name: sc.name,
          synopsis: sc.synopsis ?? '',
          content: sc.content ?? '',
          tags: sc.tags || [],
          context: sc.concept_ids || [],
          autoUpdateContext: sc.auto_update_context || false,
          creation_date: sc.created_at,
          last_modified_date: sc.updated_at,
        };
      }
      chapters[ch.id] = {
        id: ch.id,
        name: ch.name,
        sceneOrder,
        creation_date: ch.created_at,
        last_modified_date: ch.updated_at,
      };
    }
    acts[act.id] = {
      id: act.id,
      name: act.name,
      chapterOrder,
      creation_date: act.created_at,
      last_modified_date: act.updated_at,
    };
  }

  const concepts = (full.concepts || []).map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    aliases: c.aliases || [],
    tags: c.tags || [],
    description: c.description ?? '',
    notes: c.notes ?? '',
    priority: c.priority || 0,
    image: c.image ?? null,
    creation_date: c.created_at,
    last_modified_date: c.updated_at,
  }));

  const conceptTemplates = (full.concept_templates || []).map(t => ({
    id: t.id,
    name: t.name,
    templateData: t.template_data || {},
    isDefault: t.is_default || false,
    creation_date: t.created_at,
    last_modified_date: t.updated_at,
  }));

  return {
    authorName: full.author ?? '',
    synopsis: full.synopsis ?? '',
    coverImage: full.cover_image ?? null,
    pointOfView: full.pov ?? '',
    genre: full.genre ?? '',
    timePeriod: full.time_period ?? '',
    targetAudience: full.audience ?? '',
    themes: extra.themes ?? '',
    tone: full.tone ?? '',
    concepts,
    acts,
    chapters,
    scenes,
    actOrder,
    conceptTemplates,
  };
}

function frontendToBackend(novelData) {
  const { themes, ...rest } = novelData;

  const acts = (novelData.actOrder || []).map((actId, actPos) => {
    const act = novelData.acts[actId] || {};
    const chapArr = (act.chapterOrder || []).map((chId, chPos) => {
      const ch = novelData.chapters[chId] || {};
      const sceneArr = (ch.sceneOrder || []).map((scId, scPos) => {
        const sc = novelData.scenes[scId] || {};
        return {
          id: sc.id,
          name: sc.name || '',
          synopsis: sc.synopsis || null,
          content: sc.content || null,
          tags: sc.tags || [],
          auto_update_context: sc.autoUpdateContext || false,
          position: scPos,
          concept_ids: sc.context || [],
        };
      });
      return { id: ch.id, name: ch.name || '', position: chPos, scenes: sceneArr };
    });
    return { id: act.id, name: act.name || '', position: actPos, chapters: chapArr };
  });

  const concepts = (novelData.concepts || []).map(c => ({
    id: c.id,
    type: c.type || 'character',
    name: c.name || '',
    aliases: c.aliases || [],
    tags: c.tags || [],
    description: c.description || null,
    notes: c.notes || null,
    priority: c.priority || 0,
    image: c.image || null,
  }));

  const conceptTemplates = (novelData.conceptTemplates || []).map(t => ({
    id: t.id,
    name: t.name || '',
    template_data: t.templateData || {},
    is_default: t.isDefault || false,
  }));

  return {
    author: novelData.authorName || null,
    synopsis: novelData.synopsis || null,
    cover_image: novelData.coverImage || null,
    pov: novelData.pointOfView || null,
    genre: novelData.genre || null,
    time_period: novelData.timePeriod || null,
    audience: novelData.targetAudience || null,
    tone: novelData.tone || null,
    extra_data: { themes: themes || '' },
    concepts,
    acts,
    concept_templates: conceptTemplates,
  };
}

// --- Public API (same interface as indexedDb.js) ---

export async function getAllNovelMetadata() {
  const novels = await apiFetch('/api/v1/novels');
  return (novels || []).map(n => ({
    id: n.id,
    name: n.name,
    lastModified: n.updated_at,
    synopsis: n.synopsis ?? '',
    coverImage: n.cover_image ?? null,
  }));
}

export async function saveAllNovelMetadata(_metadataList) {
  // Novel ordering is not yet tracked server-side; no-op for now.
}

export async function getNovelData(novelId) {
  if (!novelId) return undefined;
  try {
    const full = await apiFetch(`/api/v1/novels/${novelId}/full`);
    return backendToFrontend(full);
  } catch (err) {
    console.error('getNovelData:', err);
    return undefined;
  }
}

export async function saveNovelData(novelId, novelData) {
  if (!novelId) return;
  const payload = frontendToBackend(novelData);
  await apiFetch(`/api/v1/novels/${novelId}/full`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function createNovel(novelName) {
  if (!novelName || novelName.trim() === '') throw new Error('Novel name cannot be empty.');
  const result = await apiFetch('/api/v1/novels', {
    method: 'POST',
    body: JSON.stringify({ name: novelName.trim() }),
  });
  return {
    id: result.id,
    name: novelName.trim(),
    lastModified: new Date().toISOString(),
    synopsis: '',
    coverImage: null,
  };
}

export async function updateNovelMetadata(novelId, metadataUpdates) {
  if (!novelId) return;
  const mapped = {};
  if (metadataUpdates.name !== undefined) mapped.name = metadataUpdates.name;
  if (metadataUpdates.synopsis !== undefined) mapped.synopsis = metadataUpdates.synopsis;
  if (metadataUpdates.coverImage !== undefined) mapped.cover_image = metadataUpdates.coverImage;
  await apiFetch(`/api/v1/novels/${novelId}`, {
    method: 'PUT',
    body: JSON.stringify(mapped),
  });
}

export async function deleteNovel(novelId) {
  if (!novelId) return;
  await apiFetch(`/api/v1/novels/${novelId}`, { method: 'DELETE' });
}
