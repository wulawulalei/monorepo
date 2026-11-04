import { Badge, Tag, type BadgeProps } from 'antd';
import type { HTMLAttributes, ReactNode } from 'react';

export type StatusBadgeStatus = NonNullable<BadgeProps['status']>;

type StatusBadgeSharedProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  'children' | 'color'
> & {
  color?: BadgeProps['color'];
};

export type StatusBadgeProps = StatusBadgeSharedProps & {
  status: StatusBadgeStatus;
  text?: ReactNode;
  showDot?: boolean;
};

const defaultStatusText: Record<StatusBadgeStatus, string> = {
  success: '成功',
  processing: '处理中',
  default: '默认',
  error: '错误',
  warning: '警告',
};

export function StatusBadge({
  status,
  text,
  showDot = true,
  color,
  ...props
}: StatusBadgeProps) {
  const statusText = text === undefined ? defaultStatusText[status] : text;

  if (!showDot) {
    return (
      <Tag {...props} color={color ?? status}>
        {statusText}
      </Tag>
    );
  }

  return <Badge {...props} color={color} status={status} text={statusText} />;
}
