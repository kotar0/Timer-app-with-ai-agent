const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  dialog,
  nativeImage,
  globalShortcut,
  ipcMain,
  Notification,
} = require("electron");
const path = require("path");

let tray = null;
let mainWindow = null;
let tasks = [];

// Parse time string function
function parseTimeString(timeStr) {
  console.log("Starting time string parse:", timeStr);
  const match = timeStr.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    console.log("Time string parse failed: Invalid format");
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

  console.log("Time string parse result:", result, "seconds");
  return result;
}

// Parse command string function
function parseCommand(command) {
  console.log("Starting command parse:", command);
  const parts = command.trim().split(/\s+/);
  if (parts.length < 2) {
    console.log("Command parse failed: Insufficient parts");
    return null;
  }

  const timeStr = parts[0];
  const title = parts.slice(1).join(" ");
  console.log("Split result - Time:", timeStr, "Title:", title);

  const seconds = parseTimeString(timeStr);
  if (seconds === null) {
    console.log("Command parse failed: Invalid time format");
    return null;
  }

  const result = { title, seconds };
  console.log("Command parse successful:", result);
  return result;
}

// When application is ready
app.whenReady().then(() => {
  // Hide Dock icon (macOS only)
  if (process.platform === "darwin") {
    app.dock.hide();
  }

  // Register global shortcut
  globalShortcut.register("CommandOrControl+Shift+T", () => {
    showNewTimerDialog();
  });

  createWindow();
  createTray();
});

// Application is activated (macOS only)
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// When all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Application exit
app.on("will-quit", () => {
  // Unregister global shortcut
  globalShortcut.unregisterAll();
});

async function showNewTimerDialog() {
  console.log("Displaying timer creation dialog");
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
  console.log("Dialog displayed");

  // Close dialog with ESC key
  inputDialog.webContents.on("before-input-event", (event, input) => {
    if (input.key === "Escape") {
      console.log("ESC key pressed, closing dialog");
      inputDialog.close();
    }
  });

  // Handle timer creation event
  ipcMain.once("create-new-timer", (event, data) => {
    console.log("Received create-new-timer event:", data);
    const task = parseCommand(data.command);
    if (task) {
      console.log("Creating new task:", task);
      tasks.push(task);
      updateTrayMenu();
      mainWindow.webContents.send("start-timer", {
        timerTitle: task.title,
        timerSeconds: task.seconds,
      });
      inputDialog.close();
    } else {
      console.log("Task creation failed: Invalid command format");
      dialog.showMessageBox(inputDialog, {
        type: "error",
        title: "Error",
        message: "Invalid format",
        detail: "Please enter in the correct format (e.g., 30m work)",
      });
    }
  });

  // Handle cancellation
  const cancelHandler = () => {
    console.log("Timer creation cancelled");
    inputDialog.close();
    ipcMain.removeListener("cancel-timer", cancelHandler);
  };
  ipcMain.on("cancel-timer", cancelHandler);

  // Clean up when dialog is closed
  inputDialog.on("closed", () => {
    ipcMain.removeListener("cancel-timer", cancelHandler);
  });
}

// Command line argument processing
function handleCommandLineArgs(args) {
  if (args.length < 2) return null;

  const command = args.join(" ");
  return parseCommand(command);
}

function createWindow() {
  // Command line argument processing
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
    label: `${task.title} (${Math.floor(task.seconds / 60)} minutes)`,
    click: () => {
      mainWindow.webContents.send("start-timer", {
        timerTitle: task.title,
        timerSeconds: task.seconds,
      });
    },
    submenu: [
      {
        label: "Delete",
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
      label: "New Timer",
      click: () => {
        showNewTimerDialog();
      },
    },
    { type: "separator" },
    ...(tasks.length > 0 ? [...taskMenuItems, { type: "separator" }] : []),
    {
      label: "Exit",
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
    // Use template image for macOS
    const iconPath =
      process.platform === "darwin"
        ? path.join(__dirname, "iconTemplate.png")
        : path.join(__dirname, "icon.png");

    console.log("Icon path:", iconPath); // Debug info

    const icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      console.error("Failed to load icon image");
      // Create fallback icon (as PNG)
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

    // Create menu
    updateTrayMenu();
    tray.setToolTip("Timer");

    // Icon click event
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

// Progress bar update processing
ipcMain.on("update-progress", (event, progress) => {
  if (mainWindow) {
    if (progress > 0) {
      mainWindow.setProgressBar(1 - progress);
    } else {
      mainWindow.setProgressBar(-1);
    }
  }
});

// Timer deletion processing
ipcMain.on("delete-timer", () => {
  if (mainWindow) {
    mainWindow.setProgressBar(-1);
  }
});

function showNotification(title) {
  const notification = new Notification({
    title: "タイマー終了",
    body: `${title}の時間が終了しました`,
    silent: false,
  });
  notification.show();
}

// タイマー終了時のイベントハンドラ
ipcMain.on("timer-complete", (event, { title }) => {
  showNotification(title);
  // メインウィンドウに点滅エフェクトを要求
  event.reply("start-blink");
});
