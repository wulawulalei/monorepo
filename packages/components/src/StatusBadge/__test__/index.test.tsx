import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '..';

describe('StatusBadge', () => {
  it('使用默认文案渲染状态', () => {
    const { container } = render(<StatusBadge status="success" />);

    expect(screen.getByText('成功')).toBeInTheDocument();
    expect(
      container.querySelector('.ant-badge-status-success'),
    ).toBeInTheDocument();
  });

  it('支持自定义文案', () => {
    const { container } = render(
      <StatusBadge status="processing" text="同步中" />,
    );

    expect(screen.getByText('同步中')).toBeInTheDocument();
    expect(
      container.querySelector('.ant-badge-status-processing'),
    ).toBeInTheDocument();
  });

  it('允许通过空字符串隐藏默认文案', () => {
    const { container } = render(<StatusBadge status="error" text="" />);

    expect(
      container.querySelector('.ant-badge-status-error'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('.ant-badge-status-text'),
    ).not.toBeInTheDocument();
  });
});
