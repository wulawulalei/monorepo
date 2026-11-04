import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AntdProvider, Button, StatusBadge, clamp, cx, useBoolean } from '..';

describe('统一入口', () => {
  it('导出所有运行时能力', () => {
    expect(Button).toBeTypeOf('function');
    expect(AntdProvider).toBeTypeOf('function');
    expect(StatusBadge).toBeTypeOf('function');
    expect(useBoolean).toBeTypeOf('function');
    expect(clamp(2, 0, 1)).toBe(1);
    expect(cx('a', false, 'b')).toBe('a b');
  });

  it('支持服务端渲染', () => {
    const html = renderToString(
      <AntdProvider>
        <Button>服务端按钮</Button>
        <StatusBadge status="processing" text="同步中" />
      </AntdProvider>,
    );

    expect(html).toContain('服务端按钮');
    expect(html).toContain('同步中');
  });
});
