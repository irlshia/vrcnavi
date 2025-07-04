# VRCNAVI ヘルプ

## 概要

VRCNAVIは、VRChat関連のBOOTH新着アイテムをデスクトップで簡単にチェック・通知できるアプリケーションです。  
カテゴリやキーワード、特定のショップIDを指定して、あなたの興味に合った新着情報を受け取ることができます。

---

## 主な機能

### 1. 新着アイテムの自動取得・表示

- BOOTHの新着アイテムを自動で取得し、アプリ内で一覧表示します。
- カテゴリ、キーワード、カスタムショップIDごとに新着アイテムをグループ分けして表示します。
- アイテム画像・タイトル・価格・ショップ名・ショップアイコンを確認できます。
- アイテムをクリックすると、BOOTHの商品ページがブラウザで開きます。

### 2. 通知カテゴリの設定

- 「服」「VRChat 3D装飾品」など、よく使うカテゴリを選択できます。
- 設定したカテゴリの新着アイテムのみが通知・表示されます。

### 3. カスタムキーワード通知

- 任意のキーワード（例：「指輪」「しっぽ」など）を追加できます。
- キーワードに一致する新着アイテムが通知・表示されます。
- 複数キーワードは「、」または「,」で区切って入力できます。

### 4. カスタム通知ショップID

- 通知したいBOOTHショップのID（例：「lookvook」）を追加できます。
- 指定したショップの新着商品が自動で取得・表示されます。
- ショップIDはBOOTHのURLの「サブドメイン」部分です。  
  例: `https://lookvook.booth.pm/` → ショップIDは「lookvook」

### 5. 初回起動時のWelcome・初期設定ウィザード

- アプリ初回起動時にWelcome画面が表示されます。
- 続けて、通知カテゴリ・キーワード・ショップIDをまとめて設定できる初期設定ウィザードが表示されます。
- これらの設定は後から「設定」タブでいつでも変更できます。

### 6. 設定画面

- 通知カテゴリのON/OFF切り替え
- カスタムキーワード・カスタムショップIDの追加・削除
- 設定内容は自動で保存されます
- 設定を保存した際は、Boothのキャッシュ（booth_cache.json）も自動的にクリアされ、次回表示時に新しい設定で再取得されます。

### 7. アプリのアップデート確認

- 「VRCNAVIについて」画面から、アプリのバージョン確認やアップデートチェックができます。

### 8. キャッシュと再取得の挙動

- 新着アイテムの取得結果はキャッシュ（booth_cache.json）として保存されます。
- 起動時や画面表示時、キャッシュが存在すればBoothへのアクセスは行われません。
- 「再読み込み」ボタンを押したときのみ、Boothから再取得されキャッシュが更新されます。
- 設定を変更・保存した場合もキャッシュは自動でクリアされます。
- アプリを完全終了（タスクトレイからも終了）した場合、booth_cache.jsonは空になります。

---

## よくある質問

### Q. ショップIDはどこで確認できますか？

A. BOOTHのショップURLの「https://○○○.booth.pm/」の「○○○」部分がショップIDです。

### Q. キーワードやショップIDは複数登録できますか？

A. どちらも「、」または「,」で区切って複数登録できます。

### Q. 設定を間違えた場合はどうすればいいですか？

A. 「設定」タブからいつでも追加・削除・変更が可能です。

### Q. キャッシュが消えるタイミングは？

A. 「再読み込み」ボタンを押したとき、設定を保存したとき、アプリを完全終了したとき（タスクトレイからも終了）にbooth_cache.jsonが空になります。

---

## 注意事項

- 本アプリはBOOTHのWebページ構造変更やCloudflare等の対策により、動作しなくなる場合があります。
- カスタム通知ショップID機能はベータ版です。取得できないショップがある場合があります。

---

## サポート

不具合・要望・質問などはGitHubリポジトリまたは開発者までご連絡ください。 
