import type { SizeLimitConfig } from 'size-limit';

const external = [
  'antd',
  'antd/*',
  'react',
  'react/*',
  'react-dom',
  'react-dom/*',
];

// React、antd 等 peer 依赖由宿主应用提供，不计入本仓库产物体积。
const config = [
  {
    name: '@xzy18/components',
    path: 'packages/components/es/index.js',
    import: '*',
    ignore: external,
    gzip: true,
  },
  {
    name: '@xzy18/hooks',
    path: 'packages/hooks/es/index.js',
    import: '*',
    ignore: ['react', 'react/*'],
    gzip: true,
  },
  {
    name: '@xzy18/utils',
    path: 'packages/utils/es/index.js',
    import: '*',
    gzip: true,
  },
  {
    name: '@xzy18/material-components',
    path: 'packages/material-components/es/index.js',
    import: '*',
    ignore: external,
    gzip: true,
  },
] satisfies SizeLimitConfig;

export default config;
