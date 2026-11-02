import { useState } from 'react';
import NumberField from '../components/measurement/NumberField';

function Preview({ initialValue, ...args }) {
  const [value, setValue] = useState(initialValue);
  return <form style={{ maxWidth: 400 }} onSubmit={event => event.preventDefault()}>
    <NumberField {...args} value={value} onChange={(_, next) => setValue(next)} />
    <button className="btn mt-4" type="submit">Check input / 入力を確認</button>
  </form>;
}
const meta = {
  title: 'Web UI/Number field', component: Preview, tags: ['autodocs'],
  render: args => <Preview key={String(args.initialValue)} {...args} />,
  args: { label: '積算回数', name: 'scans', initialValue: '64', min: 1, max: 32767, step: 1 },
  parameters: { docs: { description: { component: '本番のNumberFieldを使っています。確認ボタンではブラウザ標準の入力検証が働き、表示言語はブラウザ設定に従います。 / Uses the production NumberField and native browser validation.' } } },
};
export default meta;
export const Default = {};
export const English = { args: { label: 'Scans' } };
export const Empty = { args: { initialValue: '' } };
export const OutOfRange = { args: { initialValue: '0' } };
export const Decimal = { args: { label: 'FFT開始 [ms]', name: 'startMs', initialValue: '1.5', min: 0, max: 40, step: 0.1 } };
