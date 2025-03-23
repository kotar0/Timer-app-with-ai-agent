let timerInterval;
let currentSeconds = 0;
let initialSeconds = 0;
let isRunning = false;
let currentTitle = "";

const titleElement = document.getElementById("title");
const displayElement = document.getElementById("display");
const playButton = document.getElementById("playButton");
const pauseButton = document.getElementById("pauseButton");
const resetButton = document.getElementById("resetButton");
const deleteButton = document.getElementById("deleteButton");

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

function updateDisplay() {
  const timeString = formatTime(currentSeconds);
  console.log("画面表示を更新:", {
    timeString,
    title: currentTitle,
    progress: initialSeconds > 0 ? currentSeconds / initialSeconds : 0,
  });

  displayElement.textContent = timeString;
  titleElement.textContent = currentTitle;

  // プログレスバーの更新
  if (initialSeconds > 0) {
    const progress = currentSeconds / initialSeconds;
    window.electronAPI.updateProgress(progress);
  }
}

function startTimer() {
  console.log("startTimer関数が呼び出されました");
  console.log("現在の状態:", {
    isRunning,
    currentSeconds,
    currentTitle,
    initialSeconds,
  });

  if (!isRunning && currentSeconds > 0) {
    console.log("タイマーを開始します");
    isRunning = true;
    playButton.style.display = "none";
    pauseButton.style.display = "inline-block";

    timerInterval = setInterval(() => {
      currentSeconds--;
      console.log("カウントダウン:", {
        currentSeconds,
        currentTitle,
        progress: currentSeconds / initialSeconds,
      });
      updateDisplay();

      if (currentSeconds <= 0) {
        console.log("タイマーが終了しました");
        stopTimer();
        onTimerComplete();
      }
    }, 1000);
  } else {
    console.log("タイマーを開始できません:", {
      isRunning,
      currentSeconds,
      reason: isRunning ? "既に実行中" : "秒数が0以下",
    });
  }
}

function stopTimer() {
  console.log("stopTimer関数が呼び出されました");
  if (isRunning) {
    console.log("タイマーを停止します");
    isRunning = false;
    clearInterval(timerInterval);
    playButton.style.display = "inline-block";
    pauseButton.style.display = "none";
  } else {
    console.log("タイマーは既に停止しています");
  }
}

function resetTimer() {
  stopTimer();
  currentSeconds = initialSeconds;
  updateDisplay();
}

function deleteTimer() {
  stopTimer();
  currentSeconds = 0;
  initialSeconds = 0;
  currentTitle = "";
  titleElement.textContent = "";
  updateDisplay();
  window.electronAPI.deleteTimer();
}

function addMinute() {
  currentSeconds += 60;
  updateDisplay();
}

function addFiveMinutes() {
  currentSeconds += 300;
  updateDisplay();
}

// イベントリスナーを設定
playButton.addEventListener("click", () => {
  console.log("再生ボタンがクリックされました");
  startTimer();
});

pauseButton.addEventListener("click", () => {
  console.log("一時停止ボタンがクリックされました");
  stopTimer();
});

resetButton.addEventListener("click", () => {
  console.log("リセットボタンがクリックされました");
  resetTimer();
});

deleteButton.addEventListener("click", () => {
  console.log("削除ボタンがクリックされました");
  deleteTimer();
});

// メインプロセスからのタイマー開始メッセージを受信
window.electronAPI.onStartTimer((event, { timerTitle, timerSeconds }) => {
  console.log("タイマー開始イベントを受信:", { timerTitle, timerSeconds });
  stopTimer();
  currentTitle = timerTitle;
  currentSeconds = timerSeconds;
  initialSeconds = timerSeconds;
  console.log("タイマーの状態を設定:", {
    currentTitle,
    currentSeconds,
    initialSeconds,
  });
  titleElement.textContent = currentTitle;
  updateDisplay();
  startTimer();
});

// グローバルにエクスポート（HTML側で使用）
window.startTimer = startTimer;
window.stopTimer = stopTimer;
window.resetTimer = resetTimer;
window.deleteTimer = deleteTimer;

// 点滅エフェクトの制御
window.electronAPI.onStartBlink(() => {
  console.log("点滅エフェクトを開始します");
  const container = document.querySelector(".timer-container");
  container.classList.add("blink");

  // 5秒後に点滅を停止
  setTimeout(() => {
    console.log("点滅エフェクトを停止します");
    container.classList.remove("blink");
  }, 5000);
});

// タイマー終了時の処理
function onTimerComplete() {
  console.log("タイマーが完了しました:", currentTitle);
  window.electronAPI.timerComplete(currentTitle);
}
