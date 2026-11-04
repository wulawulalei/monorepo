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

  it.each([
    ['success', 'ant-tag-success'],
    ['processing', 'ant-tag-processing'],
    ['default', 'ant-tag-default'],
    ['error', 'ant-tag-error'],
    ['warning', 'ant-tag-warning'],
  ] as const)('无圆点模式将 %s 状态渲染为对应颜色标签', (status, color) => {
    const { container } = render(
      <StatusBadge status={status} text="状态标签" showDot={false} />,
    );

    expect(screen.getByText('状态标签')).toBeInTheDocument();
    expect(container.querySelector('.ant-badge-status-dot')).toBeNull();
    expect(container.querySelector(`.${color}`)).toBeInTheDocument();
  });

  it('无圆点模式支持自定义颜色与类名', () => {
    const { container } = render(
      <StatusBadge
        status="warning"
        text="待处理"
        showDot={false}
        color="blue"
        className="custom-status"
      />,
    );

    const label = container.querySelector('.custom-status');
    expect(label).toHaveClass('ant-tag-blue');
    expect(label).toHaveTextContent('待处理');
  });
});
