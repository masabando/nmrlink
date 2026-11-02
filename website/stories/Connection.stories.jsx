import ConnectionPanel from '../components/measurement/ConnectionPanel';
import { InstrumentMock } from './InstrumentMock';

function Preview(args) {
  return <div style={{ maxWidth: 480 }}>
    <p className="mb-4 text-sm">{args.locale === 'ja' ? '模擬接続です。実機とは通信しません。' : 'Simulated connection. No hardware communication.'}</p>
    <InstrumentMock key={JSON.stringify(args)} {...args}><ConnectionPanel /></InstrumentMock>
  </div>;
}
const meta = {
  title: 'Web UI/Connection', component: Preview, tags: ['autodocs'],
  args: { locale: 'ja', connection: 'disconnected', supported: true, busy: false, activity: false },
  argTypes: {
    locale: { control: 'inline-radio', options: ['ja', 'en'] },
    connection: { control: 'select', options: ['disconnected', 'connected', 'connecting'] },
  },
  parameters: { docs: { description: { component: '本番と同じConnectionPanelを使い、依存する接続状態だけをStorybook専用の模擬処理に置き換えています。 / The production connection panel uses a Storybook-only mock. No serial access.' } } },
};
export default meta;
export const Disconnected = {};
export const Connected = { args: { connection: 'connected' } };
export const Measuring = { args: { connection: 'connected', busy: true } };
export const Loading = { args: { connection: 'connected', activity: true } };
export const UnsupportedBrowser = { args: { supported: false } };
export const English = { args: { locale: 'en' } };
