import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from '..';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('延迟更新值', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 200),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'b' });
    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(199));
    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('b');
  });

  it('值持续变化时重新计时', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: 1 } },
    );

    rerender({ value: 2 });
    act(() => vi.advanceTimersByTime(80));

    rerender({ value: 3 });
    act(() => vi.advanceTimersByTime(99));
    expect(result.current).toBe(1);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(3);
  });

  it('卸载时清理定时器', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { rerender, unmount } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: 1 } },
    );

    rerender({ value: 2 });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
