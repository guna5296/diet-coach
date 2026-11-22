/**
 * My Diet Coach - バックアップ・復元・初期化・ポリシーモジュール（v1.6.2）
 */
const BackupModule = (() => {
  'use strict';

  const BACKUP_APP_ID = 'my-diet-coach';
  const SCHEMA_VERSION = 1;
  const REMIND_INTERVAL_DAYS = 14;
  const SNOOZE_DAYS = 3;

  let callbacks = {
    showToast: () => {},
    onDataRestored: async () => {}
  };

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDateTimeJp(isoStr) {
    if (!isoStr) return 'まだありません';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return '不明';
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${day} ${hh}:${mm}`;
  }

  function buildBackupFilename() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `my-diet-coach-backup-${y}${m}${day}-${hh}${mm}.json`;
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  }

  async function requestPersistence() {
    if (!navigator.storage || typeof navigator.storage.persist !== 'function') {
      return { supported: false, persisted: false };
    }
    try {
      let persisted = await navigator.storage.persisted();
      if (!persisted) {
        persisted = await navigator.storage.persist();
      }
      return { supported: true, persisted };
    } catch (_) {
      return { supported: true, persisted: false };
    }
  }

  async function createBackupPayload() {
    const stores = await DietDB.exportAllStores();
    const cleanedAppState = (stores.app_state || []).filter(
      (item) => item && item.key !== 'onboarding_draft'
    );

    const cleanData = {
      app_state: cleanedAppState,
      weight_logs: stores.weight_logs || [],
      meal_logs: stores.meal_logs || [],
      daily_logs: stores.daily_logs || [],
      food_master: stores.food_master || [],
      meal_templates: stores.meal_templates || [],
      ai_history: stores.ai_history || []
    };

    const hasProfile = cleanedAppState.some((s) => s.key === 'user_profile' && s.value);

    return {
      app: BACKUP_APP_ID,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      summary: {
        hasProfile,
        weightLogs: cleanData.weight_logs.length,
        mealLogs: cleanData.meal_logs.length,
        dailyLogs: cleanData.daily_logs.length,
        foodMaster: cleanData.food_master.length,
        mealTemplates: cleanData.meal_templates.length,
        aiHistory: cleanData.ai_history.length
      },
      data: cleanData
    };
  }

  function parseAndValidateBackup(rawText) {
    let parsed;
    try {
      parsed = JSON.parse(String(rawText || '').trim());
    } catch (_) {
      return { ok: false, error: 'JSONの形式が正しくありません。途中で切れていないか確認してください。' };
    }

    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'バックアップデータの形式が不正です。' };
    }

    if (parsed.app !== BACKUP_APP_ID) {
      return { ok: false, error: 'My Diet Coach のバックアップファイルではありません。' };
    }

    if (!parsed.data || typeof parsed.data !== 'object') {
      return { ok: false, error: 'データ本体が見つかりません。' };
    }

    const keyByStore = {
      app_state: 'key',
      weight_logs: 'id',
      meal_logs: 'id',
      daily_logs: 'date',
      food_master: 'id',
      meal_templates: 'id',
      ai_history: 'id'
    };

    for (const storeName of DietDB.ALL_STORES) {
      const arr = parsed.data[storeName];
      if (arr !== undefined && !Array.isArray(arr)) {
        return { ok: false, error: `データ項目（${storeName}）が破損しています。` };
      }
      const pk = keyByStore[storeName];
      if (Array.isArray(arr)) {
        const invalid = arr.some((item) => !item || typeof item !== 'object' || !item[pk]);
        if (invalid) {
          return { ok: false, error: `データ項目（${storeName}）に不正なレコードが含まれています。` };
        }
      }
    }

    const appState = Array.isArray(parsed.data.app_state) ? parsed.data.app_state : [];
    const profileRec = appState.find((s) => s.key === 'user_profile');

    const counts = {
      hasProfile: Boolean(profileRec && profileRec.value),
      weightLogs: (parsed.data.weight_logs || []).length,
      mealLogs: (parsed.data.meal_logs || []).length,
      dailyLogs: (parsed.data.daily_logs || []).length,
      foodMaster: (parsed.data.food_master || []).length,
      mealTemplates: (parsed.data.meal_templates || []).length,
      aiHistory: (parsed.data.ai_history || []).length
    };

    return {
      ok: true,
      payload: parsed,
      counts,
      exportedAt: parsed.exportedAt || null
    };
  }

  async function updateBackupIndicators() {
    const [lastBackupAt, snoozeUntil, counts] = await Promise.all([
      DietDB.getState('last_backup_at'),
      DietDB.getState('backup_snooze_until'),
      DietDB.getStorageCounts()
    ]);

    const lastEl = document.getElementById('settings-last-backup');
    if (lastEl) lastEl.textContent = formatDateTimeJp(lastBackupAt);

    const countEl = document.getElementById('settings-data-counts');
    if (countEl) {
      countEl.textContent = `体重・体脂肪 ${counts.weightLogs}件 / 食事 ${counts.mealLogs}件 / 体調 ${counts.dailyLogs}件`;
    }

    const bannerEl = document.getElementById('home-backup-banner');
    if (!bannerEl) return;

    const totalRecords = counts.weightLogs + counts.mealLogs + counts.dailyLogs;
    if (totalRecords < 3) {
      bannerEl.classList.add('hidden');
      return;
    }

    const nowMs = Date.now();
    if (snoozeUntil && nowMs < new Date(snoozeUntil).getTime()) {
      bannerEl.classList.add('hidden');
      return;
    }

    let needRemind = false;
    let message = '';

    if (!lastBackupAt) {
      needRemind = true;
      message = '記録が増えてきました。iPhoneのデータ消失を防ぐため、JSONバックアップを1度保存しておくと安心です。';
    } else {
      const diffDays = Math.floor((nowMs - new Date(lastBackupAt).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= REMIND_INTERVAL_DAYS) {
        needRemind = true;
        message = `前回のバックアップから ${diffDays}日 経ちました。大切な記録を守るため、定期バックアップをおすすめします。`;
      }
    }

    if (!needRemind) {
      bannerEl.classList.add('hidden');
      return;
    }

    bannerEl.innerHTML = `
      <div class="backup-banner-text">${escapeHtml(message)}</div>
      <div class="backup-banner-actions">
        <button type="button" id="btn-banner-backup-now" class="btn-mini-primary">バックアップ画面へ</button>
        <button type="button" id="btn-banner-backup-later" class="text-btn muted">あとで</button>
      </div>
    `;
    bannerEl.classList.remove('hidden');

    document.getElementById('btn-banner-backup-now').addEventListener('click', () => {
      openBackupModal();
    });

    document.getElementById('btn-banner-backup-later').addEventListener('click', async () => {
      const until = new Date(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000).toISOString();
      await DietDB.setState('backup_snooze_until', until);
      bannerEl.classList.add('hidden');
      callbacks.showToast('3日間リマインドを非表示にしました');
    });
  }

  async function openBackupModal() {
    const [counts, lastBackupAt] = await Promise.all([
      DietDB.getStorageCounts(),
      DietDB.getState('last_backup_at')
    ]);

    let pendingRestore = null;

    RecordModule.openSheet('JSONバックアップ出力 / 復元', `
      <div class="alert-box warning">
        <strong>データ保護について：</strong>このアプリのデータはiPhone内のみに保存されます。OS更新や長期間の未使用・ブラウザ履歴消去などで消える可能性に備え、定期的なバックアップをおすすめします。
      </div>

      <div class="backup-section">
        <div class="backup-section-title">1. 全データをバックアップ出力</div>
        <p class="sheet-note" style="margin-bottom:8px;">
          最終バックアップ：<strong>${escapeHtml(formatDateTimeJp(lastBackupAt))}</strong><br>
          対象：プロフィール・目標・カウンセリング・体重/体脂肪(${counts.weightLogs}件)・食事(${counts.mealLogs}件)・体調(${counts.dailyLogs}件)・独自食材(${counts.foodMaster}件)・定番(${counts.mealTemplates}件)・AI履歴(${counts.aiHistory}件)<br>
          ※食事写真は保存していないため含まれません。
        </p>

        <div class="backup-btn-stack">
          <button type="button" id="btn-bk-export-file" class="btn-primary">
            JSONファイルを保存・共有する（推奨）
          </button>
          <button type="button" id="btn-bk-copy-json" class="btn-secondary full-width">
            バックアップ用JSONテキストをコピー（メモ帳保存用）
          </button>
        </div>
      </div>

      <div class="divider-line"></div>

      <div class="backup-section">
        <div class="backup-section-title">2. バックアップから復元（上書き）</div>
        <p class="sheet-note">
          保存したJSONファイルを選ぶか、コピーしたJSONテキストを貼り付けて内容を確認してください。確認後に上書き復元します。
        </p>

        <label class="btn-outline full-width backup-file-label">
          📂 JSONファイルを選択して読み込む
          <input type="file" id="inp-bk-file" accept=".json,application/json,text/plain" class="hidden">
        </label>

        <details class="prompt-preview-details" style="margin-top:10px;">
          <summary>コピーしたJSONテキストから復元する</summary>
          <div style="margin-top:8px;">
            <textarea id="inp-bk-paste" class="form-textarea" rows="4" placeholder="コピーしておいたバックアップJSONテキストを貼り付けてください"></textarea>
            <button type="button" id="btn-bk-load-paste" class="btn-secondary full-width" style="margin-top:8px;">
              貼り付けた内容を読み込んで確認
            </button>
          </div>
        </details>

        <div id="bk-restore-preview" class="restore-preview-box hidden"></div>
      </div>
    `);

    async function markBackupSuccess(msg) {
      await DietDB.setState('last_backup_at', new Date().toISOString());
      await DietDB.deleteState('backup_snooze_until');
      await updateBackupIndicators();
      callbacks.showToast(msg);
    }

    document.getElementById('btn-bk-export-file').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        const payload = await createBackupPayload();
        const jsonStr = JSON.stringify(payload, null, 2);
        const filename = buildBackupFilename();
        const blob = new Blob([jsonStr], { type: 'application/json' });

        if (navigator.share && typeof File !== 'undefined') {
          const file = new File([blob], filename, { type: 'application/json' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: 'My Diet Coach バックアップ',
                text: 'My Diet Coach のバックアップデータ（JSON）です。',
                files: [file]
              });
              await markBackupSuccess('バックアップファイルを出力しました');
              return;
            } catch (shareErr) {
              if (shareErr && shareErr.name === 'AbortError') {
                callbacks.showToast('共有をキャンセルしました');
                return;
              }
            }
          }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        await markBackupSuccess('JSONバックアップをダウンロードしました');
      } catch (err) {
        console.error('バックアップ出力エラー:', err);
        callbacks.showToast('バックアップ出力に失敗しました');
      }
    });

    document.getElementById('btn-bk-copy-json').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const payload = await createBackupPayload();
        const jsonStr = JSON.stringify(payload);
        const ok = await copyToClipboard(jsonStr);
        if (ok) {
          await markBackupSuccess('JSONテキストをコピーしました！メモアプリ等に貼り付けて保存してください');
        } else {
          callbacks.showToast('コピーに失敗しました');
        }
      } catch (err) {
        console.error('JSONコピーエラー:', err);
        callbacks.showToast('バックアップ作成に失敗しました');
      }
    });

    function showRestoreConfirmation(rawText) {
      const previewEl = document.getElementById('bk-restore-preview');
      const result = parseAndValidateBackup(rawText);

      if (!result.ok) {
        pendingRestore = null;
        previewEl.innerHTML = `<div class="alert-box warning" style="margin:0;">${escapeHtml(result.error)}</div>`;
        previewEl.classList.remove('hidden');
        callbacks.showToast('読み込みに失敗しました');
        return;
      }

      pendingRestore = result.payload;
      const c = result.counts;

      previewEl.innerHTML = `
        <div class="restore-title">復元内容の最終確認</div>
        <p class="sheet-note" style="margin-bottom:8px;">
          バックアップ作成日時：<strong>${escapeHtml(formatDateTimeJp(result.exportedAt))}</strong>
        </p>

        <table class="weekly-table" style="margin-bottom:10px;">
          <thead>
            <tr>
              <th>データ項目</th>
              <th>現在（消去）</th>
              <th>復元後</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>プロフィール・計画</td><td>${counts.hasProfile ? 'あり' : 'なし'}</td><td><strong>${c.hasProfile ? 'あり' : 'なし'}</strong></td></tr>
            <tr><td>体重・体脂肪ログ</td><td>${counts.weightLogs}件</td><td><strong>${c.weightLogs}件</strong></td></tr>
            <tr><td>食事ログ</td><td>${counts.mealLogs}件</td><td><strong>${c.mealLogs}件</strong></td></tr>
            <tr><td>行動・体調メモ</td><td>${counts.dailyLogs}件</td><td><strong>${c.dailyLogs}件</strong></td></tr>
            <tr><td>独自食材 / 定番</td><td>${counts.foodMaster} / ${counts.mealTemplates}件</td><td><strong>${c.foodMaster} / ${c.mealTemplates}件</strong></td></tr>
            <tr><td>AI相談・改善策履歴</td><td>${counts.aiHistory}件</td><td><strong>${c.aiHistory}件</strong></td></tr>
          </tbody>
        </table>

        <div class="alert-box warning" style="margin-bottom:10px;">
          <strong>注意：</strong>復元を実行すると、現在このiPhone内に保存されているデータは<strong>すべて上書き</strong>されます（元に戻せません）。
        </div>

        <label class="checkbox-row" style="margin-top:0; margin-bottom:12px;">
          <input type="checkbox" id="chk-confirm-overwrite">
          <span>既存データが上書きされることを確認しました</span>
        </label>

        <button type="button" id="btn-bk-exec-restore" class="btn-danger full-width" disabled>
          この内容で上書き復元を実行する
        </button>
      `;

      previewEl.classList.remove('hidden');
      previewEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      const chk = document.getElementById('chk-confirm-overwrite');
      const execBtn = document.getElementById('btn-bk-exec-restore');

      chk.addEventListener('change', () => {
        execBtn.disabled = !chk.checked;
      });

      execBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!pendingRestore || !chk.checked) return;

        try {
          await DietDB.replaceAllStores(pendingRestore.data);
          await DietDB.setState('last_backup_at', pendingRestore.exportedAt || new Date().toISOString());
          RecordModule.closeSheet();
          callbacks.showToast('バックアップから全データを復元しました');
          await callbacks.onDataRestored();
        } catch (err) {
          console.error('復元実行エラー:', err);
          callbacks.showToast('復元に失敗しました。既存データは保護されています');
        }
      });
    }

    const fileInput = document.getElementById('inp-bk-file');
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => showRestoreConfirmation(String(reader.result || ''));
      reader.onerror = () => callbacks.showToast('ファイルの読み込みに失敗しました');
      reader.readAsText(file, 'utf-8');
    });

    document.getElementById('btn-bk-load-paste').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const text = document.getElementById('inp-bk-paste').value.trim();
      if (!text) {
        callbacks.showToast('JSONテキストを貼り付けてください');
        return;
      }
      showRestoreConfirmation(text);
    });
  }

  /**
   * 引き渡し前リセット・全データ完全削除モーダル（二重ロック）
   */
  async function openResetModal() {
    const counts = await DietDB.getStorageCounts();

    RecordModule.openSheet('全データを初期化（削除）', `
      <div class="alert-box warning">
        <strong>注意：</strong>この操作を実行すると、このiPhone内に保存されている<strong>すべてのデータ（プロフィール・体重・食事・体調・独自食材・定番・AI履歴）が完全に削除</strong>され、最初の「ようこそ」画面に戻ります。
      </div>

      <div class="info-list" style="margin-bottom: 14px; background: var(--bg-page); padding: 12px; border-radius: 12px;">
        <div class="info-row"><span>プロフィール・カウンセリング</span><strong>${counts.hasProfile ? '登録あり（削除）' : 'なし'}</strong></div>
        <div class="info-row"><span>体重・体脂肪ログ</span><strong>${counts.weightLogs}件</strong></div>
        <div class="info-row"><span>食事ログ</span><strong>${counts.mealLogs}件</strong></div>
        <div class="info-row"><span>行動・体調メモ</span><strong>${counts.dailyLogs}件</strong></div>
        <div class="info-row"><span>独自食材 / 食事テンプレート</span><strong>${counts.foodMaster} / ${counts.mealTemplates}件</strong></div>
        <div class="info-row"><span>AI相談・改善策履歴</span><strong>${counts.aiHistory}件</strong></div>
      </div>

      <p class="sheet-note">
        ※削除したデータは元に戻せません。必要なデータがある場合は、先に「JSONバックアップ出力」で保存してください。
      </p>

      <label class="checkbox-row" style="margin-bottom: 14px;">
        <input type="checkbox" id="chk-confirm-reset">
        <span>すべてのデータを削除して初期状態に戻すことを確認しました</span>
      </label>

      <button type="button" id="btn-exec-reset" class="btn-danger full-width" disabled>
        全データを完全に削除して初期化する
      </button>
    `);

    const chk = document.getElementById('chk-confirm-reset');
    const execBtn = document.getElementById('btn-exec-reset');

    chk.addEventListener('change', () => {
      execBtn.disabled = !chk.checked;
    });

    execBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!chk.checked) return;

      if (!confirm('本当にすべてのデータを削除しますか？この操作は元に戻せません。')) {
        return;
      }

      try {
        await DietDB.clearAllStores();
        RecordModule.closeSheet();
        callbacks.showToast('全データを削除し、初期状態に戻しました');
        await callbacks.onDataRestored();
      } catch (err) {
        console.error('全データ初期化エラー:', err);
        callbacks.showToast('初期化に失敗しました');
      }
    });
  }

  function openPolicyModal() {
    RecordModule.openSheet('AI連携・プライバシーポリシー', `
      <div class="policy-block">
        <h3>1. アプリ内データの保存先</h3>
        <p>プロフィール・健康状態・体重・食事・体調・AI相談履歴などの記録データは、すべて<strong>このiPhone内のブラウザ領域（IndexedDB）のみ</strong>に保存されます。開発者のサーバーや第三者へ自動送信されることはありません。</p>
      </div>

      <div class="policy-block">
        <h3>2. 食事写真の扱い</h3>
        <p>食事写真そのものはアプリ内に保存しません。一時プレビュー表示した場合も、登録確定時または画面を閉じた時点でアプリ内の一時データを即座に破棄します。保存されるのは料理名・食材・栄養データ（AI推定値と本人確定値）のみです。</p>
      </div>

      <div class="policy-block">
        <h3>3. 外部AIサービス（ChatGPT）へのデータ送信</h3>
        <p>本アプリは無料枠運用のため、自動で外部通信を行いません。本人が「プロンプトをコピー」してChatGPTへ貼り付けて送信した場合に限り、抽出したテキスト（または添付した写真）がOpenAI社のサービスへ送信されます。AI学習への利用設定やデータ保存ポリシーについては、ご利用中のChatGPTアプリ側の設定（データコントロール等）をご確認ください。</p>
      </div>

      <div class="policy-block">
        <h3>4. 医療上の免責事項</h3>
        <p>本アプリおよびAIが提示するカロリー目標やアドバイスは一般的な健康管理・減量支援を目的とした推定値であり、医師による診断・治療・医学的指導に代わるものではありません。妊娠・授乳中、持病・服薬、医師の制限がある場合は必ず主治医の指示を優先してください。</p>
      </div>
    `);
  }

  function init(opts) {
    callbacks = { ...callbacks, ...opts };
  }

  return {
    init,
    requestPersistence,
    updateBackupIndicators,
    openBackupModal,
    openResetModal,
    openPolicyModal
  };
})();
