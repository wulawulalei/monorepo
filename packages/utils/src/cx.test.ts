import { describe, expect, it } from 'vitest';
import { cx } from './cx';

describe('cx', () => {
  it('拼接有效类名', () => {
    expect(cx('button', false, 'button--primary', null, undefined)).toBe(
      'button button--primary',
    );
  });

  it('没有有效类名时返回空字符串', () => {
    expect(cx(false, null, undefined)).toBe('');
  });
});
