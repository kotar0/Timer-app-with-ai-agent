const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onStartTimer: (callback) => {
    ipcRenderer.on("start-timer", (event, value) => callback(value));
  },
});
