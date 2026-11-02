import type { StorybookConfig } from '@storybook/react-vite';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.jsx'],
  addons: ['@storybook/addon-docs'],
  framework: '@storybook/react-vite',
  core: { disableTelemetry: true },
  async viteFinal(config) {
    // Next.js用のpublic（生成済みStorybookも含む）はコピーしません。
    // コピーすると、ビルドのたびにStorybookが入れ子になります。
    config.publicDir = false;
    config.resolve ??= {};
    config.resolve.alias = { '@': fileURLToPath(new URL('../', import.meta.url)) };
    config.plugins = [...(config.plugins ?? []), tailwindcss(), {
      name: 'storybook-instrument-mock',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source === './InstrumentProvider' && importer?.includes('/components/measurement/')) {
          return fileURLToPath(new URL('../stories/InstrumentMock.jsx', import.meta.url));
        }
      },
    }];
    return config;
  },
};
export default config;
