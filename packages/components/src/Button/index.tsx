import { Button as AntdButton, ButtonProps as AntdButtonProps } from 'antd';
import React from 'react';

export type ButtonProps = AntdButtonProps & {
  success?: boolean;
};

export const Button: React.FC<ButtonProps> = ({ success, type, ...rest }) => {
  const mergedType = success ? 'primary' : type;
  return <AntdButton type={mergedType} {...rest} />;
};
