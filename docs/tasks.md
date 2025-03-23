## タスク 0323

- [x] バグの解消

  - タイマー作成インプットで ESC を押した時下記のエラーが発生

  ```
  Uncaught Exception:
     TypeError: Object has been destroyed
     at IpcMainImpl.<anonymous> (/Applications/timer.app/Contents/Resources/app.asar/src/index.js:169:17)
     at Object.onceWrapper (node:events:633:26)
     at IpcMainImpl.emit (node:events:530:35)
     at WebContents.<anonymous> (node:electron/js2c/browser_init:2:88862)
     at WebContents.emit (node:events:518:28)
  ```

  - タイマー作成時に､最初の時間分秒指定の文字列を入力せずに確定をすると､その後正しいフォーマットの入力を行ってもタイマーが作成されない

## タスク 0324

- [ ] 通知機能の実装(spec.md 参照)
