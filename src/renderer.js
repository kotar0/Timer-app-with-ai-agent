const { ipcRenderer } = require("electron");

let timer;
let secondsRemaining = 0;
let currentTitle = "";

const timerElement = document.getElementById("timer");
const titleElement = document.getElementById("title");
const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const resetButton = document.getElementById("resetButton");

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

function updateDisplay() {
  document.getElementById("display").innerText = formatTime(secondsRemaining);
  document.getElementById("title").innerText = currentTitle;
  timerElement.textContent = formatTime(secondsRemaining);
  titleElement.textContent = currentTitle;
}

function startTimer() {
  if (timer) return;

  if (secondsRemaining <= 0) return;

  timer = setInterval(() => {
    if (secondsRemaining > 0) {
      secondsRemaining--;
      updateDisplay();
    } else {
      clearInterval(timer);
      timer = null;
      new Notification("タイマー終了", {
        body: `"${currentTitle}" のカウントダウンが終了しました`,
      });
      updateDisplay();
    }
  }, 1000);

  updateDisplay();
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    updateDisplay();
  }
}

function resetTimer() {
  stopTimer();
  secondsRemaining = 0;
  updateDisplay();
}

function addMinute() {
  secondsRemaining += 60;
  updateDisplay();
}

function addFiveMinutes() {
  secondsRemaining += 300;
  updateDisplay();
}

// Alfred などからの起動で自動開始する場合のリスナー
window.electronAPI.onStartTimer(({ timerTitle, timerSeconds }) => {
  if (timerTitle) {
    currentTitle = timerTitle;
  }
  if (timerSeconds > 0) {
    secondsRemaining = timerSeconds;
    startTimer();
  }
  updateDisplay();
});

// イベントリスナーを設定
startButton.addEventListener("click", startTimer);
pauseButton.addEventListener("click", stopTimer);
resetButton.addEventListener("click", resetTimer);

// メインプロセスからのタイマー開始メッセージを受信
ipcRenderer.on("start-timer", (event, data) => {
  if (data.timerTitle) {
    currentTitle = data.timerTitle;
  }
  if (data.timerSeconds > 0) {
    secondsRemaining = data.timerSeconds;
    startTimer();
  }
  updateDisplay();
});
