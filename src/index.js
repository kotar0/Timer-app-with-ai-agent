const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  dialog,
  nativeImage,
  globalShortcut,
  ipcMain,
} = require("electron");
const path = require("path");

let tray = null;
let mainWindow = null;
let tasks = [];

// 時間文字列をパースする関数
function parseTimeString(timeStr) {
  console.log("時間文字列のパース開始:", timeStr);
  const match = timeStr.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    console.log("時間文字列のパース失敗: 無効な形式");
    return null;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];
  let result;

  switch (unit) {
    case "s":
      result = value;
      break;
    case "m":
      result = value * 60;
      break;
    case "h":
      result = value * 60 * 60;
      break;
    case "d":
      result = value * 60 * 60 * 24;
      break;
    default:
      result = null;
  }

  console.log("時間文字列のパース結果:", result, "秒");
  return result;
}

// コマンド文字列をパースする関数
function parseCommand(command) {
  console.log("コマンドのパース開始:", command);
  const parts = command.trim().split(/\s+/);
  if (parts.length < 2) {
    console.log("コマンドのパース失敗: 不十分な部分");
    return null;
  }

  const timeStr = parts[0];
  const title = parts.slice(1).join(" ");
  console.log("分割結果 - 時間:", timeStr, "タイトル:", title);

  const seconds = parseTimeString(timeStr);
  if (seconds === null) {
    console.log("コマンドのパース失敗: 無効な時間形式");
    return null;
  }

  const result = { title, seconds };
  console.log("コマンドのパース成功:", result);
  return result;
}

// アプリケーションの準備ができたら
app.whenReady().then(() => {
  // Dockアイコンを非表示に（macOSのみ）
  if (process.platform === "darwin") {
    app.dock.hide();
  }

  // グローバルショートカットの登録
  globalShortcut.register("CommandOrControl+Shift+T", () => {
    showNewTimerDialog();
  });

  createWindow();
  createTray();
});

// アプリケーションがアクティブになったとき（macOSのみ）
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// すべてのウィンドウが閉じられたとき
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// アプリケーション終了時
app.on("will-quit", () => {
  // グローバルショートカットの登録解除
  globalShortcut.unregisterAll();
});

async function showNewTimerDialog() {
  console.log("タイマー作成ダイアログを表示します");
  const inputDialog = new BrowserWindow({
    width: 400,
    height: 80,
    parent: mainWindow,
    modal: true,
    show: false,
    frame: false,
    resizable: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const dialogPath = path.join(__dirname, "dialog.html");
  await inputDialog.loadFile(dialogPath);
  inputDialog.show();
  console.log("ダイアログを表示しました");

  // ESCキーでダイアログを閉じる
  inputDialog.webContents.on("before-input-event", (event, input) => {
    if (input.key === "Escape") {
      console.log("ESCキーが押されたためダイアログを閉じます");
      inputDialog.close();
    }
  });

  // タイマー作成イベントの処理
  ipcMain.once("create-new-timer", (event, data) => {
    console.log("create-new-timer イベントを受信:", data);
    const task = parseCommand(data.command);
    if (task) {
      console.log("新しいタスクを作成します:", task);
      tasks.push(task);
      updateTrayMenu();
      mainWindow.webContents.send("start-timer", {
        timerTitle: task.title,
        timerSeconds: task.seconds,
      });
      inputDialog.close();
    } else {
      console.log("タスク作成失敗: 無効なコマンド形式");
      dialog.showMessageBox(inputDialog, {
        type: "error",
        title: "エラー",
        message: "無効な形式です",
        detail: "正しい形式で入力してください（例: 30m 作業）",
      });
    }
  });

  // キャンセル時の処理
  ipcMain.once("cancel-new-timer", () => {
    console.log("タイマー作成をキャンセルしました");
    inputDialog.close();
  });
}

// コマンドライン引数の処理を修正
function handleCommandLineArgs(args) {
  if (args.length < 2) return null;

  const command = args.join(" ");
  return parseCommand(command);
}

function createWindow() {
  // コマンドライン引数の処理
  const args = process.argv.slice(2);
  const task = handleCommandLineArgs(args);

  if (task) {
    tasks.push(task);
  }

  mainWindow = new BrowserWindow({
    width: 180,
    height: 100,
    alwaysOnTop: true,
    resizable: true,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    skipTaskbar: false,
  });

  mainWindow.loadFile(path.join(__dirname, "index.html")).then(() => {
    if (task) {
      mainWindow.webContents.send("start-timer", {
        timerTitle: task.title,
        timerSeconds: task.seconds,
      });
    }
  });
}

function createTaskMenu() {
  const taskMenuItems = tasks.map((task, index) => ({
    label: `${task.title} (${Math.floor(task.seconds / 60)}分)`,
    click: () => {
      mainWindow.webContents.send("start-timer", {
        timerTitle: task.title,
        timerSeconds: task.seconds,
      });
    },
    submenu: [
      {
        label: "削除",
        click: () => {
          tasks.splice(index, 1);
          updateTrayMenu();
          mainWindow.webContents.send("delete-timer");
        },
      },
    ],
  }));

  return [
    {
      label: "新しいタイマー",
      click: () => {
        showNewTimerDialog();
      },
    },
    { type: "separator" },
    ...(tasks.length > 0 ? [...taskMenuItems, { type: "separator" }] : []),
    {
      label: "終了",
      click: () => {
        app.quit();
      },
    },
  ];
}

function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate(createTaskMenu());
  tray.setContextMenu(contextMenu);
}

function createTray() {
  try {
    // macOSの場合はテンプレート画像を使用
    const iconPath =
      process.platform === "darwin"
        ? path.join(__dirname, "iconTemplate.png")
        : path.join(__dirname, "icon.png");

    console.log("Icon path:", iconPath); // デバッグ用

    const icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      console.error("Failed to load icon image");
      // フォールバックアイコンを作成（PNGとして）
      const fallbackIcon = nativeImage.createEmpty();
      const size = process.platform === "darwin" ? 16 : 32;
      fallbackIcon.addRepresentation({
        width: size,
        height: size,
        scaleFactor: process.platform === "darwin" ? 2 : 1,
        buffer: Buffer.from(
          `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size / 2}" cy="${size / 2}" r="${
            size / 2 - 1
          }" stroke="${
            process.platform === "darwin" ? "black" : "white"
          }" stroke-width="1" fill="none"/>
            <line x1="${size / 2}" y1="${size / 2}" x2="${size / 2}" y2="${
            size / 4
          }" stroke="${
            process.platform === "darwin" ? "black" : "white"
          }" stroke-width="1"/>
            <line x1="${size / 2}" y1="${size / 2}" x2="${size * 0.75}" y2="${
            size / 2
          }" stroke="${
            process.platform === "darwin" ? "black" : "white"
          }" stroke-width="1"/>
          </svg>`
        ),
        dataURL: "svg",
      });
      tray = new Tray(fallbackIcon);
    } else {
      tray = new Tray(icon);
    }

    // メニューを作成
    updateTrayMenu();
    tray.setToolTip("タイマー");

    // アイコンのクリックイベント
    tray.on("click", () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
        }
      }
    });
  } catch (error) {
    console.error("Error creating tray:", error);
  }
}

// プログレスバーの更新を処理
ipcMain.on("update-progress", (event, progress) => {
  if (mainWindow) {
    if (progress > 0) {
      mainWindow.setProgressBar(1 - progress);
    } else {
      mainWindow.setProgressBar(-1);
    }
  }
});

// タイマー削除時の処理
ipcMain.on("delete-timer", () => {
  if (mainWindow) {
    mainWindow.setProgressBar(-1);
  }
});
