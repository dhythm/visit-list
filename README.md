# 訪問リスト

飲食の卸・設備の営業が、今日回る店を市区町村と業種で決めるためのサンプルです。アカウントはありません。表ではなく、店ごとのカードで回る順番を決めます。

公開予定の URL は [https://dhythm.github.io/visit-list/](https://dhythm.github.io/visit-list/) です。`main` への push で GitHub Actions が GitHub Pages にデプロイします。

## ローカルで動かす

Node.js 22 と pnpm 10 を使います。

```bash
pnpm install
pnpm dev
```

表示された URL をブラウザで開きます。本番と同じベースパス `/visit-list/` で確認する場合は次です。

```bash
pnpm build
pnpm preview
```

## 検索のしくみ

市区町村は、入力した文字列をそのまま全国検索には使いません。候補から選んだ地名の中心だけを使います。

1. 市区町村欄の入力を `GET https://api.openpoiapi.com/v1/suggest?q=...` に渡します。
2. 応答の `vocabulary` から `type` が `place` で、市区町村（`city`）があるものを候補にします。`/v1/suggest` に `vocabulary` というクエリパラメータはありません。語彙は応答の中に入っています。
3. 選んだ候補の `center` は `[経度, 緯度]` です。これを `GET https://api.openpoiapi.com/v1/search` に渡します。
   - `center`: `経度,緯度`（経度が先）
   - `q`: 業種キーワード（ラーメン、カフェなど）
   - `radius`: 半径（メートル）
4. `center` が無いときは検索ボタンを止め、「市区町村を候補から選んでください」と出します。全国検索はせず、位置の定まらない一覧も出しません。

API キーは不要です。商用利用はできます。画面に出すときは出典の表示が必要です。

## ブラウザに残すもの

訪問チェックとメモはブラウザの localStorage に保存します。施設を保存するときは `licenses` と `attributions` を配列のまま一緒に残します。

CSV は、いま画面に出ている店について、施設名・業種・住所・市区町村・地図リンク・訪問済み・メモを書き出します。

## 出典

フッターから [OpenPOI API の出典・ライセンス](https://openpoiapi.com/attribution.html) へリンクしています。ライセンスは提供元ごとに異なります。保存したレコードの `licenses` と `attributions` は、後から出典を示すためのものです。

## データの制約

- カテゴリの半分以上が `unknown` です。
- 閉業した施設が残ることがあります。
- 位置がずれることがあります。
- 観光案内には使いません。

## MCP

OpenPOI API は MCP サーバーを公開しています。このアプリには MCP クライアントを入れていません。エージェントから使うときの接続先は次です。

- エンドポイント: [https://api.openpoiapi.com/mcp](https://api.openpoiapi.com/mcp)
- ツール: `search_facilities`（`GET /v1/search` と同じ検索）、`dataset_info`（データセットの概要と出典）

## 技術

Vite、React、TypeScript、pnpm。Tailwind は使っていません。GitHub Pages はプロジェクトページとして `/visit-list/` をベースに、`public/404.html` で SPA のフォールバックをします。Pages の有効化はワークフローの Setup Pages（`actions/configure-pages` の `enablement: true`）で行います。
