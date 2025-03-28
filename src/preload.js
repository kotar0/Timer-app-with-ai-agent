const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onStartTimer: (callback) =>
    ipcRenderer.on("start-timer", (_event, data) => {
      console.log("preload: start-timerイベントを受信:", data);
      callback(_event, data);
    }),
  updateProgress: (progress) => ipcRenderer.send("update-progress", progress),
  deleteTimer: () => ipcRenderer.send("delete-timer"),
  createNewTimer: (command) =>
    ipcRenderer.send("create-new-timer", { command }),
  cancelNewTimer: () => ipcRenderer.send("cancel-new-timer"),
  onStartBlink: (callback) =>
    ipcRenderer.on("start-blink", (_event) => {
      console.log("preload: start-blinkイベントを受信");
      callback();
    }),
  timerComplete: (title) => ipcRenderer.send("timer-complete", { title }),
});
