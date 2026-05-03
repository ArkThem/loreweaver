(() => {
  const MODULE_NAME = 'loreweaverProxy';
  const EXTENSION_VERSION = '0.2.13';
  const FEATURES = [
    'status',
    'models',
    'metadata',
    'send-last',
    'rebuild-chat',
    'rebuild-job',
    'retrieve',
    'prompt-preview',
    'debug-chat',
    'graph-debug',
    'entity-merge',
    'pending',
    'ui-smoke',
    'hygiene',
  ];
  const DEFAULTS = {
    enabled: true,
    proxyUrl: 'http://localhost:8088',
    automationMode: 'draft',
    worldId: 'default-world',
    sendEvents: true,
  };

  const state = {
    busy: false,
    status: 'Idle',
    settings: { ...DEFAULTS },
  };

  function getContext() {
    if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
      return window.SillyTavern.getContext();
    }
    if (typeof window.getContext === 'function') {
      return window.getContext();
    }
    return null;
  }

  function loadSettings() {
    const context = getContext();
    const settingsRoot = context?.extensionSettings || window.extension_settings || {};
    settingsRoot[MODULE_NAME] = { ...DEFAULTS, ...(settingsRoot[MODULE_NAME] || {}) };
    state.settings = settingsRoot[MODULE_NAME];
  }

  function saveSettings() {
    const context = getContext();
    if (context?.saveSettingsDebounced) {
      context.saveSettingsDebounced();
    } else if (typeof window.saveSettingsDebounced === 'function') {
      window.saveSettingsDebounced();
    }
  }

  function setStatus(text, busy = false) {
    state.status = text;
    state.busy = busy;
    const status = document.querySelector('#loreweaver-proxy-status');
    const progress = document.querySelector('#loreweaver-proxy-progress');
    const progressDetail = document.querySelector('#loreweaver-proxy-progress-detail');
    if (status) status.textContent = text;
    if (progress) {
      progress.hidden = !busy;
      if (busy) {
        progress.removeAttribute('value');
        progress.removeAttribute('max');
      }
    }
    if (progressDetail) {
      progressDetail.hidden = !busy;
      progressDetail.textContent = busy ? text : '';
    }
  }

  function mountPanel({ force = true } = {}) {
    const existing = document.querySelector('#loreweaver-proxy-panel');
    if (existing && !force) return;
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'loreweaver-proxy-panel';
    panel.innerHTML = `
      <div class="lw-row">
        <strong>LoreWeaver Proxy</strong>
        <span class="lw-version">v${EXTENSION_VERSION}</span>
        <span id="loreweaver-proxy-status" class="lw-status lw-grow">Idle</span>
      </div>
      <progress id="loreweaver-proxy-progress" hidden></progress>
      <div id="loreweaver-proxy-progress-detail" class="lw-progress-detail" hidden></div>
      <div class="lw-row">
        <label for="loreweaver-proxy-enabled">Enabled</label>
        <input id="loreweaver-proxy-enabled" type="checkbox">
      </div>
      <div class="lw-row">
        <label for="loreweaver-proxy-url">Proxy</label>
        <input id="loreweaver-proxy-url" class="lw-grow" type="url">
        <button id="loreweaver-proxy-health" type="button">Check</button>
      </div>
      <div class="lw-row">
        <label for="loreweaver-proxy-mode">Mode</label>
        <select id="loreweaver-proxy-mode">
          <option value="draft">Draft</option>
          <option value="safe_auto">Safe Auto</option>
          <option value="full_auto">Full Auto</option>
        </select>
        <button id="loreweaver-proxy-pending" type="button">Pending</button>
      </div>
      <div class="lw-row lw-wrap">
        <button id="loreweaver-proxy-debug-status" type="button">Status</button>
        <button id="loreweaver-proxy-models" type="button">Models</button>
        <button id="loreweaver-proxy-metadata" type="button">Metadata</button>
        <button id="loreweaver-proxy-send-last" type="button">Send Last</button>
        <button id="loreweaver-proxy-rebuild" type="button">Rebuild Chat</button>
        <button id="loreweaver-proxy-retrieve" type="button">Retrieve</button>
        <button id="loreweaver-proxy-prompt-preview" type="button">Prompt Preview</button>
        <button id="loreweaver-proxy-debug-chat" type="button">Debug Chat</button>
        <button id="loreweaver-proxy-graph-debug" type="button">Graph Debug</button>
        <button id="loreweaver-proxy-merge-entity" type="button">Merge Entity</button>
        <button id="loreweaver-proxy-hygiene" type="button">Hygiene</button>
        <button id="loreweaver-proxy-apply-hygiene" type="button">Apply Hygiene</button>
        <button id="loreweaver-proxy-smoke" type="button">UI Smoke</button>
        <button id="loreweaver-proxy-clear-debug" type="button">Clear</button>
      </div>
      <div id="loreweaver-proxy-ops" class="lw-ops"></div>
      <div class="lw-output-wrap">
        <button id="loreweaver-proxy-copy-debug" class="lw-copy-all" type="button" title="Copy all" aria-label="Copy all output">
          <span aria-hidden="true">⧉</span>
        </button>
        <pre id="loreweaver-proxy-debug-output" class="lw-debug-output"></pre>
      </div>
    `;

    const target =
      document.querySelector('#extensions_settings') ||
      document.querySelector('#extensionsMenu') ||
      document.body;
    target.appendChild(panel);

    const enabled = panel.querySelector('#loreweaver-proxy-enabled');
    const url = panel.querySelector('#loreweaver-proxy-url');
    const mode = panel.querySelector('#loreweaver-proxy-mode');
    enabled.checked = Boolean(state.settings.enabled);
    url.value = state.settings.proxyUrl;
    mode.value = state.settings.automationMode;

    enabled.addEventListener('change', () => {
      state.settings.enabled = enabled.checked;
      saveSettings();
    });
    url.addEventListener('change', () => {
      state.settings.proxyUrl = url.value.trim().replace(/\/$/, '') || DEFAULTS.proxyUrl;
      saveSettings();
    });
    mode.addEventListener('change', () => {
      state.settings.automationMode = mode.value;
      saveSettings();
    });
    panel.querySelector('#loreweaver-proxy-health').addEventListener('click', checkHealth);
    panel.querySelector('#loreweaver-proxy-pending').addEventListener('click', refreshPending);
    panel.querySelector('#loreweaver-proxy-debug-status').addEventListener('click', debugStatus);
    panel.querySelector('#loreweaver-proxy-models').addEventListener('click', showModels);
    panel.querySelector('#loreweaver-proxy-metadata').addEventListener('click', showMetadata);
    panel.querySelector('#loreweaver-proxy-send-last').addEventListener('click', sendLastMessage);
    panel.querySelector('#loreweaver-proxy-rebuild').addEventListener('click', rebuildCurrentChat);
    panel.querySelector('#loreweaver-proxy-retrieve').addEventListener('click', retrieveMemoryPreview);
    panel.querySelector('#loreweaver-proxy-prompt-preview').addEventListener('click', promptPreview);
    panel.querySelector('#loreweaver-proxy-debug-chat').addEventListener('click', debugCurrentChat);
    panel.querySelector('#loreweaver-proxy-graph-debug').addEventListener('click', graphDebugCurrentChat);
    panel.querySelector('#loreweaver-proxy-merge-entity').addEventListener('click', mergeEntity);
    panel.querySelector('#loreweaver-proxy-hygiene').addEventListener('click', hygienePreview);
    panel.querySelector('#loreweaver-proxy-apply-hygiene').addEventListener('click', applyHygiene);
    panel.querySelector('#loreweaver-proxy-smoke').addEventListener('click', runUISmokeTests);
    panel.querySelector('#loreweaver-proxy-clear-debug').addEventListener('click', clearDebug);
    panel.querySelector('#loreweaver-proxy-copy-debug').addEventListener('click', () => {
      const output = panel.querySelector('#loreweaver-proxy-debug-output');
      copyText(output?.textContent || '', 'Debug output copied');
    });
  }

  function bindEvents() {
    const context = getContext();
    const eventSource = context?.eventSource;
    const eventTypes = context?.eventTypes || context?.event_types || window.event_types;
    if (!eventSource || !eventTypes) {
      setStatus('SillyTavern event bus not found');
      return;
    }

    const on = eventSource.on?.bind(eventSource) || eventSource.addEventListener?.bind(eventSource);
    if (!on) return;

    if (eventTypes.MESSAGE_SENT) {
      on(eventTypes.MESSAGE_SENT, (message) => sendMessageEvent('message_created', message, 'user'));
    }
    if (eventTypes.MESSAGE_RECEIVED) {
      on(eventTypes.MESSAGE_RECEIVED, (message) =>
        sendMessageEvent('message_created', message, 'character'),
      );
    }
    if (eventTypes.MESSAGE_EDITED) {
      on(eventTypes.MESSAGE_EDITED, (message) => sendMessageEvent('message_updated', message, 'user'));
    }
    if (eventTypes.MESSAGE_DELETED) {
      on(eventTypes.MESSAGE_DELETED, (message) => sendMessageEvent('message_deleted', message, 'system'));
    }
    if (eventTypes.CHAT_CHANGED) {
      on(eventTypes.CHAT_CHANGED, () => setStatus('Chat changed'));
    }
  }

  async function sendMessageEvent(eventType, message, fallbackSpeakerType) {
    if (!state.settings.enabled || !state.settings.sendEvents || !state.settings.proxyUrl) return;
    const resolvedMessage = resolveEventMessage(message, fallbackSpeakerType);
    const content = extractMessageContent(resolvedMessage).trim();
    if (eventType !== 'message_deleted' && !content) {
      setStatus('Skipped empty message event');
      return;
    }
    const metadata = await buildSTMemoryMetadata(resolvedMessage, fallbackSpeakerType);
    const endpoint =
      eventType === 'message_updated'
        ? '/v1/st/events/message-updated'
        : eventType === 'message_deleted'
          ? '/v1/st/events/message-deleted'
          : '/v1/st/events/message';
    const eventSpeakerName = speakerName(resolvedMessage);
    const groupMembers = metadata.group?.members || [];
    const resolvedSpeaker = metadata.message.speaker_type === 'character'
      ? resolveMetadataMember(metadata, eventSpeakerName) || metadata.active_character
      : null;
    const visibleTo = [
      metadata.profile_id,
      metadata.active_character?.character_id,
      ...groupMembers.map((member) => member.character_id),
    ].filter(Boolean);

    const payload = {
      event_type: eventType,
      message_id: metadata.message.message_id,
      chat_id: metadata.chat_id,
      world_id: metadata.world_id,
      speaker: {
        type: metadata.message.speaker_type,
        id: resolvedSpeaker?.character_id || metadata.message.speaker_id || metadata.profile_id || 'speaker',
        name: eventSpeakerName,
      },
      visible_to: visibleTo,
      content,
      active_character_context: resolvedSpeaker || metadata.active_character,
      group_context: metadata.group,
      created_at: new Date().toISOString(),
    };

    try {
      setStatus('Indexing message', true);
      await postJson(endpoint, payload);
      setStatus('Indexed');
    } catch (error) {
      setStatus(`Proxy error: ${error.message}`);
    }
  }

  async function buildSTMemoryMetadata(message = {}, fallbackSpeakerType = 'user') {
    message = message || {};
    const context = getContext() || {};
    const character = currentCharacter(context);
    const characterId = character ? await characterIdFromCard(character) : null;
    const group = await buildGroupContext(context);
    const chatId = String(context.chatId || context.chat_id || context.chat?.id || 'default-chat');
    const messageId = stableMessageId(message, chatMessageIndex(message), chatId);
    const activeCharacter = character
      ? {
          character_id: characterId,
          name: character.name || context.name2 || 'Character',
          fingerprint: characterId.split('_').pop(),
          aliases: characterAliases(character, context),
        }
      : null;
    return {
      schema_version: '1.0',
      extension_version: EXTENSION_VERSION,
      user_id: context.name1 || 'default-user',
      profile_id: context.name1 || 'profile_001',
      world_id: state.settings.worldId || context.worldName || 'default-world',
      chat_id: chatId,
      mode: context.groupId || context.group_id ? 'group' : 'single',
      memory_scope: 'character_private',
      active_character: activeCharacter,
      group,
      message: {
        message_id: messageId,
        parent_message_id: null,
        speaker_type: fallbackSpeakerType,
        speaker_id: fallbackSpeakerType === 'character' ? characterId : context.name1 || 'profile_001',
        is_deleted: false,
        is_edited: false,
      },
      retrieval: {
        enabled: true,
        max_memory_tokens: 1024,
        max_hops: 1,
        include_world_memory: true,
        include_character_memory: true,
        include_chat_memory: true,
      },
    };
  }

  async function checkHealth() {
    try {
      setStatus('Checking proxy', true);
      const health = await getJson('/readyz');
      showDebug(health);
      setStatus(`Proxy ${health.status}`);
    } catch (error) {
      setStatus(`Proxy offline: ${error.message}`);
    }
  }

  async function refreshPending() {
    try {
      setStatus('Loading pending ops', true);
      const response = await getJson('/v1/lore/pending');
      renderOperations(response.items || []);
      showDebug(summarizePending(response.items || []));
      setStatus(`${(response.items || []).length} pending`);
    } catch (error) {
      setStatus(`Pending failed: ${error.message}`);
    }
  }

  async function debugStatus() {
    await runDebugAction('Loading status', async () => getJson('/v1/debug/status'));
  }

  async function showModels() {
    await runDebugAction('Loading models', async () => getJson('/v1/models'));
  }

  async function showMetadata() {
    const metadata = await buildSTMemoryMetadata(lastChatMessage(), 'user');
    showDebug(metadata);
    setStatus('Metadata shown');
  }

  async function sendLastMessage() {
    const message = lastChatMessage();
    if (!message) {
      setStatus('No chat message found');
      return;
    }
    const speakerType = message?.is_user ? 'user' : 'character';
    await sendMessageEvent('message_created', message, speakerType);
    await debugCurrentChat();
  }

  async function rebuildCurrentChat() {
    try {
      setStatus('Queueing rebuild job', true);
      const request = await buildChatSyncRequest();
      if (!request.messages.length) {
        setStatus('No chat messages found');
        showDebug(request);
        return;
      }
      const job = await postJson('/v1/memory/rebuild-chat-jobs', request);
      showDebug({ request_summary: summarizeChatSyncRequest(request), job });
      setRebuildProgress(job, 'Queued rebuild job');
      const finalJob = await pollRebuildJob(job.job_id);
      showDebug({ request_summary: summarizeChatSyncRequest(request), job: finalJob });
      if (finalJob.status === 'completed') {
        setRebuildProgress(finalJob, 'Rebuild completed', false);
      } else {
        setRebuildProgress(finalJob, `Rebuild ${finalJob.status}`, false);
      }
    } catch (error) {
      setStatus(`Rebuild failed: ${error.message}`);
    }
  }

  async function pollRebuildJob(jobId) {
    if (!jobId) throw new Error('rebuild job_id missing');
    let job = null;
    for (let attempt = 0; attempt < 900; attempt += 1) {
      job = await getJson(`/v1/memory/rebuild-chat-jobs/${encodeURIComponent(jobId)}`);
      setRebuildProgress(job);
      if (job.status === 'completed' || job.status === 'failed') return job;
      await sleep(2000);
    }
    return job || { job_id: jobId, status: 'unknown', error: 'poll timeout' };
  }

  function setRebuildProgress(job, label = '', busy = null) {
    const total = Number(job?.messages_total || 0);
    const processed = Number(job?.messages_processed || 0);
    const records = Number(job?.records || 0);
    const operations = Number(job?.operations || 0);
    const statusText = String(job?.status || 'unknown');
    const isBusy = busy ?? !['completed', 'failed'].includes(statusText);
    const percent = total > 0 ? Math.round((Math.min(processed, total) / total) * 100) : 0;
    const title = label || `Rebuild ${statusText}`;
    const detailParts = [
      `${title}: ${processed}/${total || '?'} messages`,
      total > 0 ? `${percent}%` : null,
      `${records} records`,
      `${operations} operations`,
      job?.job_id ? `job ${job.job_id}` : null,
    ].filter(Boolean);
    const detail = detailParts.join(' · ');

    state.status = detail;
    state.busy = isBusy;

    const status = document.querySelector('#loreweaver-proxy-status');
    const progress = document.querySelector('#loreweaver-proxy-progress');
    const progressDetail = document.querySelector('#loreweaver-proxy-progress-detail');

    if (status) status.textContent = detail;
    if (progress) {
      progress.hidden = false;
      if (total > 0) {
        progress.max = total;
        progress.value = Math.min(processed, total);
      } else {
        progress.removeAttribute('value');
        progress.removeAttribute('max');
      }
    }
    if (progressDetail) {
      progressDetail.hidden = false;
      progressDetail.textContent = job?.error ? `${detail} · ${job.error}` : detail;
    }
  }

  async function retrieveMemoryPreview() {
    try {
      setStatus('Retrieving memory', true);
      const query = prompt('Memory query', extractMessageContent(lastChatMessage()) || '');
      if (query === null) {
        setStatus('Retrieve cancelled');
        return;
      }
      const metadata = await buildSTMemoryMetadata(lastChatMessage(), 'user');
      const response = await postJson('/v1/memory/retrieve', {
        metadata,
        query,
        recent_messages: currentChatMessages().slice(-12),
      });
      showDebug(response);
      setStatus(`${response.records?.length || 0} memories retrieved`);
    } catch (error) {
      setStatus(`Retrieve failed: ${error.message}`);
    }
  }

  async function promptPreview() {
    try {
      setStatus('Building prompt preview', true);
      const query = prompt('Prompt preview query', lastUserMessageContent() || '');
      if (query === null) {
        setStatus('Prompt preview cancelled');
        return;
      }
      const metadata = await buildSTMemoryMetadata(lastChatMessage(), 'user');
      const response = await postJson('/v1/memory/prompt-preview', {
        model: 'loreweaver-prompt-preview',
        stream: false,
        st_memory: metadata,
        messages: [{ role: 'user', content: query }],
      });
      showDebug(response);
      setStatus(
        response.injected
          ? `Memory injected (${response.records_count || 0} records)`
          : 'No memory injected',
      );
    } catch (error) {
      setStatus(`Prompt preview failed: ${error.message}`);
    }
  }

  async function debugCurrentChat() {
    try {
      setStatus('Loading chat debug', true);
      const metadata = await buildSTMemoryMetadata(lastChatMessage(), 'user');
      const response = await getJson(
        `/v1/memory/debug/chat/${encodeURIComponent(metadata.world_id)}/${encodeURIComponent(metadata.chat_id)}?limit=80`,
      );
      showDebug(response);
      setStatus(`${response.counts?.facts_active || 0} active facts`);
    } catch (error) {
      setStatus(`Debug chat failed: ${error.message}`);
    }
  }

  async function graphDebugCurrentChat() {
    try {
      setStatus('Loading graph debug', true);
      const metadata = await buildSTMemoryMetadata(lastChatMessage(), 'user');
      const response = await getJson(
        `/v1/graph/statements/${encodeURIComponent(metadata.world_id)}?status=all&chat_id=${encodeURIComponent(metadata.chat_id)}`,
      );
      const items = response.items || [];
      showDebug({
        summary: summarizeGraphStatements(items),
        entity_map: response.entity_map || {},
        missing_entity_ids: response.missing_entity_ids || [],
        items,
      });
      setStatus(`${items.length} graph statements`);
    } catch (error) {
      setStatus(`Graph debug failed: ${error.message}`);
    }
  }

  async function mergeEntity() {
    try {
      const metadata = await buildSTMemoryMetadata(lastChatMessage(), 'user');
      const sourceEntityId = window.prompt('Source entity id to merge/deactivate');
      if (!sourceEntityId) return;
      const targetEntityId = window.prompt('Target canonical entity/character id');
      if (!targetEntityId) return;
      const source = sourceEntityId.trim();
      const target = targetEntityId.trim();
      if (!source || !target) return;
      if (source === target) throw new Error('Source and target must differ');
      if (!window.confirm(`Merge "${source}" into "${target}" in world "${metadata.world_id}"?`)) return;
      setStatus('Merging entity', true);
      const response = await postJson('/v1/entities/merge', {
        world_id: metadata.world_id,
        source_entity_id: source,
        target_entity_id: target,
        reason: 'manual_ui_merge',
      });
      showDebug(response);
      setStatus('Entity merge complete');
    } catch (error) {
      setStatus(`Entity merge failed: ${error.message}`);
    }
  }

  async function hygienePreview() {
    try {
      setStatus('Loading hygiene preview', true);
      const metadata = await buildSTMemoryMetadata(lastChatMessage(), 'user');
      const response = await getJson(
        `/v1/memory/hygiene/preview?world_id=${encodeURIComponent(metadata.world_id)}`,
      );
      showDebug(response);
      setStatus(`${response.counts?.orphan_entities || 0} orphan entities`);
    } catch (error) {
      setStatus(`Hygiene failed: ${error.message}`);
    }
  }

  async function applyHygiene() {
    try {
      const metadata = await buildSTMemoryMetadata(lastChatMessage(), 'user');
      if (!window.confirm(`Apply hygiene cleanup for world "${metadata.world_id}"?`)) return;
      setStatus('Applying hygiene cleanup', true);
      const response = await postJson('/v1/memory/hygiene/apply', {
        world_id: metadata.world_id,
      });
      showDebug(response);
      setStatus(`${response.counts?.deleted_orphan_entities || 0} orphan entities deleted`);
    } catch (error) {
      setStatus(`Hygiene failed: ${error.message}`);
    }
  }

  async function runUISmokeTests() {
    const startedAt = new Date().toISOString();
    const steps = [];
    const suffix = Date.now();
    let ingested = false;
    let deleted = false;
    let ready = null;
    let proxyStatus = null;
    let smokeIds = {};

    try {
      setStatus('Running UI smoke', true);
      renderOperations([]);
      showDebug('');
      const baseMetadata = await buildSTMemoryMetadata(lastChatMessage(), 'user');
      const activeCharacter =
        baseMetadata.active_character || {
          character_id: 'char_ui_smoke',
          name: 'UI Smoke Character',
          fingerprint: 'ui_smoke',
        };
      const smokeWorldId = baseMetadata.world_id || 'ui-smoke-world';
      const smokeChatId = `${baseMetadata.chat_id || 'default-chat'}__ui_smoke_${suffix}`;
      const smokeMessageId = `ui-smoke-msg-${suffix}`;
      smokeIds = {
        world_id: smokeWorldId,
        chat_id: smokeChatId,
        message_id: smokeMessageId,
      };

      ready = await smokeStep(steps, 'readyz', async () => {
        const response = await getJson('/readyz');
        if (response.status !== 'ok') throw new Error(`readyz status is ${response.status}`);
        return { status: response.status, checks: response.checks };
      });

      proxyStatus = await smokeStep(steps, 'debug status', async () => {
        const response = await getJson('/v1/debug/status');
        if (!response.service) throw new Error('missing service field');
        return {
          service: response.service,
          version: response.version,
          chat_model: response.chat_model,
          embedding_model: response.embedding_model,
          extraction_model: response.extraction_model,
          llm_extraction_enabled: response.llm_extraction_enabled,
          rerank_enabled: response.rerank_enabled,
        };
      });

      await smokeStep(steps, 'models', async () => {
        const response = await getJson('/v1/models');
        const models = (response.data || []).map((item) => item.id).filter(Boolean);
        if (!models.length) throw new Error('model list is empty');
        return {
          count: models.length,
          has_chat_model: proxyStatus.chat_model ? models.includes(proxyStatus.chat_model) : null,
          has_extraction_model: proxyStatus.extraction_model
            ? models.includes(proxyStatus.extraction_model)
            : null,
          sample: models.slice(0, 8),
        };
      });

      await smokeStep(steps, 'embeddings', async () => {
        const response = await postJson('/v1/embeddings', {
          model: proxyStatus.embedding_model,
          input: 'LoreWeaver UI smoke embedding probe',
        });
        const dimensions = response.data?.[0]?.embedding?.length || 0;
        if (dimensions <= 0) throw new Error('embedding vector is empty');
        return { model: response.model, dimensions };
      });

      const event = {
        event_type: 'message_created',
        message_id: smokeMessageId,
        chat_id: smokeChatId,
        world_id: smokeWorldId,
        speaker: {
          type: 'user',
          id: baseMetadata.profile_id || baseMetadata.user_id || 'ui-smoke-user',
          name: baseMetadata.profile_id || baseMetadata.user_id || 'UI Smoke User',
        },
        visible_to: [baseMetadata.profile_id, activeCharacter.character_id].filter(Boolean),
        content:
          'Lyra is a ranger from Arkvale. She guards the north gate and secretly distrusts Baron Veyr.',
        active_character_context: activeCharacter,
        created_at: new Date().toISOString(),
      };

      const ingest = await smokeStep(steps, 'synthetic ingest', async () => {
        const response = await postJson('/v1/st/events/message', event);
        if ((response.records || 0) < 1) throw new Error('ingest created no records');
        return response;
      });
      ingested = true;

      const smokeMetadata = {
        ...baseMetadata,
        world_id: smokeWorldId,
        chat_id: smokeChatId,
        active_character: activeCharacter,
        message: {
          ...baseMetadata.message,
          message_id: `ui-smoke-retrieve-${suffix}`,
          speaker_type: 'user',
          speaker_id: baseMetadata.profile_id || baseMetadata.user_id || 'ui-smoke-user',
          is_deleted: false,
          is_edited: false,
        },
      };

      await smokeStep(steps, 'retrieve memory', async () => {
        const response = await postJson('/v1/memory/retrieve', {
          metadata: smokeMetadata,
          query: 'What does the current character know about Lyra and Baron Veyr?',
          recent_messages: [],
        });
        if (!String(response.memory_block || '').includes('Lyra')) {
          throw new Error('memory block does not mention Lyra');
        }
        return {
          records: response.records?.length || 0,
          degraded: response.degraded,
          memory_block_preview: String(response.memory_block || '').slice(0, 500),
        };
      });

      await smokeStep(steps, 'delete synthetic message', async () => {
        const response = await postJson('/v1/st/events/message-deleted', {
          message_id: smokeMessageId,
          chat_id: smokeChatId,
          world_id: smokeWorldId,
          speaker: { type: 'system', id: 'ui-smoke-system', name: 'UI Smoke System' },
          content: '',
        });
        deleted = true;
        return response;
      });

      await smokeStep(steps, 'debug after delete', async () => {
        const response = await getJson(
          `/v1/memory/debug/chat/${encodeURIComponent(smokeWorldId)}/${encodeURIComponent(smokeChatId)}?limit=20`,
        );
        const counts = response.counts || {};
        if ((counts.facts_active || 0) !== 0) {
          throw new Error(`expected 0 active facts, got ${counts.facts_active}`);
        }
        if ((counts.facts_deleted || 0) < (ingest.records || 1)) {
          throw new Error(`expected deleted facts >= ${ingest.records || 1}`);
        }
        return counts;
      });
    } catch (error) {
      if (ingested && !deleted && smokeIds.message_id) {
        await smokeCleanup(steps, smokeIds);
      }
      const failed = steps.filter((step) => step.status === 'fail').length || 1;
      showDebug({
        status: 'failed',
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        smoke_ids: smokeIds,
        failed,
        steps,
      });
      setStatus(`UI smoke failed: ${error.message}`);
      return;
    }

    showDebug({
      status: 'passed',
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      smoke_ids: smokeIds,
      passed: steps.length,
      steps,
      ready,
    });
    setStatus(`UI smoke passed (${steps.length})`);
  }

  async function smokeCleanup(steps, smokeIds) {
    try {
      const response = await postJson('/v1/st/events/message-deleted', {
        message_id: smokeIds.message_id,
        chat_id: smokeIds.chat_id,
        world_id: smokeIds.world_id,
        speaker: { type: 'system', id: 'ui-smoke-system', name: 'UI Smoke System' },
        content: '',
      });
      steps.push({ name: 'cleanup delete', status: 'pass', details: response });
    } catch (error) {
      steps.push({ name: 'cleanup delete', status: 'fail', error: error.message });
    }
  }

  async function smokeStep(steps, name, action) {
    try {
      const details = await action();
      steps.push({ name, status: 'pass', details });
      return details;
    } catch (error) {
      steps.push({ name, status: 'fail', error: error.message });
      throw error;
    }
  }

  async function runDebugAction(status, action) {
    try {
      setStatus(status, true);
      const response = await action();
      showDebug(response);
      setStatus('Debug response loaded');
    } catch (error) {
      setStatus(`Debug failed: ${error.message}`);
    }
  }

  function renderOperations(items) {
    const root = document.querySelector('#loreweaver-proxy-ops');
    if (!root) return;
    root.innerHTML = '';
    for (const item of items) {
      const node = document.createElement('div');
      node.className = 'lw-op';
      node.innerHTML = `
        <div class="lw-op-title"></div>
        <div class="lw-output-wrap lw-op-output-wrap">
          <button class="lw-copy-all" type="button" title="Copy all" aria-label="Copy operation output" data-action="copy-output">
            <span aria-hidden="true">⧉</span>
          </button>
          <div class="lw-op-body"></div>
        </div>
        <div class="lw-row">
          <button type="button" data-action="apply">Apply</button>
          <button type="button" data-action="reject">Reject</button>
        </div>
      `;
      node.querySelector('.lw-op-title').textContent =
        `${item.operation_type} (${Math.round((item.confidence || 0) * 100)}%)`;
      node.querySelector('.lw-op-body').textContent = JSON.stringify(item.payload || {}, null, 2);
      node.querySelector('[data-action="apply"]').addEventListener('click', () =>
        applyOperation(item.operation_id, 'apply'),
      );
      node.querySelector('[data-action="reject"]').addEventListener('click', () =>
        applyOperation(item.operation_id, 'reject'),
      );
      node.querySelector('[data-action="copy-output"]').addEventListener('click', () =>
        copyText(node.querySelector('.lw-op-body')?.textContent || '', 'Operation output copied'),
      );
      root.appendChild(node);
    }
  }

  function summarizePending(items) {
    const byType = {};
    const byStatus = {};
    for (const item of items) {
      byType[item.operation_type || 'unknown'] = (byType[item.operation_type || 'unknown'] || 0) + 1;
      byStatus[item.status || 'unknown'] = (byStatus[item.status || 'unknown'] || 0) + 1;
    }
    return {
      items: items.length,
      by_type: byType,
      by_status: byStatus,
      sample: items.slice(0, 5),
    };
  }

  function summarizeGraphStatements(items) {
    const byStatus = {};
    const byPredicate = {};
    const bySubject = {};
    for (const item of items) {
      const status = item?.validity?.status || 'unknown';
      const predicate = item?.predicate || 'unknown';
      const subject = item?.subject_id || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
      byPredicate[predicate] = (byPredicate[predicate] || 0) + 1;
      bySubject[subject] = (bySubject[subject] || 0) + 1;
    }
    return {
      total: items.length,
      by_status: byStatus,
      by_predicate: byPredicate,
      by_subject: bySubject,
      active_sample: items
        .filter((item) => item?.validity?.status === 'active')
        .slice(0, 8)
        .map((item) => ({
          subject_id: item.subject_id,
          predicate: item.predicate,
          object_id: item.object_id,
          object_literal: item.object_literal,
          qualifiers: item.qualifiers,
          weight: item.weight,
          text: item.text,
        })),
    };
  }

  async function applyOperation(operationId, action) {
    const response = await postJson(`/v1/lore/${action}`, { operation_id: operationId });
    showDebug(response);
    await refreshPending();
  }

  async function buildChatSyncRequest() {
    const context = getContext() || {};
    const metadata = await buildSTMemoryMetadata(lastChatMessage(), 'user');
    const messages = [];
    const activeCharacter = metadata.active_character;
    const groupMembers = metadata.group?.members || [];
    const visibleTo = [
      metadata.profile_id,
      activeCharacter?.character_id,
      ...groupMembers.map((member) => member.character_id),
    ].filter(Boolean);
    const chat = currentChatMessages();

    for (let index = 0; index < chat.length; index += 1) {
      const message = chat[index];
      const content = extractMessageContent(message).trim();
      if (!content) continue;
      const isUser = Boolean(message?.is_user || message?.role === 'user');
      const resolvedSpeaker = isUser
        ? null
        : resolveMetadataMember(metadata, speakerName(message)) || activeCharacter;
      const speakerId = isUser
        ? metadata.profile_id || metadata.user_id || 'profile_001'
        : resolvedSpeaker?.character_id || message?.name || 'character';
      messages.push({
        event_type: 'message_created',
        message_id: stableMessageId(message, index, metadata.chat_id),
        chat_id: metadata.chat_id,
        world_id: metadata.world_id,
        speaker: {
          type: isUser ? 'user' : 'character',
          id: speakerId,
          name: speakerName(message) || (isUser ? context.name1 : resolvedSpeaker?.name),
        },
        visible_to: visibleTo,
        content,
        active_character_context: isUser ? activeCharacter : resolvedSpeaker,
        group_context: metadata.group,
        created_at: message?.send_date || message?.created_at || new Date().toISOString(),
      });
    }

    return {
      chat_id: metadata.chat_id,
      world_id: metadata.world_id,
      active_character_context: activeCharacter,
      group: metadata.group,
      messages,
    };
  }

  function summarizeChatSyncRequest(request) {
    return {
      chat_id: request.chat_id,
      world_id: request.world_id,
      messages: request.messages.length,
      first_message_id: request.messages[0]?.message_id || null,
      last_message_id: lastOf(request.messages)?.message_id || null,
    };
  }

  function currentCharacter(context) {
    if (context.character) return context.character;
    const id = context.characterId ?? context.character_id;
    if (Array.isArray(context.characters) && id !== undefined) return context.characters[id];
    return null;
  }

  async function buildGroupContext(context) {
    const groupId = context.groupId || context.group_id || context.selected_group || null;
    const members = [];
    if (!groupId) return { group_id: null, members };
    const addMember = async (card, ref = null) => {
      if (!card) return;
      const characterId = await characterIdFromCard(card);
      if (members.some((member) => member.character_id === characterId)) return;
      members.push({
        character_id: characterId,
        name: card.name || String(ref),
        fingerprint: characterId.split('_').pop(),
        aliases: characterAliases(card, context, ref),
      });
    };

    const group = currentGroup(context, groupId);
    const memberRefs = Array.isArray(group?.members) ? group.members : [];
    for (const ref of memberRefs) {
      await addMember(characterFromMemberRef(context, ref), ref);
    }
    for (const message of currentChatMessages()) {
      if (isUserMessage(message)) continue;
      await addMember(characterFromMemberRef(context, speakerName(message)));
    }
    const active = currentCharacter(context);
    if (active) {
      await addMember(active);
    }
    return { group_id: String(groupId), members };
  }

  function currentGroup(context, groupId) {
    if (context.group && String(context.group.id || context.group._id || context.group.group_id || context.group.name) === String(groupId)) {
      return context.group;
    }
    const groups = context.groups || window.groups;
    if (Array.isArray(groups)) {
      return groups.find((group) => String(group.id || group._id || group.group_id || group.name) === String(groupId)) || null;
    }
    if (groups && typeof groups === 'object') {
      return groups[groupId] || Object.values(groups).find((group) => String(group?.id || group?._id || group?.group_id || group?.name) === String(groupId)) || null;
    }
    return null;
  }

  function characterFromMemberRef(context, ref) {
    if (ref && typeof ref === 'object' && ref.name) return ref;
    const characters = Array.isArray(context.characters)
      ? context.characters
      : Array.isArray(window.characters)
        ? window.characters
        : [];
    if (typeof ref === 'number') return characters[ref] || null;
    const refKey = String(ref || '').trim();
    if (!refKey) return null;
    return (
      characters.find((card) =>
        [card?.avatar, card?.name, card?.id, card?.filename, card?.file_name]
          .filter(Boolean)
          .some((value) => String(value) === refKey),
      ) || null
    );
  }

  function characterAliases(card, context, ref = null) {
    const aliases = new Set();
    const add = (value) => {
      const text = String(value || '').trim();
      if (text && text !== card.name) aliases.add(text);
    };
    add(card.name);
    add(card.data?.name);
    add(card.description?.match?.(/(?:aka|also known as|известн[а-я]+ как|называют)\s+([^.\n]+)/iu)?.[1]);
    if (ref && typeof ref === 'object') {
      add(ref.name);
      add(ref.display_name);
      add(ref.avatar);
    }
    for (const message of currentChatMessages()) {
      const name = speakerName(message);
      if (!name) continue;
      if (name === card.name) continue;
      if (String(name).toLowerCase() === String(card.name || '').toLowerCase()) add(name);
      if (card.avatar && message?.avatar && String(card.avatar) === String(message.avatar)) add(name);
      if (card.avatar && message?.original_avatar && String(card.avatar) === String(message.original_avatar)) add(name);
    }
    return Array.from(aliases).slice(0, 8);
  }

  function resolveMetadataMember(metadata, name) {
    const key = normalizeName(name);
    if (!key) return null;
    return (metadata.group?.members || []).find((member) =>
      [member.name, member.character_id, ...(member.aliases || [])]
        .map(normalizeName)
        .includes(key),
    ) || null;
  }

  function normalizeName(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function currentChatMessages() {
    const context = getContext() || {};
    if (Array.isArray(context.chat)) return context.chat;
    if (Array.isArray(context.chatHistory)) return context.chatHistory;
    if (Array.isArray(window.chat)) return window.chat;
    return [];
  }

  function lastChatMessage() {
    const messages = currentChatMessages().filter((message) => extractMessageContent(message).trim());
    return lastOf(messages) || null;
  }

  function lastUserMessageContent() {
    const messages = currentChatMessages();
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (isUserMessage(messages[index])) {
        const content = extractMessageContent(messages[index]).trim();
        if (content) return content;
      }
    }
    return extractMessageContent(lastChatMessage()).trim();
  }

  function resolveEventMessage(message, fallbackSpeakerType = 'user') {
    const directContent = extractMessageContent(message).trim();
    if (directContent) return message;

    const chat = currentChatMessages();
    if (Number.isInteger(message) && chat[message]) return chat[message];
    if (typeof message === 'string' && /^\d+$/.test(message) && chat[Number(message)]) {
      return chat[Number(message)];
    }

    const expectedUser = fallbackSpeakerType === 'user';
    for (let index = chat.length - 1; index >= 0; index -= 1) {
      const candidate = chat[index];
      const content = extractMessageContent(candidate).trim();
      if (!content) continue;
      if (fallbackSpeakerType === 'system') return candidate;
      if (isUserMessage(candidate) === expectedUser) return candidate;
    }
    return message || {};
  }

  function extractMessageContent(message) {
    if (typeof message === 'string') return message;
    return String(message?.mes || message?.content || message?.message || message?.text || '');
  }

  function isUserMessage(message) {
    const context = getContext() || {};
    if (message?.is_user !== undefined) return Boolean(message.is_user);
    if (message?.role) return message.role === 'user';
    if (message?.name && context.name1) return message.name === context.name1;
    return false;
  }

  function speakerName(message) {
    return message?.name || message?.speaker || message?.sender || null;
  }

  function stableMessageId(message, index, chatId) {
    const existing =
      message?.extra?.loreweaver_message_id ||
      message?.message_id ||
      message?.id ||
      message?.send_date ||
      message?.created_at;
    if (existing) return sanitizeMessageId(existing);
    if (Number.isInteger(index) && index >= 0) return sanitizeMessageId(`${chatId}_${index}`);
    const content = extractMessageContent(message).trim();
    if (content) return sanitizeMessageId(`${chatId}_${simpleHash(content).slice(0, 16)}`);
    return sanitizeMessageId(`${chatId}_unknown`);
  }

  function chatMessageIndex(message) {
    const chat = currentChatMessages();
    if (Number.isInteger(message)) return message;
    if (typeof message === 'string' && /^\d+$/.test(message)) return Number(message);

    const directIndex = chat.indexOf(message);
    if (directIndex >= 0) return directIndex;

    const existingId = message?.message_id || message?.id || message?.send_date || message?.created_at;
    if (existingId) {
      const found = chat.findIndex(
        (candidate) =>
          String(candidate?.message_id || candidate?.id || candidate?.send_date || candidate?.created_at || '') ===
          String(existingId),
      );
      if (found >= 0) return found;
    }

    const content = extractMessageContent(message).trim();
    if (content) {
      for (let index = chat.length - 1; index >= 0; index -= 1) {
        if (extractMessageContent(chat[index]).trim() === content) return index;
      }
    }
    return -1;
  }

  function sanitizeMessageId(value) {
    return String(value).replace(/[^\p{L}\p{N}_:-]+/gu, '_');
  }

  function showDebug(value) {
    const output = document.querySelector('#loreweaver-proxy-debug-output');
    if (!output) return;
    output.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }

  function clearDebug() {
    const output = document.querySelector('#loreweaver-proxy-debug-output');
    const ops = document.querySelector('#loreweaver-proxy-ops');
    if (output) output.textContent = '';
    if (ops) ops.innerHTML = '';
    setStatus('Debug cleared');
  }

  async function copyText(text, successStatus = 'Copied') {
    if (!text) {
      setStatus('Nothing to copy');
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopyText(text);
      }
      setStatus(successStatus);
    } catch (error) {
      try {
        fallbackCopyText(text);
        setStatus(successStatus);
      } catch {
        setStatus(`Copy failed: ${error.message}`);
      }
    }
  }

  function fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  function lastOf(items) {
    return items.length ? items[items.length - 1] : null;
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function characterIdFromCard(card) {
    const fields = [
      card.name,
      card.description,
      card.personality,
      card.scenario,
      card.first_mes,
      card.mes_example,
    ]
      .filter(Boolean)
      .join('\n')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const hash = await sha256(fields);
    const slug = String(card.name || 'character')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '');
    return `char_${slug || 'character'}_${hash.slice(0, 16)}`;
  }

  async function sha256(text) {
    if (!crypto?.subtle) return simpleHash(text);
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  function simpleHash(text) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  async function getJson(path) {
    const response = await fetch(`${state.settings.proxyUrl}${path}`, { credentials: 'include' });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  async function postJson(path, body) {
    const response = await fetch(`${state.settings.proxyUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  function init() {
    loadSettings();
    mountPanel();
    bindEvents();
    window.LoreWeaverProxy = {
      version: EXTENSION_VERSION,
      features: FEATURES,
      buildSTMemoryMetadata,
      rebuildCurrentChat,
      retrieveMemoryPreview,
      promptPreview,
      debugCurrentChat,
      graphDebugCurrentChat,
      mergeEntity,
      hygienePreview,
      applyHygiene,
      runUISmokeTests,
      refreshPending,
      checkHealth,
      rerender: () => mountPanel({ force: true }),
      clearDebug,
      settings: state.settings,
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
