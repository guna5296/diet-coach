/**
 * My Diet Coach - フェーズ4：分析機能モジュール
 * - 外部ライブラリ不使用（完全オフラインSVGグラフ）
 * - 体重（日次・7日移動平均・週次サマリー・目標との差）
 * - 体脂肪率（日次・7日移動平均・変動配慮表示）
 * - 食事（日別カロリー棒グラフ・週間平均・PFC比率・食事区分内訳・継続率）
 * - 行動・体調振り返り（運動・睡眠・体調・空腹感・周期・食べ過ぎメモ）
 */
const AnalyticsModule = (() => {
  'use strict';

  let currentRange = '7'; // '7' | '30' | 'all'
  let lastProfile = null;

  function getLocalDateStr(dateObj = new Date()) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseLocalDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function shiftDate(dateStr, diffDays) {
    const dt = parseLocalDate(dateStr);
    dt.setDate(dt.getDate() + diffDays);
    return getLocalDateStr(dt);
  }

  function buildDateSequence(startStr, endStr) {
    const list = [];
    let cur = startStr;
    let guard = 0;
    while (cur <= endStr && guard < 1500) {
      list.push(cur);
      cur = shiftDate(cur, 1);
      guard += 1;
    }
    return list;
  }

  function formatShortDate(dateStr) {
    const [, m, d] = dateStr.split('-').map(Number);
    return `${m}/${d}`;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function avg(nums) {
    if (!nums.length) return null;
    return nums.reduce((s, n) => s + n, 0) / nums.length;
  }

  /**
   * 体重・体脂肪ログを日別マップへ整理（同日・同タイミングは最新時刻を採用）
   */
  function organizeWeightMaps(weightLogs) {
    const sorted = [...weightLogs].sort((a, b) =>
      String(a.measuredAt || '').localeCompare(String(b.measuredAt || ''))
    );

    const morningWeight = {};
    const nightWeight = {};
    const anyWeight = {};
    const bodyFat = {};

    sorted.forEach((log) => {
      const val = Number(log.value);
      if (Number.isNaN(val)) return;
      if (log.type === 'weight') {
        if (log.timing === 'morning') morningWeight[log.date] = val;
        else nightWeight[log.date] = val;
        // 代表値は朝を優先し、朝がなければ夜
        if (log.timing === 'morning' || anyWeight[log.date] === undefined) {
          anyWeight[log.date] = val;
        }
      } else if (log.type === 'bodyFat') {
        if (log.timing === 'morning' || bodyFat[log.date] === undefined) {
          bodyFat[log.date] = val;
        }
      }
    });

    return { morningWeight, nightWeight, anyWeight, bodyFat };
  }

  /**
   * 指定日までの直近7日間の移動平均を算出
   */
  function calc7DayMovingAvg(valueMap, dateStr) {
    const vals = [];
    for (let i = 0; i < 7; i += 1) {
      const d = shiftDate(dateStr, -i);
      if (valueMap[d] !== undefined) vals.push(valueMap[d]);
    }
    return vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : null;
  }

  /**
   * ホーム画面からも呼べる最新の朝7日平均体重ヘルパー
   */
  async function getLatestWeightStats() {
    const weightLogs = await DietDB.getAll('weight_logs');
    const maps = organizeWeightMaps(weightLogs);
    const todayStr = getLocalDateStr(new Date());

    const morningDates = Object.keys(maps.morningWeight).sort();
    const anyDates = Object.keys(maps.anyWeight).sort();
    const useMorning = morningDates.length > 0;
    const baseMap = useMorning ? maps.morningWeight : maps.anyWeight;
    const latestDate = useMorning
      ? morningDates[morningDates.length - 1]
      : anyDates[anyDates.length - 1];

    const avg7 = latestDate ? calc7DayMovingAvg(baseMap, latestDate <= todayStr ? todayStr : latestDate) : null;
    const fallbackAvg7 = latestDate && avg7 === null ? calc7DayMovingAvg(baseMap, latestDate) : avg7;

    return {
      hasMorning: useMorning,
      latestDate: latestDate || null,
      avg7: fallbackAvg7 !== null ? Number(fallbackAvg7.toFixed(1)) : null
    };
  }

  /* =========================================================
     SVGグラフ描画エンジン（完全オフライン・レスポンシブ）
     ========================================================= */
  function buildLineChartSvg({
    dates,
    primarySeries,     // [{ value }] 7日平均ライン（主線）
    dotSeries,         // [{ value }] 実測値（朝など）
    subDotSeries = [], // [{ value }] 参考実測値（夜など）
    targetLine = null,
    unit = 'kg',
    lineColor = '#5B8A72',
    dotColor = '#93B5A3',
    subDotColor = '#B8C4D4'
  }) {
    const validVals = [];
    primarySeries.forEach((v) => { if (v !== null) validVals.push(v); });
    dotSeries.forEach((v) => { if (v !== null) validVals.push(v); });
    subDotSeries.forEach((v) => { if (v !== null) validVals.push(v); });

    if (!validVals.length) {
      return `<div class="chart-empty">この期間の測定データがまだありません。記録が増えると自動でグラフが描かれます。</div>`;
    }

    let minVal = Math.min(...validVals);
    let maxVal = Math.max(...validVals);

    // 目標ラインが実測範囲から近傍（±2.5以内）にあるときだけスケールに含める
    const showTargetLine =
      targetLine !== null &&
      targetLine >= minVal - 2.5 &&
      targetLine <= maxVal + 2.5;

    if (showTargetLine) {
      minVal = Math.min(minVal, targetLine);
      maxVal = Math.max(maxVal, targetLine);
    }

    const span = Math.max(1.2, maxVal - minVal);
    const yMin = Math.floor((minVal - span * 0.2) * 2) / 2;
    const yMax = Math.ceil((maxVal + span * 0.2) * 2) / 2;
    const yRange = Math.max(0.5, yMax - yMin);

    const W = 340;
    const H = 180;
    const padL = 42;
    const padR = 14;
    const padT = 16;
    const padB = 28;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const getX = (idx) => {
      if (dates.length <= 1) return padL + plotW / 2;
      return padL + (idx / (dates.length - 1)) * plotW;
    };
    const getY = (val) => padT + ((yMax - val) / yRange) * plotH;

    // 水平グリッド（3本）
    const gridSteps = [yMax, yMin + yRange / 2, yMin];
    const gridHtml = gridSteps.map((v) => {
      const y = getY(v).toFixed(1);
      return `
        <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#E6ECE8" stroke-width="1" />
        <text x="${padL - 6}" y="${Number(y) + 4}" text-anchor="end" font-size="10" fill="#7C8C82">${v.toFixed(1)}</text>
      `;
    }).join('');

    // 目標ライン
    let targetHtml = '';
    if (showTargetLine) {
      const ty = getY(targetLine).toFixed(1);
      targetHtml = `
        <line x1="${padL}" y1="${ty}" x2="${W - padR}" y2="${ty}" stroke="#C9823A" stroke-width="1.2" stroke-dasharray="4 3" />
        <text x="${W - padR}" y="${Number(ty) - 4}" text-anchor="end" font-size="9.5" font-weight="700" fill="#C9823A">目標 ${targetLine}${unit}</text>
      `;
    }

    // 夜の参考ドット
    const subDotsHtml = subDotSeries.map((v, i) => {
      if (v === null) return '';
      return `<circle cx="${getX(i).toFixed(1)}" cy="${getY(v).toFixed(1)}" r="2.6" fill="${subDotColor}" opacity="0.85" />`;
    }).join('');

    // 実測値（薄い折れ線＋ドット）
    const dotPoints = [];
    const dotsHtml = dotSeries.map((v, i) => {
      if (v === null) return '';
      const x = getX(i).toFixed(1);
      const y = getY(v).toFixed(1);
      dotPoints.push(`${x},${y}`);
      return `<circle cx="${x}" cy="${y}" r="3.2" fill="#FFFFFF" stroke="${dotColor}" stroke-width="1.8" />`;
    }).join('');

    const thinLineHtml = dotPoints.length >= 2
      ? `<polyline fill="none" stroke="${dotColor}" stroke-width="1.3" stroke-opacity="0.6" points="${dotPoints.join(' ')}" />`
      : '';

    // 7日平均ライン（主線）
    const avgPoints = [];
    const avgDots = [];
    primarySeries.forEach((v, i) => {
      if (v === null) return;
      const x = getX(i).toFixed(1);
      const y = getY(v).toFixed(1);
      avgPoints.push(`${x},${y}`);
      avgDots.push({ x, y });
    });

    const avgLineHtml = avgPoints.length >= 2
      ? `<polyline fill="none" stroke="${lineColor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" points="${avgPoints.join(' ')}" />`
      : avgDots.length === 1
        ? `<circle cx="${avgDots[0].x}" cy="${avgDots[0].y}" r="4" fill="${lineColor}" />`
        : '';

    const lastAvgDot = avgDots.length
      ? `<circle cx="${avgDots[avgDots.length - 1].x}" cy="${avgDots[avgDots.length - 1].y}" r="4" fill="${lineColor}" stroke="#FFFFFF" stroke-width="1.5" />`
      : '';

    // X軸ラベル（間引き表示）
    const maxLabels = dates.length <= 7 ? dates.length : 5;
    const labelIndices = new Set();
    if (dates.length <= maxLabels) {
      dates.forEach((_, i) => labelIndices.add(i));
    } else {
      for (let k = 0; k < maxLabels; k += 1) {
        labelIndices.add(Math.round((k * (dates.length - 1)) / (maxLabels - 1)));
      }
    }

    const xLabelsHtml = [...labelIndices].map((i) => `
      <text x="${getX(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#7C8C82">${formatShortDate(dates[i])}</text>
    `).join('');

    return `
      <svg class="analytics-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="推移グラフ">
        ${gridHtml}
        ${targetHtml}
        ${thinLineHtml}
        ${subDotsHtml}
        ${dotsHtml}
        ${avgLineHtml}
        ${lastAvgDot}
        ${xLabelsHtml}
      </svg>
    `;
  }

  /**
   * カロリー推移棒グラフ（SVG）
   */
  function buildCalorieBarSvg({ dates, kcalSeries, targetCalories }) {
    const hasAny = kcalSeries.some((v) => v > 0);
    if (!hasAny) {
      return `<div class="chart-empty">この期間の食事記録がまだありません。食事を記録すると日別グラフが表示されます。</div>`;
    }

    const maxKcal = Math.max(targetCalories * 1.15, ...kcalSeries, 1000);
    const yMax = Math.ceil(maxKcal / 200) * 200;

    const W = 340;
    const H = 170;
    const padL = 42;
    const padR = 12;
    const padT = 16;
    const padB = 26;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const getY = (val) => padT + ((yMax - val) / yMax) * plotH;
    const stepW = plotW / Math.max(1, dates.length);
    const barW = Math.max(3, Math.min(22, stepW * 0.62));

    const gridSteps = [yMax, Math.round(yMax / 2), 0];
    const gridHtml = gridSteps.map((v) => {
      const y = getY(v).toFixed(1);
      return `
        <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#E6ECE8" stroke-width="1" />
        <text x="${padL - 6}" y="${Number(y) + 4}" text-anchor="end" font-size="10" fill="#7C8C82">${v}</text>
      `;
    }).join('');

    const barsHtml = kcalSeries.map((val, i) => {
      const cx = padL + stepW * i + stepW / 2;
      const x = (cx - barW / 2).toFixed(1);
      const y = getY(val).toFixed(1);
      const h = Math.max(0, padT + plotH - Number(y)).toFixed(1);
      const isOver = val > targetCalories + 150;
      const fill = val === 0 ? '#E8EEEA' : isOver ? '#D49450' : '#5B8A72';
      return `<rect x="${x}" y="${y}" width="${barW.toFixed(1)}" height="${h}" rx="3" fill="${fill}" />`;
    }).join('');

    const ty = getY(targetCalories).toFixed(1);
    const targetLineHtml = `
      <line x1="${padL}" y1="${ty}" x2="${W - padR}" y2="${ty}" stroke="#46705B" stroke-width="1.3" stroke-dasharray="4 3" />
      <text x="${W - padR}" y="${Number(ty) - 4}" text-anchor="end" font-size="9.5" font-weight="700" fill="#46705B">目標 ${targetCalories}</text>
    `;

    const maxLabels = dates.length <= 7 ? dates.length : 5;
    const labelIndices = new Set();
    if (dates.length <= maxLabels) {
      dates.forEach((_, i) => labelIndices.add(i));
    } else {
      for (let k = 0; k < maxLabels; k += 1) {
        labelIndices.add(Math.round((k * (dates.length - 1)) / (maxLabels - 1)));
      }
    }

    const xLabelsHtml = [...labelIndices].map((i) => {
      const cx = padL + stepW * i + stepW / 2;
      return `<text x="${cx.toFixed(1)}" y="${H - 7}" text-anchor="middle" font-size="10" fill="#7C8C82">${formatShortDate(dates[i])}</text>`;
    }).join('');

    return `
      <svg class="analytics-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="日別摂取カロリーグラフ">
        ${gridHtml}
        ${barsHtml}
        ${targetLineHtml}
        ${xLabelsHtml}
      </svg>
    `;
  }

  /* =========================================================
     週次サマリー生成（直近最大8週）
     ========================================================= */
  function buildWeeklySummaryRows(todayStr, weightMaps, mealByDate, dailyByDate) {
    // 今日を含む週（月曜始まり）から遡って最大8週
    const todayDt = parseLocalDate(todayStr);
    const dayOfWeek = (todayDt.getDay() + 6) % 7; // 月=0 ... 日=6
    const thisMonday = shiftDate(todayStr, -dayOfWeek);

    const rows = [];
    for (let w = 0; w < 8; w += 1) {
      const start = shiftDate(thisMonday, -w * 7);
      const endCandidate = shiftDate(start, 6);
      const end = endCandidate > todayStr ? todayStr : endCandidate;
      const days = buildDateSequence(start, end);

      const mWeights = [];
      const kcalDays = [];
      let exDays = 0;

      days.forEach((d) => {
        if (weightMaps.morningWeight[d] !== undefined) mWeights.push(weightMaps.morningWeight[d]);
        else if (weightMaps.anyWeight[d] !== undefined) mWeights.push(weightMaps.anyWeight[d]);

        if (mealByDate[d] && mealByDate[d].kcal > 0) kcalDays.push(mealByDate[d].kcal);
        const dl = dailyByDate[d];
        if (dl && dl.exerciseType && dl.exerciseType !== 'なし') exDays += 1;
      });

      if (w > 0 && !mWeights.length && !kcalDays.length && exDays === 0) {
        continue;
      }

      rows.push({
        label: `${formatShortDate(start)}〜${formatShortDate(end)}`,
        avgWeight: mWeights.length ? `${avg(mWeights).toFixed(1)}kg` : '--',
        avgKcal: kcalDays.length ? `${Math.round(avg(kcalDays))}kcal` : '--',
        mealDays: `${kcalDays.length}/${days.length}日`,
        exDays: `${exDays}日`
      });
    }

    return rows;
  }

  /* =========================================================
     メイン描画処理
     ========================================================= */
  async function render(userProfile) {
    if (userProfile) lastProfile = userProfile;
    const container = document.getElementById('analytics-content');
    if (!container || !lastProfile) return;

    const [weightLogs, mealLogs, dailyLogs] = await Promise.all([
      DietDB.getAll('weight_logs'),
      DietDB.getAll('meal_logs'),
      DietDB.getAll('daily_logs')
    ]);

    const todayStr = getLocalDateStr(new Date());
    const weightMaps = organizeWeightMaps(weightLogs);

    // 食事ログを日別集計
    const mealByDate = {};
    mealLogs.forEach((m) => {
      if (!mealByDate[m.date]) {
        mealByDate[m.date] = {
          kcal: 0, p: 0, f: 0, c: 0,
          byType: { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
        };
      }
      const k = Number(m.confirmed?.kcal) || 0;
      mealByDate[m.date].kcal += k;
      mealByDate[m.date].p += Number(m.confirmed?.p) || 0;
      mealByDate[m.date].f += Number(m.confirmed?.f) || 0;
      mealByDate[m.date].c += Number(m.confirmed?.c) || 0;
      if (mealByDate[m.date].byType[m.mealType] !== undefined) {
        mealByDate[m.date].byType[m.mealType] += k;
      }
    });

    const dailyByDate = {};
    dailyLogs.forEach((d) => { dailyByDate[d.date] = d; });

    // 最古の記録日・アプリ開始日を特定
    const allDatesRecorded = [
      ...weightLogs.map((x) => x.date),
      ...mealLogs.map((x) => x.date),
      ...dailyLogs.map((x) => x.date)
    ].filter(Boolean).sort();

    const approvedDate = lastProfile.approvedAt
      ? getLocalDateStr(new Date(lastProfile.approvedAt))
      : todayStr;
    const earliestActiveDate = allDatesRecorded.length && allDatesRecorded[0] < approvedDate
      ? allDatesRecorded[0]
      : approvedDate;

    // 選択期間の日付配列を決定
    let startStr = shiftDate(todayStr, -6);
    let rangeTitle = '直近7日間';
    if (currentRange === '30') {
      startStr = shiftDate(todayStr, -29);
      rangeTitle = '直近30日間';
    } else if (currentRange === 'all') {
      startStr = earliestActiveDate <= shiftDate(todayStr, -6) ? earliestActiveDate : shiftDate(todayStr, -6);
      rangeTitle = '全期間';
    }
    const dates = buildDateSequence(startStr, todayStr);

    // 継続率の分母（アプリ利用開始日より前は含めない）
    const activeStartForRate = earliestActiveDate > startStr ? earliestActiveDate : startStr;
    const activeDatesForRate = buildDateSequence(activeStartForRate, todayStr);

    /* ---- 1. 体重分析データ構築 ---- */
    const hasMorningAny = Object.keys(weightMaps.morningWeight).length > 0;
    const primaryWeightMap = hasMorningAny ? weightMaps.morningWeight : weightMaps.anyWeight;

    const morningDots = dates.map((d) => (weightMaps.morningWeight[d] !== undefined ? weightMaps.morningWeight[d] : null));
    const nightDots = dates.map((d) => (weightMaps.nightWeight[d] !== undefined ? weightMaps.nightWeight[d] : null));
    const displayDots = hasMorningAny ? morningDots : dates.map((d) => (weightMaps.anyWeight[d] !== undefined ? weightMaps.anyWeight[d] : null));
    const weightAvg7Series = dates.map((d) => calc7DayMovingAvg(primaryWeightMap, d));

    const validAvg7 = weightAvg7Series.filter((v) => v !== null);
    const latestAvg7 = validAvg7.length ? validAvg7[validAvg7.length - 1] : null;
    const firstAvg7 = validAvg7.length ? validAvg7[0] : null;
    const trendDiff = latestAvg7 !== null && firstAvg7 !== null
      ? Number((latestAvg7 - firstAvg7).toFixed(1))
      : null;

    const allWeightSorted = Object.keys(weightMaps.anyWeight).sort();
    const latestRawWeight = allWeightSorted.length
      ? weightMaps.anyWeight[allWeightSorted[allWeightSorted.length - 1]]
      : Number(lastProfile.profile.currentWeight);

    const targetWeight = Number(lastProfile.profile.targetWeight);
    const refForGoal = latestAvg7 !== null ? latestAvg7 : latestRawWeight;
    const diffToTarget = Number((refForGoal - targetWeight).toFixed(1));

    let weightInsight = 'まずは朝の体重を3〜4日記録すると、短期のブレを除いた7日平均ラインが見えてきます。';
    if (latestAvg7 !== null && validAvg7.length >= 2) {
      if (trendDiff <= -0.3) {
        weightInsight = `7日平均は期間内で ${trendDiff.toFixed(1)}kg と着実に下降しています。単日の増減があっても、今のペースで問題ありません。`;
      } else if (trendDiff >= 0.4) {
        weightInsight = `7日平均は期間内で +${trendDiff.toFixed(1)}kg となっています。まずは塩分・睡眠・月経周期の影響がないか確認し、焦って食事を削りすぎないようにしましょう。`;
      } else {
        weightInsight = `7日平均は横ばい圏（${trendDiff >= 0 ? '+' : ''}${trendDiff.toFixed(1)}kg）で安定しています。体重が動かなくても体調や食事の安定を2〜4週間単位で見ていきましょう。`;
      }
    }

    /* ---- 2. 体脂肪分析データ構築 ---- */
    const bfDots = dates.map((d) => (weightMaps.bodyFat[d] !== undefined ? weightMaps.bodyFat[d] : null));
    const bfAvg7Series = dates.map((d) => calc7DayMovingAvg(weightMaps.bodyFat, d));
    const validBfAvg = bfAvg7Series.filter((v) => v !== null);
    const latestBfAvg = validBfAvg.length ? validBfAvg[validBfAvg.length - 1] : null;
    const firstBfAvg = validBfAvg.length ? validBfAvg[0] : null;
    const bfDiff = latestBfAvg !== null && firstBfAvg !== null
      ? Number((latestBfAvg - firstBfAvg).toFixed(1))
      : null;

    /* ---- 3. 食事・PFC・継続率データ構築 ---- */
    const targetKcal = lastProfile.plan.targetCalories;
    const targetPfc = lastProfile.plan.pfc;

    const kcalSeries = dates.map((d) => (mealByDate[d] ? Math.round(mealByDate[d].kcal) : 0));
    const recordedMealDates = dates.filter((d) => mealByDate[d] && mealByDate[d].kcal > 0);
    const recordedForRate = activeDatesForRate.filter((d) => mealByDate[d] && mealByDate[d].kcal > 0);
    const mealContinuityPct = activeDatesForRate.length
      ? Math.round((recordedForRate.length / activeDatesForRate.length) * 100)
      : 0;

    // 週間平均（直近7日のうち記録がある日の平均）
    const last7Dates = buildDateSequence(shiftDate(todayStr, -6), todayStr);
    const last7Kcals = last7Dates.map((d) => mealByDate[d]?.kcal).filter((v) => v > 0);
    const weeklyAvgKcal = last7Kcals.length ? Math.round(avg(last7Kcals)) : null;

    // 期間平均（記録がある日ベース）
    const periodAvgKcal = recordedMealDates.length
      ? Math.round(avg(recordedMealDates.map((d) => mealByDate[d].kcal)))
      : null;
    const periodAvgP = recordedMealDates.length ? avg(recordedMealDates.map((d) => mealByDate[d].p)) : 0;
    const periodAvgF = recordedMealDates.length ? avg(recordedMealDates.map((d) => mealByDate[d].f)) : 0;
    const periodAvgC = recordedMealDates.length ? avg(recordedMealDates.map((d) => mealByDate[d].c)) : 0;

    // PFCエネルギー比率
    const pKcal = periodAvgP * 4;
    const fKcal = periodAvgF * 9;
    const cKcal = periodAvgC * 4;
    const sumMacroKcal = Math.max(1, pKcal + fKcal + cKcal);
    const pPct = recordedMealDates.length ? Math.round((pKcal / sumMacroKcal) * 100) : 0;
    const fPct = recordedMealDates.length ? Math.round((fKcal / sumMacroKcal) * 100) : 0;
    const cPct = recordedMealDates.length ? Math.max(0, 100 - pPct - fPct) : 0;

    // 食事区分ごとの平均内訳
    const typeTotals = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    recordedMealDates.forEach((d) => {
      Object.keys(typeTotals).forEach((t) => {
        typeTotals[t] += mealByDate[d].byType[t] || 0;
      });
    });
    const denomDays = Math.max(1, recordedMealDates.length);
    const totalAllMealKcal = Math.max(1, typeTotals.breakfast + typeTotals.lunch + typeTotals.dinner + typeTotals.snack);
    const mealBreakdown = [
      { label: '朝食', avgKcal: Math.round(typeTotals.breakfast / denomDays), pct: Math.round((typeTotals.breakfast / totalAllMealKcal) * 100) },
      { label: '昼食', avgKcal: Math.round(typeTotals.lunch / denomDays), pct: Math.round((typeTotals.lunch / totalAllMealKcal) * 100) },
      { label: '夕食', avgKcal: Math.round(typeTotals.dinner / denomDays), pct: Math.round((typeTotals.dinner / totalAllMealKcal) * 100) },
      { label: '間食', avgKcal: Math.round(typeTotals.snack / denomDays), pct: Math.round((typeTotals.snack / totalAllMealKcal) * 100) }
    ];

    /* ---- 4. 行動・体調データ構築 ---- */
    const periodDaily = dates.map((d) => dailyByDate[d]).filter(Boolean);
    const exerciseDays = periodDaily.filter((d) => d.exerciseType && d.exerciseType !== 'なし');
    const totalExMin = exerciseDays.reduce((s, d) => s + (Number(d.exerciseMinutes) || 0), 0);
    const sleepList = periodDaily.map((d) => Number(d.sleepHours)).filter((v) => v > 0);
    const avgSleep = sleepList.length ? avg(sleepList).toFixed(1) : null;
    const poorSleepDays = periodDaily.filter((d) => d.sleepQuality === '浅い・寝不足' || (Number(d.sleepHours) > 0 && Number(d.sleepHours) < 6)).length;

    const countBy = (key) => {
      const map = {};
      periodDaily.forEach((d) => {
        if (d[key] && d[key] !== '未選択') {
          map[d[key]] = (map[d[key]] || 0) + 1;
        }
      });
      return map;
    };

    const condCounts = countBy('condition');
    const hungerCounts = countBy('hunger');
    const stressCounts = countBy('stress');
    const cycleCounts = countBy('cycle');

    const overeatCount = hungerCounts['食べ過ぎた'] || 0;
    const highHungerCount = hungerCounts['強い空腹'] || 0;
    const snackOverDays = recordedMealDates.filter((d) => (mealByDate[d].byType.snack || 0) >= 250).length;

    const recentMemos = periodDaily
      .filter((d) => d.memo && d.memo.trim())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4);

    // 体重記録継続率
    const recordedWeightForRate = activeDatesForRate.filter((d) => weightMaps.anyWeight[d] !== undefined);
    const weightContinuityPct = activeDatesForRate.length
      ? Math.round((recordedWeightForRate.length / activeDatesForRate.length) * 100)
      : 0;

    // 週次サマリー
    const weeklyRows = buildWeeklySummaryRows(todayStr, weightMaps, mealByDate, dailyByDate);

    /* ---- HTML組み立て ---- */
    container.innerHTML = `
      <!-- 1. 体重分析カード -->
      <article class="card">
        <div class="card-header">
          <h2 class="card-title">体重推移（${rangeTitle}）</h2>
          <span class="card-sub">目標 ${targetWeight.toFixed(1)}kg</span>
        </div>

        <div class="metric-row three-col" style="margin-bottom: 12px;">
          <div class="metric-box compact">
            <span class="metric-label">${hasMorningAny ? '朝7日平均' : '7日平均'}</span>
            <strong class="metric-value small">${latestAvg7 !== null ? latestAvg7.toFixed(1) : '--.-'}<small>kg</small></strong>
          </div>
          <div class="metric-box compact">
            <span class="metric-label">期間の傾き</span>
            <strong class="metric-value small ${trendDiff !== null && trendDiff < 0 ? 'accent' : ''}">${trendDiff !== null ? `${trendDiff > 0 ? '+' : ''}${trendDiff.toFixed(1)}` : '--'}<small>kg</small></strong>
          </div>
          <div class="metric-box compact">
            <span class="metric-label">目標との差</span>
            <strong class="metric-value small accent">${diffToTarget > 0 ? `-${diffToTarget.toFixed(1)}` : diffToTarget === 0 ? '達成' : `+${Math.abs(diffToTarget).toFixed(1)}`}<small>${diffToTarget === 0 ? '' : 'kg'}</small></strong>
          </div>
        </div>

        <div class="chart-wrap">
          ${buildLineChartSvg({
            dates,
            primarySeries: weightAvg7Series,
            dotSeries: displayDots,
            subDotSeries: hasMorningAny ? nightDots : [],
            targetLine: targetWeight,
            unit: 'kg'
          })}
        </div>

        <div class="chart-legend">
          <span><i class="leg-line main"></i>${hasMorningAny ? '朝の7日平均' : '7日平均'}</span>
          <span><i class="leg-dot main"></i>${hasMorningAny ? '朝の実測' : '実測'}</span>
          ${hasMorningAny ? `<span><i class="leg-dot sub"></i>夜（参考）</span>` : ''}
        </div>

        <p class="insight-box">${escapeHtml(weightInsight)}</p>
      </article>

      <!-- 2. 体脂肪率分析カード -->
      <article class="card">
        <div class="card-header">
          <h2 class="card-title">体脂肪率の推移</h2>
          <span class="card-sub">平均の傾きで評価</span>
        </div>

        <div class="metric-row" style="margin-bottom: 12px;">
          <div class="metric-box compact">
            <span class="metric-label">直近7日平均</span>
            <strong class="metric-value small">${latestBfAvg !== null ? latestBfAvg.toFixed(1) : '--.-'}<small>%</small></strong>
          </div>
          <div class="metric-box compact">
            <span class="metric-label">期間内の変化</span>
            <strong class="metric-value small">${bfDiff !== null ? `${bfDiff > 0 ? '+' : ''}${bfDiff.toFixed(1)}` : '--'}<small>%</small></strong>
          </div>
        </div>

        <div class="chart-wrap">
          ${buildLineChartSvg({
            dates,
            primarySeries: bfAvg7Series,
            dotSeries: bfDots,
            unit: '%',
            lineColor: '#6B94B8',
            dotColor: '#A3BDD4'
          })}
        </div>

        <p class="form-hint">※家庭用体脂肪計は体内の水分量や測定時刻で1〜2%変動します。単日の増減ではなく長期の平均推移を参考にしてください。</p>
      </article>

      <!-- 3. 食事・カロリー・PFC分析カード -->
      <article class="card">
        <div class="card-header">
          <h2 class="card-title">カロリー・PFC分析</h2>
          <span class="card-sub">目標 ${targetKcal} kcal</span>
        </div>

        <div class="metric-row three-col" style="margin-bottom: 12px;">
          <div class="metric-box compact">
            <span class="metric-label">週間平均</span>
            <strong class="metric-value small">${weeklyAvgKcal !== null ? weeklyAvgKcal : '--'}<small>kcal</small></strong>
          </div>
          <div class="metric-box compact">
            <span class="metric-label">期間平均</span>
            <strong class="metric-value small">${periodAvgKcal !== null ? periodAvgKcal : '--'}<small>kcal</small></strong>
          </div>
          <div class="metric-box compact">
            <span class="metric-label">食事継続率</span>
            <strong class="metric-value small accent">${mealContinuityPct}<small>%</small></strong>
          </div>
        </div>

        <div class="chart-wrap">
          ${buildCalorieBarSvg({ dates, kcalSeries, targetCalories: targetKcal })}
        </div>

        <div class="sub-section-title">平均PFCバランス（記録日ベース）</div>
        ${recordedMealDates.length ? `
          <div class="pfc-ratio-bar" aria-label="PFCエネルギー比率">
            <div class="ratio-seg p-color" style="width:${pPct}%"></div>
            <div class="ratio-seg f-color" style="width:${fPct}%"></div>
            <div class="ratio-seg c-color" style="width:${cPct}%"></div>
          </div>
          <div class="pfc-ratio-legend">
            <span><i class="leg-dot p"></i>P ${pPct}%</span>
            <span><i class="leg-dot f"></i>F ${fPct}%</span>
            <span><i class="leg-dot c"></i>C ${cPct}%</span>
          </div>

          <div class="pfc-grid" style="margin-top: 10px;">
            <div class="pfc-item">
              <div class="pfc-head"><span>たんぱく質 (P) 平均</span><span>${periodAvgP.toFixed(1)} / ${targetPfc.p} g</span></div>
              <div class="progress-track small"><div class="progress-fill p-color" style="width:${Math.min(100, Math.round((periodAvgP / Math.max(1, targetPfc.p)) * 100))}%"></div></div>
            </div>
            <div class="pfc-item">
              <div class="pfc-head"><span>脂質 (F) 平均</span><span>${periodAvgF.toFixed(1)} / ${targetPfc.f} g</span></div>
              <div class="progress-track small"><div class="progress-fill f-color" style="width:${Math.min(100, Math.round((periodAvgF / Math.max(1, targetPfc.f)) * 100))}%"></div></div>
            </div>
            <div class="pfc-item">
              <div class="pfc-head"><span>炭水化物 (C) 平均</span><span>${periodAvgC.toFixed(1)} / ${targetPfc.c} g</span></div>
              <div class="progress-track small"><div class="progress-fill c-color" style="width:${Math.min(100, Math.round((periodAvgC / Math.max(1, targetPfc.c)) * 100))}%"></div></div>
            </div>
          </div>

          <div class="sub-section-title">食事ごとの平均内訳</div>
          <div class="meal-breakdown-grid">
            ${mealBreakdown.map((mb) => `
              <div class="mb-box">
                <span class="mb-label">${mb.label}</span>
                <strong>${mb.avgKcal} <small>kcal</small></strong>
                <span class="mb-pct">${mb.pct}%</span>
              </div>
            `).join('')}
          </div>
        ` : `<p class="empty-note small">食事を記録するとPFCバランスと食事区分別の内訳が表示されます。</p>`}
      </article>

      <!-- 4. 継続率・行動・体調の振り返りカード -->
      <article class="card">
        <div class="card-header">
          <h2 class="card-title">行動・体調・継続の振り返り</h2>
          <span class="card-sub">体重だけで判断しない</span>
        </div>

        <div class="metric-row" style="margin-bottom: 12px;">
          <div class="metric-box compact">
            <span class="metric-label">体重記録の継続率</span>
            <strong class="metric-value small">${weightContinuityPct}<small>% (${recordedWeightForRate.length}/${activeDatesForRate.length}日)</small></strong>
          </div>
          <div class="metric-box compact">
            <span class="metric-label">食事記録の継続率</span>
            <strong class="metric-value small">${mealContinuityPct}<small>% (${recordedForRate.length}/${activeDatesForRate.length}日)</small></strong>
          </div>
        </div>

        <div class="info-list" style="margin-bottom: 12px;">
          <div class="info-row">
            <span>運動できた日 / 合計時間</span>
            <strong>${exerciseDays.length}日${totalExMin ? `（計 ${totalExMin}分）` : ''}</strong>
          </div>
          <div class="info-row">
            <span>平均睡眠時間 / 寝不足の日</span>
            <strong>${avgSleep ? `${avgSleep}時間` : '未記録'} / ${poorSleepDays}日</strong>
          </div>
          <div class="info-row">
            <span>強い空腹・食べ過ぎた日</span>
            <strong>強い空腹 ${highHungerCount}日 ／ 食べ過ぎ ${overeatCount}日</strong>
          </div>
          <div class="info-row">
            <span>間食が250kcal以上の日</span>
            <strong>${snackOverDays}日</strong>
          </div>
        </div>

        ${Object.keys(condCounts).length || Object.keys(stressCounts).length || Object.keys(cycleCounts).length ? `
          <div class="sub-section-title">体調・ストレス・周期の記録内訳</div>
          <div class="daily-tags-wrap" style="margin-bottom: 10px;">
            ${Object.entries(condCounts).map(([k, v]) => `<span class="daily-tag">体調:${escapeHtml(k)} ${v}日</span>`).join('')}
            ${Object.entries(stressCounts).map(([k, v]) => `<span class="daily-tag">ストレス:${escapeHtml(k)} ${v}日</span>`).join('')}
            ${Object.entries(cycleCounts).map(([k, v]) => `<span class="daily-tag">${escapeHtml(k)} ${v}日</span>`).join('')}
          </div>
        ` : ''}

        ${recentMemos.length ? `
          <div class="sub-section-title">最近のメモ（行動・食べ過ぎの背景）</div>
          <div class="memo-history-list">
            ${recentMemos.map((d) => `
              <div class="memo-history-item">
                <span class="memo-date">${formatShortDate(d.date)}</span>
                <p>${escapeHtml(d.memo)}</p>
              </div>
            `).join('')}
          </div>
        ` : `<p class="empty-note small">記録画面の「行動・体調メモ」をつけると、体重変化と生活習慣の関係が見えてきます。</p>`}
      </article>

      <!-- 5. 週次推移サマリー（長期比較） -->
      <article class="card">
        <div class="card-header">
          <h2 class="card-title">週次推移サマリー</h2>
          <span class="card-sub">週単位の傾向</span>
        </div>
        ${weeklyRows.length ? `
          <div class="weekly-table-wrap">
            <table class="weekly-table">
              <thead>
                <tr>
                  <th>週</th>
                  <th>平均体重</th>
                  <th>平均kcal</th>
                  <th>食事</th>
                  <th>運動</th>
                </tr>
              </thead>
              <tbody>
                ${weeklyRows.map((r) => `
                  <tr>
                    <td>${r.label}</td>
                    <td><strong>${r.avgWeight}</strong></td>
                    <td>${r.avgKcal}</td>
                    <td>${r.mealDays}</td>
                    <td>${r.exDays}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `<p class="empty-note small">週ごとのデータが集まるとここに一覧表示されます。</p>`}
      </article>
    `;
  }

  function init() {
    document.querySelectorAll('[data-analytics-range]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentRange = btn.dataset.analyticsRange;
        document.querySelectorAll('[data-analytics-range]').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
        render();
      });
    });
  }

  return {
    init,
    render,
    getLatestWeightStats
  };
})();
