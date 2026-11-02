import type { Preview } from '@storybook/react-vite';
import '../app/globals.css';
const preview: Preview = {
  parameters: { options: { showPanel: true }, layout: 'padded', controls: { expanded: true } },
};
export default preview;
