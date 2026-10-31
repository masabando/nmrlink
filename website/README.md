# NMRLink website

日英のドキュメントです。本文は `app/(ja)/` と `app/en/` の各 `page.tsx`、共通の画面部品は `components/` で編集します。

```sh
npm install
npm run dev
```

開発プレビューは `http://localhost:3000/`。リポジトリのルートからは `npm run docs:dev` でも起動できます。

## 静的出力と検索

```sh
npm run build
npm start
```

`out/` に静的サイトとPagefind索引を生成します。完成した出力を `http://localhost:4175/nmrlink/` で確認できます。検索のサーバーは不要です。

通常のビルドはGitHub Pagesの `/nmrlink/` 配下を想定しています。別の場所へ配信する場合は、例えば `NEXT_PUBLIC_BASE_PATH="" npm run build` のようにビルド時に指定します。

検索対象は `data-pagefind-body` を付けた本文です。メニュー・フッター・操作用デモは除外します。日英はHTMLの `lang` 属性で分かれ、見出しのIDから該当する節への検索結果を作ります。

開発中の検索は直近のビルドの索引を使います。初回の `npm run dev` は索引がなければ自動でビルドします。本文を変更して検索にも反映するときは `npm run build` を実行してください。生成した `public/pagefind/` はGitに登録しません。

検証済みの既存Web UIと必要なブラウザ用ライブラリも、公開用の静的出力に含めています。コピー対象は `scripts/build-site.mjs` に明記しています。

## 標準測定のWeb UI

開発時は `/ui/`、静的出力は `/nmrlink/ui/` です。日英で同じページを使い、`?lang=en` または画面内の選択欄で言語を切り替えます。

- `app/(measurement)/ui/`：文書とは別の測定用レイアウトと入口
- `components/measurement/InstrumentProvider.jsx`：装置接続・操作状態・結果・言語の管理
- `StandardMeasurement.jsx`：測定条件・解析条件・読み込みと保存の操作
- `MeasurementGraphs.jsx`：ライブラリによる描画と画像保存
- `messages.js`：日英の短い表示文言
- `model.js`：初期値・表示条件の検証・CSV/SVGの保存用処理

通信・測定時間・解析・描画・測定JSONの読み書きはリポジトリ内のライブラリを利用します。周波数調整は `/ui/frequency/`、パルス校正は `/ui/pulse/`、T1測定は `/ui/t1/`、T2測定は `/ui/t2/` です。この5画面はNext.jsのクライアント遷移で接続を共有し、`useSessionField` で各画面の入力・結果を保持します。測定・走査・読み込み中は画面選択を止めます。文書と使い方は別タブで開きます。

`npm test` で5画面の初期条件・解析と保存データ・翻訳キー、および模擬シリアルで接続を共有する動作を確認できます。実機での接続・Single/Double測定・周波数走査・パルス校正・T1/T2測定と接続したままの切り替えは別途確認してください。

## 公開処理と旧URL

GitHub Pagesのワークフローは、ルートとwebsiteそれぞれで `npm ci` を実行し、テスト・Lint・ビルド・出力検査を通した `website/out/` を配信します。ルートの `npm run docs:build` と `npm run docs:check` もこのサイトを対象にします。ローカルでのビルド・検査では公開されません。

旧URLの対応表は `lib/legacy-redirects.mjs` です。`scripts/legacy-redirects.mjs` が、旧マニュアルと旧プレビューの場所に転送専用HTMLを生成します。旧 `#section-N` は表のsectionsの順序で新しい見出しへ対応し、クエリ文字列は維持します。未登録の名前付きハッシュもそのまま引き継ぎます。JavaScriptが無効な場合はページ単位で転送し、移動先リンクも表示します。転送の確認は `npm run build` 後に `npm start` の静的プレビューで行います。開発サーバーではこの生成HTMLを配信しません。

トップページはURLが同じなので転送HTMLを作りません。`LegacyHomeAnchors` が同じ対応表から旧見出しのリンク先を新しい節に追加します。見出しを移動するときは、対応表の転送先も確認してください。

```sh
npm test
npm run lint
npm run build
npm run check
```

`check` は出力内のリンク・モジュール参照・転送先と見出し・検索索引を検査し、非公開設定やサーバーのソースが混入していないか確認します。実機用の最小サンプル・従来版Web UI・Python原本は、旧マニュアルとは別に残しています。
