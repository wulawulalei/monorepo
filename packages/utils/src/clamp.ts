/**
 * 将数值限制在指定区间内
 *
 * @param value 需要限制的数值
 * @param min 区间下限
 * @param max 区间上限
 * @returns 限制后的数值
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
