import { theme as antdTheme, ConfigProvider, ThemeConfig } from 'antd';
import { ReactNode } from 'react';

export type AntdProviderProps = {
  children: ReactNode;
  theme?: ThemeConfig;
  prefixCls?: string;
};

export function AntdProvider({
  children,
  theme,
  prefixCls = 'df',
}: AntdProviderProps) {
  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#36aafd',
        },
        ...theme,
      }}
      prefixCls={prefixCls}
    >
      {children}
    </ConfigProvider>
  );
}
