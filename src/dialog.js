const form = document.getElementById("commandForm");
const input = document.getElementById("command");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const command = input.value.trim();
  console.log("フォーム送信イベント発生。入力値:", command);
  if (command) {
    console.log("createNewTimer イベントを送信:", command);
    window.electronAPI.createNewTimer(command);
  } else {
    console.log("空の入力のため、イベントを送信しません");
  }
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    console.log("ESCキーが押されました。キャンセルイベントを送信します");
    window.electronAPI.cancelNewTimer();
  }
});
