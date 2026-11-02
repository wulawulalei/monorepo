import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '.';

describe('Button', () => {
  it('渲染内容并响应点击', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>提交表单</Button>);

    await user.click(screen.getByRole('button', { name: '提交表单' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('success 状态使用主按钮样式', () => {
    render(<Button success>保存成功</Button>);

    expect(screen.getByRole('button', { name: '保存成功' })).toHaveClass(
      'ant-btn-primary',
    );
  });

  it('普通状态保留传入的按钮类型', () => {
    render(<Button type="dashed">虚线按钮</Button>);

    expect(screen.getByRole('button', { name: '虚线按钮' })).toHaveClass(
      'ant-btn-dashed',
    );
  });
});
