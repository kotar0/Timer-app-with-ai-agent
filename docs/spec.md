# 仕様

## タスクの作成

- ユーザーはグローバルショートカットキーを押すとタスクを作成できる
- Alfred のようなモーダルウィンドウが開き､コマンド文字列の入力でタスクを作成できる
- "時間 タスク名" の形式でコマンド入力でタスクを作成できる
- 時間は､1s､10m, 1h, 1d の形式で入力できる
- タスクはタイトルと時間を持つ
- タスクは作成時にはスタートされる
- タスクは削除できる
- タスクはスタートできる
- タスクはストップ(ポーズ)できる

## タイマー画面

- タイマー画面を構成するのは､カウントダウンする数字(XX:XX)とタスク名
- アイコンボタンとして､再生(レジューム)､ストップ(ポーズ)､削除の 3 つ
- カウントダウンは､タスクの時間が尽きると停止する
- カウントダウンは､ストップボタンを押した時点の時間から再開する

## 通知機能

- タスクのストップのタイミングで OS の標準機能による通知を送信する
- タスクがストップすると､タイマー画面が 5 秒間点滅する
