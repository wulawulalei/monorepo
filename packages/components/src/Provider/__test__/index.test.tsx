import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AntdProvider } from '..';
import { Button } from '../../Button';

describe('AntdProvider', () => {
  it('渲染子节点并应用默认类名前缀', () => {
    render(
      <AntdProvider>
        <Button>确认操作</Button>
      </AntdProvider>,
    );

    expect(screen.getByRole('button', { name: '确认操作' })).toHaveClass(
      'df-btn',
    );
  });

  it('支持自定义类名前缀', () => {
    render(
      <AntdProvider prefixCls="custom">
        <Button>确认操作</Button>
      </AntdProvider>,
    );

    expect(screen.getByRole('button', { name: '确认操作' })).toHaveClass(
      'custom-btn',
    );
  });
});
