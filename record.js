/**
 * My Diet Coach - フェーズ3：記録機能モジュール（v1.3.1 修正版）
 * - 朝晩の体重・体脂肪（別レコード管理・日時修正・編集削除）
 * - 食事登録（B:食材グラム / C:栄養成分表示 / D:履歴・テンプレート）
 * - 行動・体調メモ（任意）
 * - 独自食材・テンプレート管理
 * - iPhoneでのタップ貫通防止＆保存後に記録画面トップ位置へ戻る制御
 */
const RecordModule = (() => {
  'use strict';

  const MEAL_TYPES = [
    { key: 'breakfast', label: '朝食' },
    { key: 'lunch', label: '昼食' },
    { key: 'dinner', label: '夕食' },
    { key: 'snack', label: '間食' }
  ];

  const MEAL_LABEL_MAP = {
    breakfast: '朝食',
    lunch: '昼食',
    dinner: '夕食',
    snack: '間食'
  };

  let callbacks = {
    onDataChanged: async () => {},
    showToast: () => {}
  };

  let selectedDate = getLocalDateStr(new Date());
  let activeMealCategory = 'breakfast';
  let navLockTimer = null;

  // モーダル参照
  const sheetBackdrop = document.getElementById('sheet-backdrop');
  const sheetTitle = document.getElementById('sheet-title');
  const sheetBody = document.getElementById('sheet-body');
  const sheetCloseBtn = document.getElementById('sheet-close');

  function getLocalDateStr(dateObj = new Date()) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getLocalDateTimeStr(dateStr, defaultHour = null) {
    const now = new Date();
    const todayStr = getLocalDateStr(now);
    let hh = String(now.getHours()).padStart(2, '0');
    let mm = String(now.getMinutes()).padStart(2, '0');
    if (dateStr !== todayStr && defaultHour !== null) {
      hh = String(defaultHour).padStart(2, '0');
      mm = '00';
    }
    return `${dateStr}T${hh}:${mm}`;
  }

  function shiftDate(dateStr, diffDays) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d + diffDays);
    return getLocalDateStr(dt);
  }

  function formatDisplayDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const todayStr = getLocalDateStr(new Date());
    const prefix = dateStr === todayStr ? '今日 ' : '';
    return `${prefix}${m}月${d}日（${weekdays[dt.getDay()]}）`;
  }

  function formatTimeOnly(isoOrLocal) {
    if (!isoOrLocal) return '--:--';
    const match = String(isoOrLocal).match(/T(\d{2}:\d{2})/);
    if (match) return match[1];
    const d = new Date(isoOrLocal);
    if (Number.isNaN(d.getTime())) return '--:--';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function openSheet(title, htmlContent) {
    if (navLockTimer) {
      clearTimeout(navLockTimer);
      navLockTimer = null;
    }
    sheetTitle.textContent = title;
    sheetBody.innerHTML = htmlContent;
    sheetBackdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('sheet-open');
    document.body.classList.remove('nav-lock');
  }

  function closeSheet() {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    sheetBackdrop.classList.add('hidden');
    sheetBody.innerHTML = '';
    document.body.style.overflow = '';
    document.body.classList.remove('sheet-open');
    document.body.classList.add('nav-lock');

    if (navLockTimer) clearTimeout(navLockTimer);
    navLockTimer = setTimeout(() => {
      document.body.classList.remove('nav-lock');
      navLockTimer = null;
    }, 350);
  }

  function scrollToRecordTop() {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 80);
  }

  function setSelectedDate(dateStr) {
    selectedDate = dateStr;
    renderRecordView();
  }

  function setActiveMealCategory(cat) {
    if (MEAL_LABEL_MAP[cat]) activeMealCategory = cat;
  }

  /* =========================================================
     記録画面メインの描画
     ========================================================= */
  async function renderRecordView() {
    const dateLabel = document.getElementById('record-date-label');
    if (dateLabel) dateLabel.textContent = formatDisplayDate(selectedDate);

    const [weights, meals, daily] = await Promise.all([
      DietDB.getByDate('weight_logs', selectedDate),
      DietDB.getByDate('meal_logs', selectedDate),
      DietDB.getItem('daily_logs', selectedDate)
    ]);

    renderWeightSection(weights);
    renderMealSection(meals);
    renderDailySection(daily);
  }

  /* ---- 1. 体重・体脂肪セクション ---- */
  function renderWeightSection(logs) {
    const sorted = [...logs].sort((a, b) => String(a.measuredAt).localeCompare(String(b.measuredAt)));

    const latestBy = (timing, type) => {
      const filtered = sorted.filter((l) => l.timing === timing && l.type === type);
      return filtered.length ? filtered[filtered.length - 1] : null;
    };

    const mWeight = latestBy('morning', 'weight');
    const mFat = latestBy('morning', 'bodyFat');
    const nWeight = latestBy('night', 'weight');
    const nFat = latestBy('night', 'bodyFat');

    const mValEl = document.getElementById('rec-morning-summary');
    const nValEl = document.getElementById('rec-night-summary');
    if (mValEl) {
      mValEl.textContent = `${mWeight ? mWeight.value.toFixed(1) + 'kg' : '--kg'} / ${mFat ? mFat.value.toFixed(1) + '%' : '--%'}`;
    }
    if (nValEl) {
      nValEl.textContent = `${nWeight ? nWeight.value.toFixed(1) + 'kg' : '--kg'} / ${nFat ? nFat.value.toFixed(1) + '%' : '--%'}`;
    }

    const listEl = document.getElementById('rec-weight-list');
    if (!listEl) return;

    if (!sorted.length) {
      listEl.innerHTML = `<p class="empty-note">この日の体重・体脂肪はまだ記録されていません。</p>`;
      return;
    }

    listEl.innerHTML = sorted.map((log) => {
      const timingLabel = log.timing === 'morning' ? '朝' : '夜';
      const typeLabel = log.type === 'weight' ? '体重' : '体脂肪率';
      const unit = log.type === 'weight' ? 'kg' : '%';
      return `
        <div class="log-item-row">
          <div class="log-item-main">
            <span class="mini-badge ${log.timing}">${timingLabel}</span>
            <strong>${typeLabel} ${Number(log.value).toFixed(1)}${unit}</strong>
            <span class="log-sub">${formatTimeOnly(log.measuredAt)}</span>
          </div>
          <div class="log-item-actions">
            <button type="button" class="icon-text-btn" data-edit-weight="${log.id}">編集</button>
            <button type="button" class="icon-text-btn danger" data-del-weight="${log.id}">削除</button>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('[data-edit-weight]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = sorted.find((l) => l.id === btn.dataset.editWeight);
        if (target) openWeightEditModal(target);
      });
    });

    listEl.querySelectorAll('[data-del-weight]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('この測定記録を削除しますか？')) return;
        await DietDB.deleteItem('weight_logs', btn.dataset.delWeight);
        callbacks.showToast('測定記録を削除しました');
        await renderRecordView();
        await callbacks.onDataChanged();
      });
    });
  }

  function openWeightCreateModal(timing) {
    const title = timing === 'morning' ? '朝の測定を記録' : '夜の測定を記録';
    const defaultDt = getLocalDateTimeStr(selectedDate, timing === 'morning' ? 7 : 21);

    openSheet(title, `
      <p class="sheet-note">体重だけ・体脂肪率だけの記録も可能です。データは別々に管理されます。</p>
      <div class="form-group">
        <label class="form-label" for="w-datetime">測定日時</label>
        <input type="datetime-local" id="w-datetime" class="form-input" value="${defaultDt}">
      </div>
      <div class="input-row">
        <div class="form-group">
          <label class="form-label" for="w-weight">体重（kg）</label>
          <input type="number" id="w-weight" class="form-input" inputmode="decimal" step="0.1" min="25" max="200" placeholder="例：56.4">
        </div>
        <div class="form-group">
          <label class="form-label" for="w-fat">体脂肪率（%）</label>
          <input type="number" id="w-fat" class="form-input" inputmode="decimal" step="0.1" min="5" max="65" placeholder="例：28.5">
        </div>
      </div>
      <div class="sheet-actions">
        <button type="button" id="btn-save-weight" class="btn-primary">保存する</button>
      </div>
    `);

    document.getElementById('btn-save-weight').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const dtVal = document.getElementById('w-datetime').value;
      const wVal = document.getElementById('w-weight').value.trim();
      const fVal = document.getElementById('w-fat').value.trim();

      if (!wVal && !fVal) {
        callbacks.showToast('体重または体脂肪率を入力してください');
        return;
      }

      const dateStr = dtVal ? dtVal.slice(0, 10) : selectedDate;
      const measuredAt = dtVal || getLocalDateTimeStr(selectedDate);
      const nowIso = new Date().toISOString();

      if (wVal) {
        const numW = Number(wVal);
        if (Number.isNaN(numW) || numW < 25 || numW > 200) {
          callbacks.showToast('体重を正しく入力してください');
          return;
        }
        await DietDB.putItem('weight_logs', {
          id: DietDB.generateId('w'),
          date: dateStr,
          measuredAt,
          timing,
          type: 'weight',
          value: numW,
          createdAt: nowIso
        });
      }

      if (fVal) {
        const numF = Number(fVal);
        if (Number.isNaN(numF) || numF < 5 || numF > 65) {
          callbacks.showToast('体脂肪率を正しく入力してください');
          return;
        }
        await DietDB.putItem('weight_logs', {
          id: DietDB.generateId('bf'),
          date: dateStr,
          measuredAt,
          timing,
          type: 'bodyFat',
          value: numF,
          createdAt: nowIso
        });
      }

      selectedDate = dateStr;
      closeSheet();
      callbacks.showToast('測定記録を保存しました');
      await renderRecordView();
      scrollToRecordTop();
      await callbacks.onDataChanged();
    });
  }

  function openWeightEditModal(log) {
    const isWeight = log.type === 'weight';
    openSheet(isWeight ? '体重の記録を編集' : '体脂肪率の記録を編集', `
      <div class="form-group">
        <label class="form-label" for="we-timing">測定区分</label>
        <select id="we-timing" class="form-select">
          <option value="morning" ${log.timing === 'morning' ? 'selected' : ''}>朝</option>
          <option value="night" ${log.timing === 'night' ? 'selected' : ''}>夜</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="we-datetime">測定日時</label>
        <input type="datetime-local" id="we-datetime" class="form-input" value="${escapeHtml(log.measuredAt.slice(0, 16))}">
      </div>
      <div class="form-group">
        <label class="form-label" for="we-value">${isWeight ? '体重（kg）' : '体脂肪率（%）'}</label>
        <input type="number" id="we-value" class="form-input" inputmode="decimal" step="0.1" value="${log.value}">
      </div>
      <div class="sheet-actions">
        <button type="button" id="btn-update-weight" class="btn-primary">更新する</button>
      </div>
    `);

    document.getElementById('btn-update-weight').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const timing = document.getElementById('we-timing').value;
      const measuredAt = document.getElementById('we-datetime').value || log.measuredAt;
      const val = Number(document.getElementById('we-value').value);
      if (Number.isNaN(val) || val <= 0) {
        callbacks.showToast('数値を正しく入力してください');
        return;
      }
      await DietDB.putItem('weight_logs', {
        ...log,
        timing,
        measuredAt,
        date: measuredAt.slice(0, 10),
        value: val,
        updatedAt: new Date().toISOString()
      });
      closeSheet();
      callbacks.showToast('測定記録を更新しました');
      await renderRecordView();
      scrollToRecordTop();
      await callbacks.onDataChanged();
    });
  }

  /* ---- 2. 食事セクション ---- */
  function renderMealSection(meals) {
    const totalEl = document.getElementById('rec-meal-total');
    const listWrap = document.getElementById('rec-meal-list-wrap');
    if (!listWrap) return;

    const totals = meals.reduce(
      (acc, m) => ({
        kcal: acc.kcal + (Number(m.confirmed?.kcal) || 0),
        p: acc.p + (Number(m.confirmed?.p) || 0),
        f: acc.f + (Number(m.confirmed?.f) || 0),
        c: acc.c + (Number(m.confirmed?.c) || 0)
      }),
      { kcal: 0, p: 0, f: 0, c: 0 }
    );

    if (totalEl) {
      totalEl.textContent = `合計 ${Math.round(totals.kcal)} kcal（P:${totals.p.toFixed(1)} F:${totals.f.toFixed(1)} C:${totals.c.toFixed(1)}）`;
    }

    const groupsHtml = MEAL_TYPES.map((mt) => {
      const items = meals.filter((m) => m.mealType === mt.key);
      const subKcal = Math.round(items.reduce((sum, m) => sum + (Number(m.confirmed?.kcal) || 0), 0));

      const rows = items.length
        ? items.map((m) => `
            <div class="meal-log-card">
              <div class="meal-log-top">
                <strong>${escapeHtml(m.name)}</strong>
                <span class="meal-log-kcal">${Math.round(m.confirmed.kcal)} kcal</span>
              </div>
              <div class="meal-log-pfc">
                P ${Number(m.confirmed.p).toFixed(1)}g ／ F ${Number(m.confirmed.f).toFixed(1)}g ／ C ${Number(m.confirmed.c).toFixed(1)}g
              </div>
              ${m.items && m.items.length ? `<div class="meal-log-ingredients">${m.items.map((i) => `${escapeHtml(i.name)} ${i.grams}g`).join('・')}</div>` : ''}
              <div class="meal-log-actions">
                <button type="button" class="icon-text-btn" data-save-tpl="${m.id}">定番化</button>
                <button type="button" class="icon-text-btn" data-edit-meal="${m.id}">編集</button>
                <button type="button" class="icon-text-btn danger" data-del-meal="${m.id}">削除</button>
              </div>
            </div>
          `).join('')
        : `<p class="empty-note small">未記録</p>`;

      return `
        <div class="meal-group-block">
          <div class="meal-group-head">
            <span>${mt.label}</span>
            <strong>${subKcal} kcal</strong>
          </div>
          ${rows}
        </div>
      `;
    }).join('');

    listWrap.innerHTML = groupsHtml;

    listWrap.querySelectorAll('[data-edit-meal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = meals.find((m) => m.id === btn.dataset.editMeal);
        if (target) openMealEditModal(target);
      });
    });

    listWrap.querySelectorAll('[data-del-meal]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('この食事記録を削除しますか？')) return;
        await DietDB.deleteItem('meal_logs', btn.dataset.delMeal);
        callbacks.showToast('食事記録を削除しました');
        await renderRecordView();
        await callbacks.onDataChanged();
      });
    });

    listWrap.querySelectorAll('[data-save-tpl]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const target = meals.find((m) => m.id === btn.dataset.saveTpl);
        if (!target) return;
        await saveAsTemplate(target);
        callbacks.showToast(`「${target.name}」を定番テンプレートに保存しました`);
      });
    });
  }

  async function saveAsTemplate(mealRecord) {
    await DietDB.putItem('meal_templates', {
      id: DietDB.generateId('tpl'),
      name: mealRecord.name,
      defaultMealType: mealRecord.mealType,
      items: mealRecord.items || [],
      nutrition: { ...mealRecord.confirmed },
      createdAt: new Date().toISOString()
    });
  }

  async function getAllFoods() {
    const customFoods = await DietDB.getAll('food_master');
    return [
      ...customFoods.map((f) => ({ ...f, isCustom: true })),
      ...FoodCatalog.BUILTIN_FOODS.map((f) => ({ ...f, isCustom: false }))
    ];
  }

  /* ---- 食事登録 B：食材・グラム登録 ---- */
  async function openIngredientMealModal() {
    const allFoods = await getAllFoods();
    let selectedItems = [];
    let searchQuery = '';
    let selectedCat = 'all';

    openSheet('B. 食材・グラムから登録', `
      <div class="input-row">
        <div class="form-group">
          <label class="form-label" for="ing-meal-type">食事区分</label>
          <select id="ing-meal-type" class="form-select">
            ${MEAL_TYPES.map((t) => `<option value="${t.key}" ${t.key === activeMealCategory ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="ing-meal-name">料理名（任意）</label>
          <input type="text" id="ing-meal-name" class="form-input" placeholder="空欄なら自動設定">
        </div>
      </div>

      <div class="selected-tray" id="ing-selected-tray"></div>

      <div class="form-group" style="margin-top: 12px;">
        <div class="inline-head">
          <label class="form-label" for="ing-search" style="margin:0;">食材を検索して追加</label>
          <button type="button" id="btn-quick-add-food" class="text-btn">＋ 独自食材を作成</button>
        </div>
        <input type="search" id="ing-search" class="form-input" placeholder="例：ごはん、鶏むね、卵、油...">
      </div>

      <div class="cat-scroll" id="ing-cat-bar">
        ${FoodCatalog.CATEGORIES.map((c) => `<button type="button" class="cat-pill ${c.id === 'all' ? 'active' : ''}" data-cat="${c.id}">${c.label}</button>`).join('')}
      </div>

      <div class="food-search-list" id="ing-food-list"></div>

      <label class="checkbox-row">
        <input type="checkbox" id="ing-save-tpl">
        <span>この組み合わせを定番テンプレートにも保存する</span>
      </label>

      <div class="sheet-actions">
        <button type="button" id="btn-save-ing-meal" class="btn-primary">この食事を登録する</button>
      </div>
    `);

    const trayEl = document.getElementById('ing-selected-tray');
    const foodListEl = document.getElementById('ing-food-list');
    const searchInput = document.getElementById('ing-search');

    function renderTray() {
      if (!selectedItems.length) {
        trayEl.innerHTML = `<p class="empty-note small">下から食材をタップして追加してください</p>`;
        return;
      }

      let sumK = 0, sumP = 0, sumF = 0, sumC = 0;
      const rows = selectedItems.map((entry, idx) => {
        const n = FoodCatalog.calcNutrition(entry.food, entry.grams);
        sumK += n.kcal;
        sumP += n.p;
        sumF += n.f;
        sumC += n.c;
        return `
          <div class="tray-item">
            <div class="tray-item-top">
              <strong>${escapeHtml(entry.food.name)}</strong>
              <span>${n.kcal} kcal</span>
            </div>
            <div class="tray-item-ctrl">
              <input type="number" class="gram-input" inputmode="decimal" min="1" max="2000" value="${entry.grams}" data-gram-idx="${idx}">
              <span class="unit-txt">g</span>
              ${entry.food.unitGram ? `<button type="button" class="mini-pill" data-preset-idx="${idx}" data-preset-g="${entry.food.unitGram}">${escapeHtml(entry.food.unitLabel)}(${entry.food.unitGram}g)</button>` : ''}
              <button type="button" class="icon-text-btn danger" data-rem-idx="${idx}">×</button>
            </div>
          </div>
        `;
      }).join('');

      trayEl.innerHTML = `
        <div class="tray-summary">
          <strong>合計 ${Math.round(sumK)} kcal</strong>
          <span>P:${sumP.toFixed(1)}g / F:${sumF.toFixed(1)}g / C:${sumC.toFixed(1)}g</span>
        </div>
        ${rows}
      `;

      trayEl.querySelectorAll('[data-gram-idx]').forEach((inp) => {
        inp.addEventListener('change', () => {
          const i = Number(inp.dataset.gramIdx);
          const v = Math.max(1, Number(inp.value) || 1);
          selectedItems[i].grams = v;
          renderTray();
        });
      });

      trayEl.querySelectorAll('[data-preset-idx]').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedItems[Number(btn.dataset.presetIdx)].grams = Number(btn.dataset.presetG);
          renderTray();
        });
      });

      trayEl.querySelectorAll('[data-rem-idx]').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedItems.splice(Number(btn.dataset.remIdx), 1);
          renderTray();
        });
      });
    }

    function renderFoodList() {
      const q = searchQuery.trim().toLowerCase();
      const filtered = allFoods.filter((f) => {
        const matchCat =
          selectedCat === 'all' ||
          (selectedCat === 'custom' ? f.isCustom : f.category === selectedCat);
        const matchQ = !q || f.name.toLowerCase().includes(q);
        return matchCat && matchQ;
      });

      if (!filtered.length) {
        foodListEl.innerHTML = `<p class="empty-note small">該当する食材がありません。「独自食材を作成」から追加できます。</p>`;
        return;
      }

      foodListEl.innerHTML = filtered.slice(0, 40).map((f) => `
        <button type="button" class="food-row-btn" data-add-food="${f.id}">
          <div>
            <strong>${escapeHtml(f.name)} ${f.isCustom ? '<span class="mini-tag">独自</span>' : ''}</strong>
            <span>100g: ${f.kcal}kcal (P${f.p} F${f.f} C${f.c})</span>
          </div>
          <span class="add-plus">＋ ${f.unitGram || 100}g</span>
        </button>
      `).join('');

      foodListEl.querySelectorAll('[data-add-food]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const food = allFoods.find((x) => x.id === btn.dataset.addFood);
          if (!food) return;
          selectedItems.push({ food, grams: food.unitGram || 100 });
          renderTray();
        });
      });
    }

    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      renderFoodList();
    });

    document.getElementById('ing-cat-bar').querySelectorAll('[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedCat = btn.dataset.cat;
        document.getElementById('ing-cat-bar').querySelectorAll('[data-cat]').forEach((b) => b.classList.toggle('active', b === btn));
        renderFoodList();
      });
    });

    document.getElementById('btn-quick-add-food').addEventListener('click', () => {
      openCustomFoodFormModal(() => openIngredientMealModal());
    });

    document.getElementById('btn-save-ing-meal').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!selectedItems.length) {
        callbacks.showToast('食材を1つ以上追加してください');
        return;
      }

      const mealType = document.getElementById('ing-meal-type').value;
      const customName = document.getElementById('ing-meal-name').value.trim();
      const autoName = selectedItems.length === 1
        ? selectedItems[0].food.name
        : `${selectedItems[0].food.name} ほか${selectedItems.length - 1}品`;

      let totalKcal = 0, totalP = 0, totalF = 0, totalC = 0;
      const itemsPayload = selectedItems.map((entry) => {
        const n = FoodCatalog.calcNutrition(entry.food, entry.grams);
        totalKcal += n.kcal;
        totalP += n.p;
        totalF += n.f;
        totalC += n.c;
        return {
          foodId: entry.food.id,
          name: entry.food.name,
          grams: entry.grams,
          ...n
        };
      });

      const record = {
        id: DietDB.generateId('meal'),
        date: selectedDate,
        registeredAt: new Date().toISOString(),
        mealType,
        name: customName || autoName,
        source: 'manual_ingredients',
        items: itemsPayload,
        aiEstimate: null,
        confirmed: {
          kcal: Math.round(totalKcal),
          p: Number(totalP.toFixed(1)),
          f: Number(totalF.toFixed(1)),
          c: Number(totalC.toFixed(1))
        }
      };

      await DietDB.putItem('meal_logs', record);
      if (document.getElementById('ing-save-tpl').checked) {
        await saveAsTemplate(record);
      }

      activeMealCategory = mealType;
      closeSheet();
      callbacks.showToast('食事を記録しました');
      await renderRecordView();
      scrollToRecordTop();
      await callbacks.onDataChanged();
    });

    renderTray();
    renderFoodList();
  }

  /* ---- 食事登録 C：商品の栄養成分表示から登録 ---- */
  function openLabelMealModal() {
    openSheet('C. 栄養成分表示から登録', `
      <div class="input-row">
        <div class="form-group">
          <label class="form-label" for="lb-meal-type">食事区分</label>
          <select id="lb-meal-type" class="form-select">
            ${MEAL_TYPES.map((t) => `<option value="${t.key}" ${t.key === activeMealCategory ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="lb-ratio">食べた量（倍率）</label>
          <input type="number" id="lb-ratio" class="form-input" inputmode="decimal" step="0.1" min="0.1" max="10" value="1">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="lb-name">商品・料理名 <span class="badge-req">必須</span></label>
        <input type="text" id="lb-name" class="form-input" placeholder="例：コンビニおにぎり（鮭）">
      </div>

      <div class="input-row">
        <div class="form-group">
          <label class="form-label" for="lb-kcal">エネルギー（kcal） <span class="badge-req">必須</span></label>
          <input type="number" id="lb-kcal" class="form-input" inputmode="decimal" step="1" min="0" placeholder="例：180">
        </div>
        <div class="form-group">
          <label class="form-label" for="lb-p">たんぱく質（g）</label>
          <input type="number" id="lb-p" class="form-input" inputmode="decimal" step="0.1" min="0" placeholder="例：5.5">
        </div>
      </div>

      <div class="input-row">
        <div class="form-group">
          <label class="form-label" for="lb-f">脂質（g）</label>
          <input type="number" id="lb-f" class="form-input" inputmode="decimal" step="0.1" min="0" placeholder="例：1.8">
        </div>
        <div class="form-group">
          <label class="form-label" for="lb-c">炭水化物（g）</label>
          <input type="number" id="lb-c" class="form-input" inputmode="decimal" step="0.1" min="0" placeholder="例：36.0">
        </div>
      </div>

      <div id="lb-preview" class="alert-box info">登録値プレビュー：0 kcal（P:0g / F:0g / C:0g）</div>

      <label class="checkbox-row">
        <input type="checkbox" id="lb-save-tpl">
        <span>この商品を定番テンプレートにも保存する</span>
      </label>

      <div class="sheet-actions">
        <button type="button" id="btn-save-lb-meal" class="btn-primary">この食事を登録する</button>
      </div>
    `);

    const updatePreview = () => {
      const r = Math.max(0.1, Number(document.getElementById('lb-ratio').value) || 1);
      const k = Math.round((Number(document.getElementById('lb-kcal').value) || 0) * r);
      const p = ((Number(document.getElementById('lb-p').value) || 0) * r).toFixed(1);
      const f = ((Number(document.getElementById('lb-f').value) || 0) * r).toFixed(1);
      const c = ((Number(document.getElementById('lb-c').value) || 0) * r).toFixed(1);
      document.getElementById('lb-preview').textContent = `登録値プレビュー：${k} kcal（P:${p}g / F:${f}g / C:${c}g）`;
    };

    ['lb-ratio', 'lb-kcal', 'lb-p', 'lb-f', 'lb-c'].forEach((id) => {
      document.getElementById(id).addEventListener('input', updatePreview);
    });

    document.getElementById('btn-save-lb-meal').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const name = document.getElementById('lb-name').value.trim();
      const rawKcal = document.getElementById('lb-kcal').value.trim();
      if (!name) {
        callbacks.showToast('商品・料理名を入力してください');
        return;
      }
      if (rawKcal === '' || Number(rawKcal) < 0) {
        callbacks.showToast('エネルギー（kcal）を入力してください');
        return;
      }

      const r = Math.max(0.1, Number(document.getElementById('lb-ratio').value) || 1);
      const mealType = document.getElementById('lb-meal-type').value;

      const record = {
        id: DietDB.generateId('meal'),
        date: selectedDate,
        registeredAt: new Date().toISOString(),
        mealType,
        name: r === 1 ? name : `${name}（×${r}）`,
        source: 'manual_label',
        items: [],
        aiEstimate: null,
        confirmed: {
          kcal: Math.round((Number(rawKcal) || 0) * r),
          p: Number(((Number(document.getElementById('lb-p').value) || 0) * r).toFixed(1)),
          f: Number(((Number(document.getElementById('lb-f').value) || 0) * r).toFixed(1)),
          c: Number(((Number(document.getElementById('lb-c').value) || 0) * r).toFixed(1))
        }
      };

      await DietDB.putItem('meal_logs', record);
      if (document.getElementById('lb-save-tpl').checked) {
        await saveAsTemplate(record);
      }

      activeMealCategory = mealType;
      closeSheet();
      callbacks.showToast('食事を記録しました');
      await renderRecordView();
      scrollToRecordTop();
      await callbacks.onDataChanged();
    });
  }

  /* ---- 食事登録 D：履歴・テンプレートからワンタップ再登録 ---- */
  async function openHistoryTemplateModal() {
    const [templates, allMeals] = await Promise.all([
      DietDB.getAll('meal_templates'),
      DietDB.getAll('meal_logs')
    ]);

    const sortedMeals = [...allMeals].sort((a, b) => String(b.registeredAt).localeCompare(String(a.registeredAt)));
    const uniqueHistory = [];
    const seenKeys = new Set();
    for (const m of sortedMeals) {
      const sig = `${m.name}_${m.confirmed?.kcal}`;
      if (!seenKeys.has(sig)) {
        seenKeys.add(sig);
        uniqueHistory.push(m);
      }
      if (uniqueHistory.length >= 30) break;
    }

    let currentTab = templates.length ? 'tpl' : 'hist';

    openSheet('D. テンプレート・履歴から再登録', `
      <div class="form-group">
        <label class="form-label" for="ht-meal-type">登録先の食事区分（${formatDisplayDate(selectedDate)}）</label>
        <select id="ht-meal-type" class="form-select">
          ${MEAL_TYPES.map((t) => `<option value="${t.key}" ${t.key === activeMealCategory ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>
      </div>

      <div class="segmented-control two-tab">
        <button type="button" class="seg-btn ${currentTab === 'tpl' ? 'active' : ''}" data-ht-tab="tpl">定番テンプレート (${templates.length})</button>
        <button type="button" class="seg-btn ${currentTab === 'hist' ? 'active' : ''}" data-ht-tab="hist">過去の履歴 (${uniqueHistory.length})</button>
      </div>

      <div id="ht-list"></div>
    `);

    const listEl = document.getElementById('ht-list');

    async function quickRegister(item, sourceType) {
      const mealType = document.getElementById('ht-meal-type').value;
      const nut = sourceType === 'tpl' ? item.nutrition : item.confirmed;
      const record = {
        id: DietDB.generateId('meal'),
        date: selectedDate,
        registeredAt: new Date().toISOString(),
        mealType,
        name: item.name,
        source: 'template',
        items: item.items || [],
        aiEstimate: null,
        confirmed: {
          kcal: Math.round(Number(nut.kcal) || 0),
          p: Number(Number(nut.p || 0).toFixed(1)),
          f: Number(Number(nut.f || 0).toFixed(1)),
          c: Number(Number(nut.c || 0).toFixed(1))
        }
      };
      await DietDB.putItem('meal_logs', record);
      activeMealCategory = mealType;
      closeSheet();
      callbacks.showToast(`「${item.name}」を${MEAL_LABEL_MAP[mealType]}に登録しました`);
      await renderRecordView();
      scrollToRecordTop();
      await callbacks.onDataChanged();
    }

    function renderTabList() {
      if (currentTab === 'tpl') {
        if (!templates.length) {
          listEl.innerHTML = `<p class="empty-note">定番テンプレートはまだありません。食事を登録するときに「定番テンプレートにも保存」を選ぶか、記録済み食事の「定番化」を押すと追加できます。</p>`;
          return;
        }
        listEl.innerHTML = templates.map((t) => `
          <div class="quick-item-row">
            <div class="quick-item-info">
              <strong>${escapeHtml(t.name)}</strong>
              <span>${Math.round(t.nutrition.kcal)} kcal（P:${t.nutrition.p} F:${t.nutrition.f} C:${t.nutrition.c}）</span>
            </div>
            <button type="button" class="btn-mini-primary" data-use-tpl="${t.id}">登録</button>
          </div>
        `).join('');

        listEl.querySelectorAll('[data-use-tpl]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const target = templates.find((x) => x.id === btn.dataset.useTpl);
            if (target) quickRegister(target, 'tpl');
          });
        });
      } else {
        if (!uniqueHistory.length) {
          listEl.innerHTML = `<p class="empty-note">過去の食事履歴がまだありません。</p>`;
          return;
        }
        listEl.innerHTML = uniqueHistory.map((m) => `
          <div class="quick-item-row">
            <div class="quick-item-info">
              <strong>${escapeHtml(m.name)}</strong>
              <span>${Math.round(m.confirmed.kcal)} kcal（P:${m.confirmed.p} F:${m.confirmed.f} C:${m.confirmed.c}）</span>
            </div>
            <button type="button" class="btn-mini-primary" data-use-hist="${m.id}">登録</button>
          </div>
        `).join('');

        listEl.querySelectorAll('[data-use-hist]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const target = uniqueHistory.find((x) => x.id === btn.dataset.useHist);
            if (target) quickRegister(target, 'hist');
          });
        });
      }
    }

    sheetBody.querySelectorAll('[data-ht-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentTab = btn.dataset.htTab;
        sheetBody.querySelectorAll('[data-ht-tab]').forEach((b) => b.classList.toggle('active', b === btn));
        renderTabList();
      });
    });

    renderTabList();
  }

  /* ---- 登録済み食事の編集モーダル ---- */
  function openMealEditModal(meal) {
    openSheet('食事記録を編集', `
      <div class="input-row">
        <div class="form-group">
          <label class="form-label" for="me-date">日付</label>
          <input type="date" id="me-date" class="form-input" value="${escapeHtml(meal.date)}">
        </div>
        <div class="form-group">
          <label class="form-label" for="me-type">食事区分</label>
          <select id="me-type" class="form-select">
            ${MEAL_TYPES.map((t) => `<option value="${t.key}" ${t.key === meal.mealType ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="me-name">料理名</label>
        <input type="text" id="me-name" class="form-input" value="${escapeHtml(meal.name)}">
      </div>

      <div class="input-row">
        <div class="form-group">
          <label class="form-label" for="me-kcal">カロリー（kcal）</label>
          <input type="number" id="me-kcal" class="form-input" inputmode="decimal" step="1" value="${meal.confirmed.kcal}">
        </div>
        <div class="form-group">
          <label class="form-label" for="me-p">たんぱく質（g）</label>
          <input type="number" id="me-p" class="form-input" inputmode="decimal" step="0.1" value="${meal.confirmed.p}">
        </div>
      </div>

      <div class="input-row">
        <div class="form-group">
          <label class="form-label" for="me-f">脂質（g）</label>
          <input type="number" id="me-f" class="form-input" inputmode="decimal" step="0.1" value="${meal.confirmed.f}">
        </div>
        <div class="form-group">
          <label class="form-label" for="me-c">炭水化物（g）</label>
          <input type="number" id="me-c" class="form-input" inputmode="decimal" step="0.1" value="${meal.confirmed.c}">
        </div>
      </div>

      <div class="sheet-actions">
        <button type="button" id="btn-update-meal" class="btn-primary">更新する</button>
      </div>
    `);

    document.getElementById('btn-update-meal').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const name = document.getElementById('me-name').value.trim();
      if (!name) {
        callbacks.showToast('料理名を入力してください');
        return;
      }
      await DietDB.putItem('meal_logs', {
        ...meal,
        date: document.getElementById('me-date').value || meal.date,
        mealType: document.getElementById('me-type').value,
        name,
        confirmed: {
          kcal: Math.max(0, Math.round(Number(document.getElementById('me-kcal').value) || 0)),
          p: Math.max(0, Number(Number(document.getElementById('me-p').value || 0).toFixed(1))),
          f: Math.max(0, Number(Number(document.getElementById('me-f').value || 0).toFixed(1))),
          c: Math.max(0, Number(Number(document.getElementById('me-c').value || 0).toFixed(1)))
        },
        updatedAt: new Date().toISOString()
      });
      closeSheet();
      callbacks.showToast('食事記録を更新しました');
      await renderRecordView();
      scrollToRecordTop();
      await callbacks.onDataChanged();
    });
  }

  /* ---- 3. 行動・体調メモ（任意） ---- */
  function renderDailySection(daily) {
    const summaryEl = document.getElementById('rec-daily-summary');
    if (!summaryEl) return;

    if (!daily) {
      summaryEl.innerHTML = `<p class="empty-note small">まだ記録されていません（任意）</p>`;
      return;
    }

    const tags = [];
    if (daily.exerciseType && daily.exerciseType !== 'なし') {
      tags.push(`運動：${daily.exerciseType}${daily.exerciseMinutes ? ` ${daily.exerciseMinutes}分` : ''}`);
    }
    if (daily.sleepHours) tags.push(`睡眠：${daily.sleepHours}h${daily.sleepQuality ? `(${daily.sleepQuality})` : ''}`);
    if (daily.condition) tags.push(`体調：${daily.condition}`);
    if (daily.hunger) tags.push(`空腹感：${daily.hunger}`);
    if (daily.stress) tags.push(`ストレス：${daily.stress}`);
    if (daily.cycle && daily.cycle !== '未選択') tags.push(`周期：${daily.cycle}`);

    summaryEl.innerHTML = `
      <div class="daily-tags-wrap">${tags.map((t) => `<span class="daily-tag">${escapeHtml(t)}</span>`).join('') || '<span class="empty-note small">メモのみ登録</span>'}</div>
      ${daily.memo ? `<p class="daily-memo-text">${escapeHtml(daily.memo)}</p>` : ''}
    `;
  }

  async function openDailyLogModal() {
    const existing = (await DietDB.getItem('daily_logs', selectedDate)) || {
      date: selectedDate,
      exerciseType: 'なし',
      exerciseMinutes: '',
      sleepHours: '',
      sleepQuality: '',
      condition: '',
      hunger: '',
      stress: '',
      cycle: '未選択',
      memo: ''
    };

    const makeChips = (key, options, current) => options.map((opt) => `
      <button type="button" class="choice-chip ${current === opt ? 'selected' : ''}" data-dl-key="${key}" data-dl-val="${opt}">${opt}</button>
    `).join('');

    openSheet(`行動・体調メモ（${formatDisplayDate(selectedDate)}）`, `
      <p class="sheet-note">すべて任意です。気になる項目だけ選んで保存できます。</p>

      <div class="form-group">
        <label class="form-label">運動</label>
        <div class="chip-grid">${makeChips('exerciseType', ['なし', 'ウォーキング', 'ストレッチ', '筋トレ', '有酸素', 'その他'], existing.exerciseType)}</div>
        <input type="number" id="dl-ex-min" class="form-input" inputmode="numeric" min="0" max="300" placeholder="運動時間（分・任意）" value="${escapeHtml(existing.exerciseMinutes)}">
      </div>

      <div class="input-row">
        <div class="form-group">
          <label class="form-label" for="dl-sleep-h">睡眠時間（時間）</label>
          <input type="number" id="dl-sleep-h" class="form-input" inputmode="decimal" step="0.5" min="0" max="24" placeholder="例：6.5" value="${escapeHtml(existing.sleepHours)}">
        </div>
        <div class="form-group">
          <label class="form-label" for="dl-sleep-q">睡眠の質</label>
          <select id="dl-sleep-q" class="form-select">
            <option value="" ${!existing.sleepQuality ? 'selected' : ''}>未選択</option>
            <option value="良い" ${existing.sleepQuality === '良い' ? 'selected' : ''}>良い</option>
            <option value="普通" ${existing.sleepQuality === '普通' ? 'selected' : ''}>普通</option>
            <option value="浅い・寝不足" ${existing.sleepQuality === '浅い・寝不足' ? 'selected' : ''}>浅い・寝不足</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">体調</label>
        <div class="chip-grid">${makeChips('condition', ['良い', '普通', '疲れ気味', '不調'], existing.condition)}</div>
      </div>

      <div class="form-group">
        <label class="form-label">空腹感</label>
        <div class="chip-grid">${makeChips('hunger', ['落ち着いている', 'やや空腹', '強い空腹', '食べ過ぎた'], existing.hunger)}</div>
      </div>

      <div class="form-group">
        <label class="form-label">ストレス</label>
        <div class="chip-grid">${makeChips('stress', ['低い', '普通', '高い'], existing.stress)}</div>
      </div>

      <div class="form-group">
        <label class="form-label">月経周期（任意）</label>
        <div class="chip-grid">${makeChips('cycle', ['未選択', '通常期', '生理前', '生理中'], existing.cycle)}</div>
      </div>

      <div class="form-group">
        <label class="form-label" for="dl-memo">メモ（外食・食べ過ぎた背景など）</label>
        <textarea id="dl-memo" class="form-textarea" rows="3" placeholder="例：夕方に疲れてチョコを食べた、ランチ外食など">${escapeHtml(existing.memo)}</textarea>
      </div>

      <div class="sheet-actions row">
        <button type="button" id="btn-del-daily" class="btn-outline">削除</button>
        <button type="button" id="btn-save-daily" class="btn-primary">保存する</button>
      </div>
    `);

    const state = { ...existing };

    sheetBody.querySelectorAll('[data-dl-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.dlKey;
        const val = btn.dataset.dlVal;
        state[key] = state[key] === val && key !== 'exerciseType' && key !== 'cycle' ? '' : val;
        sheetBody.querySelectorAll(`[data-dl-key="${key}"]`).forEach((b) => {
          b.classList.toggle('selected', b.dataset.dlVal === state[key]);
        });
      });
    });

    document.getElementById('btn-save-daily').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      state.date = selectedDate;
      state.exerciseMinutes = document.getElementById('dl-ex-min').value.trim();
      state.sleepHours = document.getElementById('dl-sleep-h').value.trim();
      state.sleepQuality = document.getElementById('dl-sleep-q').value;
      state.memo = document.getElementById('dl-memo').value.trim();
      state.updatedAt = new Date().toISOString();

      await DietDB.putItem('daily_logs', state);
      closeSheet();
      callbacks.showToast('行動・体調メモを保存しました');
      await renderRecordView();
      scrollToRecordTop();
      await callbacks.onDataChanged();
    });

    document.getElementById('btn-del-daily').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!confirm('この日の行動・体調メモを削除しますか？')) return;
      await DietDB.deleteItem('daily_logs', selectedDate);
      closeSheet();
      callbacks.showToast('行動・体調メモを削除しました');
      await renderRecordView();
      scrollToRecordTop();
      await callbacks.onDataChanged();
    });
  }

  /* ---- 4. 設定画面：独自食材マスタ＆テンプレート管理 ---- */
  async function openMasterManagerModal() {
    const [customFoods, templates] = await Promise.all([
      DietDB.getAll('food_master'),
      DietDB.getAll('meal_templates')
    ]);

    let tab = 'tpl';

    openSheet('食材マスタ・テンプレート管理', `
      <div class="segmented-control two-tab">
        <button type="button" class="seg-btn active" data-mm-tab="tpl">食事テンプレート (${templates.length})</button>
        <button type="button" class="seg-btn" data-mm-tab="food">独自食材 (${customFoods.length})</button>
      </div>
      <div id="mm-body"></div>
    `);

    const mmBody = document.getElementById('mm-body');

    function renderMM() {
      if (tab === 'tpl') {
        mmBody.innerHTML = templates.length
          ? templates.map((t) => `
              <div class="quick-item-row">
                <div class="quick-item-info">
                  <strong>${escapeHtml(t.name)}</strong>
                  <span>${Math.round(t.nutrition.kcal)} kcal（P:${t.nutrition.p} F:${t.nutrition.f} C:${t.nutrition.c}）</span>
                </div>
                <button type="button" class="icon-text-btn danger" data-del-mm-tpl="${t.id}">削除</button>
              </div>
            `).join('')
          : `<p class="empty-note">登録された食事テンプレートはありません。</p>`;

        mmBody.querySelectorAll('[data-del-mm-tpl]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            if (!confirm('このテンプレートを削除しますか？')) return;
            await DietDB.deleteItem('meal_templates', btn.dataset.delMmTpl);
            callbacks.showToast('テンプレートを削除しました');
            openMasterManagerModal();
          });
        });
      } else {
        mmBody.innerHTML = `
          <button type="button" id="btn-mm-add-food" class="btn-secondary full-width" style="margin-bottom:12px;">＋ 新しい独自食材を追加する</button>
          ${customFoods.length
            ? customFoods.map((f) => `
                <div class="quick-item-row">
                  <div class="quick-item-info">
                    <strong>${escapeHtml(f.name)}</strong>
                    <span>100g: ${f.kcal}kcal (P:${f.p} F:${f.f} C:${f.c})</span>
                  </div>
                  <button type="button" class="icon-text-btn danger" data-del-mm-food="${f.id}">削除</button>
                </div>
              `).join('')
            : `<p class="empty-note">独自登録された食材はまだありません。よく食べる市販品や自家製メニューの栄養値を登録しておけます。</p>`}
        `;

        document.getElementById('btn-mm-add-food').addEventListener('click', () => {
          openCustomFoodFormModal(() => openMasterManagerModal());
        });

        mmBody.querySelectorAll('[data-del-mm-food]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            if (!confirm('この独自食材を削除しますか？')) return;
            await DietDB.deleteItem('food_master', btn.dataset.delMmFood);
            callbacks.showToast('独自食材を削除しました');
            openMasterManagerModal();
          });
        });
      }
    }

    sheetBody.querySelectorAll('[data-mm-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        tab = btn.dataset.mmTab;
        sheetBody.querySelectorAll('[data-mm-tab]').forEach((b) => b.classList.toggle('active', b === btn));
        renderMM();
      });
    });

    renderMM();
  }

  function openCustomFoodFormModal(onSaved) {
    openSheet('独自食材を追加（100gあたり）', `
      <div class="form-group">
        <label class="form-label" for="cf-name">食材名 <span class="badge-req">必須</span></label>
        <input type="text" id="cf-name" class="form-input" placeholder="例：いつものグラノーラ">
      </div>
      <div class="input-row">
        <div class="form-group">
          <label class="form-label" for="cf-kcal">100gあたり kcal <span class="badge-req">必須</span></label>
          <input type="number" id="cf-kcal" class="form-input" inputmode="decimal" placeholder="例：440">
        </div>
        <div class="form-group">
          <label class="form-label" for="cf-p">たんぱく質 (g)</label>
          <input type="number" id="cf-p" class="form-input" inputmode="decimal" step="0.1" placeholder="例：8.0">
        </div>
      </div>
      <div class="input-row">
        <div class="form-group">
          <label class="form-label" for="cf-f">脂質 (g)</label>
          <input type="number" id="cf-f" class="form-input" inputmode="decimal" step="0.1" placeholder="例：15.0">
        </div>
        <div class="form-group">
          <label class="form-label" for="cf-c">炭水化物 (g)</label>
          <input type="number" id="cf-c" class="form-input" inputmode="decimal" step="0.1" placeholder="例：68.0">
        </div>
      </div>
      <div class="input-row">
        <div class="form-group">
          <label class="form-label" for="cf-unit-label">1目安の呼び方</label>
          <input type="text" id="cf-unit-label" class="form-input" placeholder="例：1食分" value="1食分">
        </div>
        <div class="form-group">
          <label class="form-label" for="cf-unit-gram">1目安のグラム (g)</label>
          <input type="number" id="cf-unit-gram" class="form-input" inputmode="numeric" value="50">
        </div>
      </div>
      <div class="sheet-actions">
        <button type="button" id="btn-save-custom-food" class="btn-primary">独自食材を保存</button>
      </div>
    `);

    document.getElementById('btn-save-custom-food').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const name = document.getElementById('cf-name').value.trim();
      const kcal = Number(document.getElementById('cf-kcal').value);
      if (!name || Number.isNaN(kcal) || kcal < 0) {
        callbacks.showToast('食材名とカロリーを入力してください');
        return;
      }
      await DietDB.putItem('food_master', {
        id: DietDB.generateId('food'),
        name,
        category: 'custom',
        kcal,
        p: Number(document.getElementById('cf-p').value) || 0,
        f: Number(document.getElementById('cf-f').value) || 0,
        c: Number(document.getElementById('cf-c').value) || 0,
        unitLabel: document.getElementById('cf-unit-label').value.trim() || '1食分',
        unitGram: Math.max(1, Number(document.getElementById('cf-unit-gram').value) || 100)
      });
      callbacks.showToast(`「${name}」を追加しました`);
      if (onSaved) onSaved();
      else closeSheet();
    });
  }

  /* ---- 初期化 ---- */
  function init(opts) {
    callbacks = { ...callbacks, ...opts };

    sheetCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeSheet();
    });
    sheetBackdrop.addEventListener('click', (e) => {
      if (e.target === sheetBackdrop) {
        e.preventDefault();
        e.stopPropagation();
        closeSheet();
      }
    });

    document.getElementById('rec-prev-day').addEventListener('click', () => setSelectedDate(shiftDate(selectedDate, -1)));
    document.getElementById('rec-next-day').addEventListener('click', () => setSelectedDate(shiftDate(selectedDate, 1)));
    document.getElementById('rec-today-btn').addEventListener('click', () => setSelectedDate(getLocalDateStr(new Date())));

    document.getElementById('btn-rec-morning').addEventListener('click', () => openWeightCreateModal('morning'));
    document.getElementById('btn-rec-night').addEventListener('click', () => openWeightCreateModal('night'));

    document.getElementById('btn-meal-ingredients').addEventListener('click', openIngredientMealModal);
    document.getElementById('btn-meal-label').addEventListener('click', openLabelMealModal);
    document.getElementById('btn-meal-history').addEventListener('click', openHistoryTemplateModal);
    document.getElementById('btn-rec-daily').addEventListener('click', openDailyLogModal);
  }

  return {
    init,
    getLocalDateStr,
    setSelectedDate,
    setActiveMealCategory,
    renderRecordView,
    openMasterManagerModal
  };
})();
