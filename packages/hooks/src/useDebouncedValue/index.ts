import { useEffect, useState } from "react";

/**
 * 返回延迟更新后的值
 *
 * 当 value 在 delay 时间内持续变化时，会重新开始计时。
 */
export function useDebouncedValue<T>(value: T, delay = 200): T {
  /** 对外暴露的防抖值 */
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    /** 延迟更新防抖值 */
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
