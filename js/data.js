/* ---------- 数据层：常见百化分对照 ---------- */
/* 数值一律由 num/den 计算得出，展示精度遵循行测惯用口径。 */
window.FRACTION_DATA = (function () {
  // 1/2 ~ 1/20
  const BASE_DENS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  // 高频衍生分数（行测真题常考）
  const DERIVED_PAIRS = [
    [2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6],
    [2, 7], [3, 7], [4, 7], [5, 7], [6, 7],
    [3, 8], [5, 8], [7, 8],
    [4, 9], [5, 9], [7, 9], [8, 9],
    [5, 12], [7, 12],
    [2, 15], [7, 15],
    [3, 16], [5, 16], [7, 16],
    [3, 20], [7, 20], [9, 20],
    [1, 25],
  ];

  const entries = [];
  BASE_DENS.forEach((d) => entries.push({ num: 1, den: d, type: 'base' }));
  DERIVED_PAIRS.forEach(([n, d]) => entries.push({ num: n, den: d, type: 'derived' }));
  entries.forEach((e) => {
    e.value = e.num / e.den;
    e.fracText = e.num + '/' + e.den;
  });

  // 去重（如 1/2 只会来自 base，衍生里不再放 1/n，但防御一下）
  const seen = new Set();
  const unique = entries.filter((e) => {
    const key = e.fracText;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  /** 难度分级：easy=分母2~8, medium=分母9~15, hard=分母≥16或衍生 */
  function difficulty(e) {
    if (e.type === 'derived') return 'hard';
    if (e.den <= 8) return 'easy';
    if (e.den <= 15) return 'medium';
    return 'hard';
  }

  /**
   * 百分数展示：能精确到两位小数则显示精确值（12.5%、6.25%），
   * 否则保留一位小数（14.3%）。返回 { text, approx }。
   */
  function pctText(e) {
    const raw = e.value * 100;
    const two = Math.round(raw * 100) / 100;
    const isExact = Math.abs(raw - two) < 1e-9;
    let num;
    if (isExact) {
      num = String(two);
    } else {
      num = raw.toFixed(1);
    }
    return { text: num + '%', approx: !isExact, exact: isExact };
  }

  function poolByDifficulty(level) {
    if (level === 'all') return unique.slice();
    return unique.filter((e) => difficulty(e) === level);
  }

  return {
    entries: unique,
    difficulty,
    pctText,
    poolByDifficulty,
  };
})();
