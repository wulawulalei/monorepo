import { Badge, type BadgeProps } from 'antd';
import type { ReactNode } from 'react';

export type StatusBadgeStatus = NonNullable<BadgeProps['status']>;

export type StatusBadgeProps = Omit<BadgeProps, 'status' | 'text'> & {
  status: StatusBadgeStatus;
  text?: ReactNode;
};

const defaultStatusText: Record<StatusBadgeStatus, string> = {
  success: '成功',
  processing: '处理中',
  default: '默认',
  error: '错误',
  warning: '警告',
};

export function StatusBadge({ status, text, ...rest }: StatusBadgeProps) {
  return (
    <Badge
      {...rest}
      status={status}
      text={text === undefined ? defaultStatusText[status] : text}
    />
  );
}
