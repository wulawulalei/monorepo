import { render } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';
import { AntdProvider } from './Provider';

describe('组件可访问性', () => {
  it('基础按钮通过 axe 扫描', async () => {
    const { container } = render(
      <AntdProvider>
        <Button>确认操作</Button>
      </AntdProvider>,
    );

    const result = await axe.run(container, {
      rules: {
        // 颜色对比需要在真实浏览器中计算，jsdom 无法可靠模拟。
        'color-contrast': { enabled: false },
      },
    });
    expect(result.violations).toEqual([]);
  });
});
