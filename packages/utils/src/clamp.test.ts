import { describe, expect, it } from 'vitest';
import { clamp } from './clamp';

describe('clamp', () => {
  it('返回区间内的原值', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('限制低于下限的数值', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it('限制高于上限的数值', () => {
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
