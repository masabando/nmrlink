import CodeBlockClient from '../components/CodeBlockClient';
import { highlightCode } from '../lib/highlight-code';
import ReferenceTable from '../components/ReferenceTable';
import MathFormula from '../components/MathFormula';

const meta = {
  title: 'Documentation/Parts', tags: ['autodocs'],
  args: { locale: 'ja' },
  argTypes: { locale: { control: 'inline-radio', options: ['ja', 'en'] } },
};
export default meta;
// Next.jsではServer Componentが行う色付けを、Storybookではloaderで行います。
const highlightedCode = async ({ args }) => ({ highlighted: await highlightCode(args.code, args.language) });
export const Code = {
  args: { language: 'js', code: 'import { NMRController } from "nmrlink";\nconst controller = new NMRController();' },
  loaders: [highlightedCode],
  render: (args, { loaded }) => <CodeBlockClient {...args} highlighted={loaded.highlighted} />,
};
export const LongCode = {
  args: { language: 'js', code: 'const settings = { frequencyHz: 402000, pulse1: 21, pulse2: 42, scans: 64, intervalMs: 200 };' },
  loaders: [highlightedCode],
  render: (args, { loaded }) => <div style={{ maxWidth: 360 }}><CodeBlockClient {...args} highlighted={loaded.highlighted} /></div>,
};
export const Table = {
  render: ({ locale }) => <ReferenceTable headings={locale === 'ja' ? ['項目', '説明'] : ['Parameter', 'Description']} rows={[
    ['displayEndMs', locale === 'ja' ? 'FIDの表示終了時刻 [ms]' : 'FID display end [ms]'],
    ['frequencyLimitHz', locale === 'ja' ? 'FFTの表示範囲 [±Hz]' : 'FFT display range [±Hz]'],
  ]} />,
};
export const NarrowTable = {
  render: () => <div style={{ maxWidth: 280 }}><ReferenceTable headings={['Parameter', 'Description', 'Default']} rows={[
    ['frequencyLimitHz', 'FFT frequency display range in hertz', '10000'],
    ['displayEndMs', 'FID display end in milliseconds', '10'],
  ]} /></div>,
};
export const Formula = {
  render: () => <MathFormula block tex={String.raw`S(\tau) = A - B\exp\left(-\frac{\tau}{T_1}\right)`} />,
};
export const NarrowFormula = {
  render: () => <div style={{ maxWidth: 280 }}><MathFormula block tex={String.raw`S(2\tau) = A\exp\left(-\frac{2\tau}{T_2}\right)`} /></div>,
};
