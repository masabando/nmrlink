import { GraphPreview } from './GraphPreview';

const meta = {
  title: 'Graphs',
  component: GraphPreview,
  tags: ['autodocs'],
  args: { kind: 'record', scenario: 'normal', locale: 'ja', width: 720, data1: '#176caa', data2: '#b34e25', fft: '#176caa' },
  argTypes: {
    kind: { control: 'select', options: ['record', 'frequency', 'pulse', 't1', 't2'] },
    scenario: { control: 'select', options: ['normal', 'noisy', 'zero'] },
    locale: { control: 'inline-radio', options: ['ja', 'en'] },
    width: { control: { type: 'range', min: 280, max: 1200, step: 20 } },
    data1: { control: 'color', description: 'FID Data 1 only' },
    data2: { control: 'color', description: 'FID Data 2 only' },
    fft: { control: 'color', description: 'FFT only' },
  },
  parameters: { docs: { description: { component: '実機とは通信しません。ライブラリの公開グラフAPIを使い、固定した模擬データで表示を確認します。ゼロ信号では近似線を描きません。色の指定はFID・FFTだけに適用されます。コード例のGraphPreviewはStorybook専用のReactアダプターで、nmrlinkの公開APIではありません。自作UI用コードはドキュメントの「グラフを表示する」を参照してください。 / GraphPreview is a Storybook-only adapter, not an nmrlink API. For application code, see the Display graphs guide.' } } },
};
export default meta;

export const FidAndFft = {};
export const NoisyFidAndFft = { args: { scenario: 'noisy' } };
export const ZeroSignal = { args: { scenario: 'zero' } };
export const English = { args: { locale: 'en' } };
export const MobileWidth = { args: { width: 320 } };
export const CustomColors = { args: { data1: '#7950f2', data2: '#087f5b', fft: '#c2255c' } };
export const Frequency = { args: { kind: 'frequency' } };
export const Pulse = { args: { kind: 'pulse' } };
export const T1 = { args: { kind: 't1' } };
export const T2 = { args: { kind: 't2' } };
export const NoisyPulse = { args: { kind: 'pulse', scenario: 'noisy' } };
export const ZeroT2 = { args: { kind: 't2', scenario: 'zero' } };
