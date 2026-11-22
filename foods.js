/**
 * My Diet Coach - オフライン標準食品マスタ
 * 数値は100gあたりの目安（日本食品標準成分表ベース）
 * unitLabel / unitGram は入力の手間を減らすための1目安量
 */
const FoodCatalog = (() => {
  'use strict';

  const CATEGORIES = [
    { id: 'all', label: 'すべて' },
    { id: 'staple', label: '主食' },
    { id: 'meat', label: '肉' },
    { id: 'fish', label: '魚介' },
    { id: 'protein', label: '卵・乳・大豆' },
    { id: 'veg', label: '野菜・きのこ' },
    { id: 'fruit', label: '果物' },
    { id: 'seasoning', label: '油・調味料' },
    { id: 'snack', label: '間食・飲料' },
    { id: 'custom', label: '独自登録' }
  ];

  const BUILTIN_FOODS = [
    // 主食
    { id: 'std_rice_white', name: '白ごはん（炊飯後）', category: 'staple', kcal: 156, p: 2.5, f: 0.3, c: 37.1, unitLabel: '茶碗1杯', unitGram: 150 },
    { id: 'std_rice_brown', name: '玄米ごはん', category: 'staple', kcal: 152, p: 2.8, f: 1.0, c: 35.6, unitLabel: '茶碗1杯', unitGram: 150 },
    { id: 'std_rice_mugi', name: 'もち麦ごはん', category: 'staple', kcal: 150, p: 2.9, f: 0.5, c: 35.0, unitLabel: '茶碗1杯', unitGram: 150 },
    { id: 'std_bread_shoku', name: '食パン（6枚切り）', category: 'staple', kcal: 248, p: 8.9, f: 4.1, c: 46.4, unitLabel: '1枚', unitGram: 60 },
    { id: 'std_bread_roll', name: 'ロールパン', category: 'staple', kcal: 300, p: 9.5, f: 8.5, c: 48.0, unitLabel: '1個', unitGram: 35 },
    { id: 'std_oatmeal', name: 'オートミール（乾燥）', category: 'staple', kcal: 350, p: 13.7, f: 5.7, c: 69.1, unitLabel: '1食分', unitGram: 30 },
    { id: 'std_udon', name: 'ゆでうどん', category: 'staple', kcal: 95, p: 2.6, f: 0.4, c: 21.6, unitLabel: '1玉', unitGram: 230 },
    { id: 'std_soba', name: 'ゆでそば', category: 'staple', kcal: 130, p: 4.8, f: 1.0, c: 26.0, unitLabel: '1玉', unitGram: 200 },
    { id: 'std_pasta_dry', name: 'スパゲッティ（乾麺）', category: 'staple', kcal: 355, p: 12.9, f: 1.8, c: 73.1, unitLabel: '1人前', unitGram: 80 },
    { id: 'std_ramen_boiled', name: '中華麺（ゆで）', category: 'staple', kcal: 133, p: 4.9, f: 0.6, c: 29.2, unitLabel: '1玉', unitGram: 200 },
    { id: 'std_mochi', name: '切り餅', category: 'staple', kcal: 223, p: 4.0, f: 0.6, c: 50.8, unitLabel: '1個', unitGram: 50 },
    { id: 'std_sweet_potato', name: 'さつまいも（蒸し）', category: 'staple', kcal: 131, p: 1.2, f: 0.2, c: 31.9, unitLabel: '1/2本', unitGram: 100 },
    { id: 'std_potato', name: 'じゃがいも', category: 'staple', kcal: 59, p: 1.8, f: 0.1, c: 17.3, unitLabel: '中1個', unitGram: 120 },

    // 肉
    { id: 'std_ch_breast_no', name: '鶏むね肉（皮なし）', category: 'meat', kcal: 105, p: 23.3, f: 1.9, c: 0.1, unitLabel: '100g', unitGram: 100 },
    { id: 'std_ch_breast_skin', name: '鶏むね肉（皮つき）', category: 'meat', kcal: 133, p: 21.3, f: 5.9, c: 0.1, unitLabel: '100g', unitGram: 100 },
    { id: 'std_ch_thigh_no', name: '鶏もも肉（皮なし）', category: 'meat', kcal: 113, p: 19.0, f: 4.3, c: 0.0, unitLabel: '100g', unitGram: 100 },
    { id: 'std_ch_thigh_skin', name: '鶏もも肉（皮つき）', category: 'meat', kcal: 190, p: 16.6, f: 14.2, c: 0.0, unitLabel: '100g', unitGram: 100 },
    { id: 'std_ch_sasami', name: '鶏ささみ', category: 'meat', kcal: 98, p: 23.9, f: 0.8, c: 0.1, unitLabel: '1本', unitGram: 50 },
    { id: 'std_salad_chicken', name: 'サラダチキン（プレーン）', category: 'meat', kcal: 108, p: 23.8, f: 1.2, c: 0.5, unitLabel: '1パック', unitGram: 110 },
    { id: 'std_pork_loin', name: '豚ロース（脂身つき）', category: 'meat', kcal: 248, p: 19.3, f: 19.2, c: 0.2, unitLabel: '100g', unitGram: 100 },
    { id: 'std_pork_koma', name: '豚こま切れ（もも）', category: 'meat', kcal: 171, p: 20.5, f: 10.2, c: 0.2, unitLabel: '100g', unitGram: 100 },
    { id: 'std_pork_belly', name: '豚バラ肉', category: 'meat', kcal: 366, p: 14.4, f: 35.4, c: 0.1, unitLabel: '100g', unitGram: 100 },
    { id: 'std_pork_hire', name: '豚ヒレ肉', category: 'meat', kcal: 118, p: 22.2, f: 3.7, c: 0.3, unitLabel: '100g', unitGram: 100 },
    { id: 'std_beef_thigh', name: '牛もも肉（赤身）', category: 'meat', kcal: 140, p: 21.3, f: 6.1, c: 0.6, unitLabel: '100g', unitGram: 100 },
    { id: 'std_beef_belly', name: '牛バラ肉', category: 'meat', kcal: 371, p: 14.4, f: 32.9, c: 0.2, unitLabel: '100g', unitGram: 100 },
    { id: 'std_mince_mix', name: '合いびき肉', category: 'meat', kcal: 223, p: 18.6, f: 16.5, c: 0.4, unitLabel: '100g', unitGram: 100 },
    { id: 'std_wiener', name: 'ウインナーソーセージ', category: 'meat', kcal: 315, p: 13.2, f: 28.5, c: 3.0, unitLabel: '1本', unitGram: 20 },
    { id: 'std_ham', name: 'ロースハム', category: 'meat', kcal: 179, p: 16.5, f: 12.1, c: 1.3, unitLabel: '1枚', unitGram: 15 },

    // 魚介
    { id: 'std_salmon', name: '鮭（しろさけ・生）', category: 'fish', kcal: 124, p: 22.3, f: 4.1, c: 0.1, unitLabel: '1切れ', unitGram: 80 },
    { id: 'std_mackerel', name: 'さば（生）', category: 'fish', kcal: 211, p: 20.6, f: 16.8, c: 0.3, unitLabel: '1切れ', unitGram: 80 },
    { id: 'std_mackerel_can', name: 'さば水煮缶（固形＋汁）', category: 'fish', kcal: 174, p: 20.9, f: 10.7, c: 0.2, unitLabel: '1/2缶', unitGram: 95 },
    { id: 'std_aji', name: 'あじの開き', category: 'fish', kcal: 168, p: 23.1, f: 8.6, c: 0.1, unitLabel: '1枚', unitGram: 80 },
    { id: 'std_tuna_water', name: 'ツナ缶（ノンオイル）', category: 'fish', kcal: 70, p: 16.0, f: 0.7, c: 0.2, unitLabel: '1缶', unitGram: 70 },
    { id: 'std_tuna_oil', name: 'ツナ缶（オイル漬け）', category: 'fish', kcal: 267, p: 17.7, f: 21.7, c: 0.1, unitLabel: '1缶', unitGram: 70 },
    { id: 'std_shrimp', name: 'むきえび', category: 'fish', kcal: 82, p: 18.4, f: 0.6, c: 0.3, unitLabel: '5尾', unitGram: 60 },
    { id: 'std_chikuwa', name: 'ちくわ', category: 'fish', kcal: 118, p: 12.2, f: 2.0, c: 13.5, unitLabel: '1本', unitGram: 30 },

    // 卵・乳・大豆
    { id: 'std_egg', name: '鶏卵（全卵）', category: 'protein', kcal: 142, p: 12.2, f: 10.2, c: 0.4, unitLabel: 'M1個', unitGram: 50 },
    { id: 'std_tofu_kinu', name: '絹ごし豆腐', category: 'protein', kcal: 56, p: 5.3, f: 3.5, c: 2.0, unitLabel: '1/2丁', unitGram: 150 },
    { id: 'std_tofu_momen', name: '木綿豆腐', category: 'protein', kcal: 73, p: 7.0, f: 4.9, c: 1.5, unitLabel: '1/2丁', unitGram: 150 },
    { id: 'std_natto', name: '納豆（タレ別）', category: 'protein', kcal: 184, p: 16.5, f: 10.0, c: 12.1, unitLabel: '1パック', unitGram: 45 },
    { id: 'std_atsuage', name: '厚揚げ', category: 'protein', kcal: 143, p: 10.7, f: 11.3, c: 0.9, unitLabel: '1/2枚', unitGram: 100 },
    { id: 'std_milk', name: '牛乳', category: 'protein', kcal: 61, p: 3.3, f: 3.8, c: 4.8, unitLabel: 'コップ1杯', unitGram: 200 },
    { id: 'std_soymilk', name: '無調整豆乳', category: 'protein', kcal: 44, p: 3.6, f: 2.0, c: 3.1, unitLabel: 'コップ1杯', unitGram: 200 },
    { id: 'std_yogurt_plain', name: 'プレーンヨーグルト（無糖）', category: 'protein', kcal: 56, p: 3.6, f: 3.0, c: 4.9, unitLabel: '1食', unitGram: 100 },
    { id: 'std_yogurt_greek', name: 'ギリシャヨーグルト（無糖）', category: 'protein', kcal: 62, p: 10.0, f: 0.2, c: 4.5, unitLabel: '1個', unitGram: 100 },
    { id: 'std_cheese_6p', name: 'プロセスチーズ', category: 'protein', kcal: 313, p: 22.7, f: 26.0, c: 1.3, unitLabel: '1個', unitGram: 18 },
    { id: 'std_protein_powder', name: 'プロテイン粉末（目安）', category: 'protein', kcal: 380, p: 72.0, f: 5.0, c: 12.0, unitLabel: '1杯', unitGram: 30 },

    // 野菜・きのこ
    { id: 'std_cabbage', name: 'キャベツ', category: 'veg', kcal: 21, p: 1.3, f: 0.2, c: 5.2, unitLabel: '1食分', unitGram: 80 },
    { id: 'std_lettuce', name: 'レタス', category: 'veg', kcal: 11, p: 0.6, f: 0.1, c: 2.8, unitLabel: '2枚', unitGram: 60 },
    { id: 'std_tomato', name: 'トマト', category: 'veg', kcal: 20, p: 0.7, f: 0.1, c: 4.7, unitLabel: '中1/2個', unitGram: 100 },
    { id: 'std_broccoli', name: 'ブロッコリー（ゆで）', category: 'veg', kcal: 30, p: 3.9, f: 0.4, c: 5.2, unitLabel: '3房', unitGram: 60 },
    { id: 'std_onion', name: '玉ねぎ', category: 'veg', kcal: 33, p: 1.0, f: 0.1, c: 8.4, unitLabel: '1/2個', unitGram: 100 },
    { id: 'std_carrot', name: 'にんじん', category: 'veg', kcal: 35, p: 0.7, f: 0.2, c: 9.3, unitLabel: '1/3本', unitGram: 50 },
    { id: 'std_spinach', name: 'ほうれん草（ゆで）', category: 'veg', kcal: 23, p: 2.6, f: 0.5, c: 3.6, unitLabel: '1食分', unitGram: 60 },
    { id: 'std_moyashi', name: 'もやし', category: 'veg', kcal: 15, p: 1.7, f: 0.1, c: 2.6, unitLabel: '1/2袋', unitGram: 100 },
    { id: 'std_avocado', name: 'アボカド', category: 'veg', kcal: 176, p: 2.1, f: 17.5, c: 7.9, unitLabel: '1/2個', unitGram: 70 },
    { id: 'std_mushroom', name: 'きのこ類（しめじ・えのき等）', category: 'veg', kcal: 22, p: 2.7, f: 0.4, c: 6.0, unitLabel: '1/2株', unitGram: 50 },
    { id: 'std_misoshiru', name: '味噌汁（具あり1杯目安）', category: 'veg', kcal: 25, p: 1.8, f: 0.8, c: 3.0, unitLabel: '1杯', unitGram: 160 },

    // 果物
    { id: 'std_banana', name: 'バナナ（可食部）', category: 'fruit', kcal: 93, p: 1.1, f: 0.2, c: 22.5, unitLabel: '1本', unitGram: 90 },
    { id: 'std_apple', name: 'りんご', category: 'fruit', kcal: 53, p: 0.1, f: 0.2, c: 15.5, unitLabel: '1/2個', unitGram: 120 },
    { id: 'std_kiwi', name: 'キウイフルーツ', category: 'fruit', kcal: 51, p: 1.0, f: 0.2, c: 13.4, unitLabel: '1個', unitGram: 80 },
    { id: 'std_mikan', name: 'みかん', category: 'fruit', kcal: 49, p: 0.7, f: 0.1, c: 12.0, unitLabel: '1個', unitGram: 80 },

    // 油・調味料
    { id: 'std_oil', name: 'サラダ油・オリーブ油・ごま油', category: 'seasoning', kcal: 884, p: 0.0, f: 100.0, c: 0.0, unitLabel: '小さじ1', unitGram: 4 },
    { id: 'std_butter', name: '有塩バター', category: 'seasoning', kcal: 700, p: 0.6, f: 81.0, c: 0.2, unitLabel: '1かけ', unitGram: 10 },
    { id: 'std_mayo', name: 'マヨネーズ', category: 'seasoning', kcal: 670, p: 1.5, f: 75.3, c: 3.6, unitLabel: '大さじ1', unitGram: 12 },
    { id: 'std_dressing_sesame', name: 'ごまドレッシング', category: 'seasoning', kcal: 390, p: 2.5, f: 36.0, c: 14.0, unitLabel: '大さじ1', unitGram: 15 },
    { id: 'std_dressing_non', name: 'ノンオイルドレッシング', category: 'seasoning', kcal: 60, p: 2.0, f: 0.1, c: 13.0, unitLabel: '大さじ1', unitGram: 15 },
    { id: 'std_sugar', name: '砂糖', category: 'seasoning', kcal: 391, p: 0.0, f: 0.0, c: 99.3, unitLabel: '小さじ1', unitGram: 3 },
    { id: 'std_honey', name: 'はちみつ', category: 'seasoning', kcal: 329, p: 0.3, f: 0.0, c: 81.9, unitLabel: '小さじ1', unitGram: 7 },

    // 間食・飲料
    { id: 'std_choco_milk', name: 'ミルクチョコレート', category: 'snack', kcal: 550, p: 6.9, f: 34.1, c: 55.8, unitLabel: '2かけ', unitGram: 10 },
    { id: 'std_choco_high', name: '高カカオチョコ（72%目安）', category: 'snack', kcal: 560, p: 10.0, f: 40.0, c: 42.0, unitLabel: '1枚', unitGram: 5 },
    { id: 'std_nuts', name: '素焼きミックスナッツ', category: 'snack', kcal: 620, p: 18.0, f: 56.0, c: 18.0, unitLabel: 'ひと握り', unitGram: 20 },
    { id: 'std_senbei', name: 'せんべい', category: 'snack', kcal: 380, p: 6.5, f: 1.5, c: 85.0, unitLabel: '1枚', unitGram: 20 },
    { id: 'std_cafelatte', name: 'カフェラテ（無糖）', category: 'snack', kcal: 36, p: 1.9, f: 2.2, c: 2.8, unitLabel: '1杯', unitGram: 200 },
    { id: 'std_tomato_juice', name: '食塩無添加トマトジュース', category: 'snack', kcal: 19, p: 0.8, f: 0.0, c: 4.0, unitLabel: '1杯', unitGram: 200 }
  ];

  function calcNutrition(food, grams) {
    const ratio = Number(grams) / 100;
    return {
      kcal: Math.round((Number(food.kcal) || 0) * ratio),
      p: Number(((Number(food.p) || 0) * ratio).toFixed(1)),
      f: Number(((Number(food.f) || 0) * ratio).toFixed(1)),
      c: Number(((Number(food.c) || 0) * ratio).toFixed(1))
    };
  }

  return {
    CATEGORIES,
    BUILTIN_FOODS,
    calcNutrition
  };
})();
