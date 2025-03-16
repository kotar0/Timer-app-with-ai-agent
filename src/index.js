const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  dialog,
  nativeImage,
} = require("electron");
const path = require("path");

let tray = null;
let mainWindow = null;
let tasks = [];

// アプリケーションの準備ができたら
app.whenReady().then(() => {
  // Dockアイコンを非表示に（macOSのみ）
  if (process.platform === "darwin") {
    app.dock.hide();
  }

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

function createWindow() {
  // Alfred などから渡された引数を解析（例: --title "作業" --time 300）
  const args = process.argv.slice(2);
  let timerTitle = "";
  let timerSeconds = 0;

  args.forEach((arg, index) => {
    if (arg === "--title" && args[index + 1]) {
      timerTitle = args[index + 1];
    }
    if (arg === "--time" && args[index + 1]) {
      timerSeconds = parseInt(args[index + 1], 10);
    }
  });

  mainWindow = new BrowserWindow({
    width: 300,
    height: 200,
    alwaysOnTop: true,
    resizable: true,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
    skipTaskbar: true, // タスクバーに表示しない
  });

  mainWindow.loadFile(path.join(__dirname, "index.html")).then(() => {
    // 引数をレンダラープロセスに送信
    mainWindow.webContents.send("start-timer", { timerTitle, timerSeconds });
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
  }));

  return [
    {
      label: "新しいタイマー",
      click: async () => {
        // タイトル入力用のプロンプトを表示
        const titlePrompt = await mainWindow.webContents.executeJavaScript(`
          window.prompt("タスク名を入力してください", "");
        `);

        if (titlePrompt && titlePrompt.trim()) {
          // 時間入力用のプロンプトを表示
          const timePrompt = await mainWindow.webContents.executeJavaScript(`
            window.prompt("時間を分単位で入力してください（例: 5）", "5");
          `);

          if (timePrompt) {
            const minutes = parseInt(timePrompt, 10);
            if (!isNaN(minutes) && minutes > 0) {
              const task = {
                title: titlePrompt.trim(),
                seconds: minutes * 60,
              };
              tasks.push(task);
              updateTrayMenu();
              mainWindow.webContents.send("start-timer", {
                timerTitle: task.title,
                timerSeconds: task.seconds,
              });
            }
          }
        }
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
