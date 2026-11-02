import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useBoolean } from '..';

describe('useBoolean', () => {
  it('使用默认初始值并提供布尔状态操作', () => {
    const { result } = renderHook(() => useBoolean());

    expect(result.current.value).toBe(false);

    act(() => result.current.setTrue());
    expect(result.current.value).toBe(true);

    act(() => result.current.setFalse());
    expect(result.current.value).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.value).toBe(true);

    act(() => result.current.setValue(false));
    expect(result.current.value).toBe(false);
  });

  it('支持自定义初始值', () => {
    const { result } = renderHook(() => useBoolean(true));

    expect(result.current.value).toBe(true);
  });
});
