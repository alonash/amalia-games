/* =========================================================
   פיצוץ של כיף – 30 שניות של בלונים
   ========================================================= */
(function () {
  "use strict";

  var ROUND_SECONDS = 30;

  /* פלטת הבלונים – בכל פעם נשלף צבע אחר, לעולם לא פעמיים ברצף */
  var COLORS = [
    "#f291a9", // ורוד
    "#7ec6e0", // תכלת
    "#7fcfa4", // מנטה
    "#f3c163", // זהב
    "#bda7e8", // לילך
    "#f7a476", // אפרסק
    "#6fcfcf", // טורקיז
    "#e8879e" // ורוד עמוק
  ];
  var lastColor = null;

  /* סוגי בלונים: הסתברות, ניקוד, מהירות עלייה, סימן מזהה */
  var TYPES = [
    { cls: "balloon--slow", points: 10, speed: [7.5, 9.5], weight: 62, face: "" },
    { cls: "balloon--fast", points: 20, speed: [4.2, 5.4], weight: 26, face: "⚡" },
    { cls: "balloon--bonus", points: 50, speed: [3.4, 4.2], weight: 12, face: "⭐" }
  ];

  var arena = document.getElementById("arena");
  var scoreEl = document.getElementById("score");
  var timerEl = document.getElementById("timer");
  var timerBox = timerEl.closest(".stat");
  var startPanel = document.getElementById("start");
  var overlay = document.getElementById("overlay");
  var finalEl = document.getElementById("final");
  var starsEl = document.getElementById("stars");
  var soundBtn = document.getElementById("sound");

  var score = 0;
  var timeLeft = ROUND_SECONDS;
  var running = false;
  var soundOn = true;
  var countdownId = null;
  var spawnId = null;
  var audioCtx = null;

  /* ---------- צליל פופ (Web Audio – ללא קבצים חיצוניים) ---------- */
  function pop(pitch) {
    if (!soundOn) return;
    try {
      if (!audioCtx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtx = new Ctx();
      }
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(pitch, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.4, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.14);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      /* אם הדפדפן חוסם אודיו – המשחק ממשיך כרגיל */
    }
  }

  /* ---------- כלים ---------- */
  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function pickType() {
    var total = TYPES.reduce(function (sum, t) {
      return sum + t.weight;
    }, 0);
    var roll = Math.random() * total;
    for (var i = 0; i < TYPES.length; i++) {
      roll -= TYPES[i].weight;
      if (roll <= 0) return TYPES[i];
    }
    return TYPES[0];
  }

  /* בוחר צבע אקראי, אך לא זהה לבלון הקודם */
  function pickColor() {
    var color = COLORS[Math.floor(Math.random() * COLORS.length)];
    var guard = 0;
    while (color === lastColor && guard++ < 6) {
      color = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
    lastColor = color;
    return color;
  }

  /* קצב הופעה: מתחיל רגוע ומאיץ בהדרגה */
  function currentSpawnDelay() {
    var elapsed = ROUND_SECONDS - timeLeft;
    var progress = Math.min(elapsed / ROUND_SECONDS, 1);
    return 780 - progress * 480; // 780ms → 300ms
  }

  /* ---------- יצירת בלון ---------- */
  function spawnBalloon() {
    if (!running) return;

    var type = pickType();
    var color = pickColor();
    var el = document.createElement("button");
    el.type = "button";
    el.className = "balloon " + type.cls;
    el.textContent = type.face;
    el.dataset.color = color;
    el.setAttribute("aria-label", "בלון – " + type.points + " נקודות");

    /* הצבע נקבע כאן ולא ב-CSS, כדי שיהיה שונה בכל בלון */
    el.style.backgroundColor = color;
    el.style.backgroundImage =
      "radial-gradient(circle at 32% 26%, rgba(255,255,255,.6), rgba(255,255,255,0) 46%)";

    var width = arena.clientWidth;
    el.style.left = randomBetween(6, Math.max(6, width - 74)) + "px";
    el.style.setProperty("--travel", arena.clientHeight + 220 + "px");
    el.style.animationDuration = randomBetween(type.speed[0], type.speed[1]) + "s";

    el.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      burst(el, type);
    });

    el.addEventListener("animationend", function () {
      el.remove();
    });

    arena.appendChild(el);
  }

  /* ---------- פיצוץ ---------- */
  function burst(el, type) {
    if (!el.isConnected) return;

    var rect = el.getBoundingClientRect();
    var arenaRect = arena.getBoundingClientRect();
    var cx = rect.left - arenaRect.left + rect.width / 2;
    var cy = rect.top - arenaRect.top + rect.height / 2;
    var color = el.dataset.color || "#f6a8bb";

    el.remove();

    score += type.points;
    scoreEl.textContent = score;
    pop(type.points === 50 ? 900 : type.points === 20 ? 700 : 520);

    /* חלקיקים */
    for (var i = 0; i < 8; i++) {
      var p = document.createElement("span");
      var angle = (Math.PI * 2 * i) / 8;
      p.className = "particle";
      p.style.left = cx + "px";
      p.style.top = cy + "px";
      p.style.background = color;
      p.style.setProperty("--dx", Math.cos(angle) * 48 + "px");
      p.style.setProperty("--dy", Math.sin(angle) * 48 + "px");
      arena.appendChild(p);
      cleanupLater(p, 600);
    }

    /* נקודות מרחפות */
    var label = document.createElement("span");
    label.className = "floating-score";
    label.textContent = "+" + type.points;
    label.style.left = cx - 14 + "px";
    label.style.top = cy - 12 + "px";
    arena.appendChild(label);
    cleanupLater(label, 850);
  }

  function cleanupLater(el, ms) {
    setTimeout(function () {
      el.remove();
    }, ms);
  }

  /* ---------- מהלך הסיבוב ---------- */
  function tick() {
    timeLeft--;
    timerEl.textContent = timeLeft;
    timerBox.classList.toggle("is-urgent", timeLeft <= 5);

    if (timeLeft <= 0) {
      endRound();
      return;
    }
    /* עדכון קצב ההופעה בהתאם להתקדמות */
    clearInterval(spawnId);
    spawnId = setInterval(spawnBalloon, currentSpawnDelay());
  }

  function startRound() {
    score = 0;
    timeLeft = ROUND_SECONDS;
    running = true;
    scoreEl.textContent = "0";
    timerEl.textContent = ROUND_SECONDS;
    timerBox.classList.remove("is-urgent");
    startPanel.classList.add("is-hidden");
    overlay.classList.remove("is-open");
    clearBalloons();

    spawnBalloon();
    spawnId = setInterval(spawnBalloon, currentSpawnDelay());
    countdownId = setInterval(tick, 1000);
  }

  function endRound() {
    running = false;
    clearInterval(spawnId);
    clearInterval(countdownId);
    clearBalloons();

    finalEl.textContent = "צברת " + score + " נקודות!";
    starsEl.textContent = starsFor(score);
    overlay.classList.add("is-open");
  }

  function starsFor(value) {
    var count = value >= 500 ? 5 : value >= 350 ? 4 : value >= 200 ? 3 : value >= 100 ? 2 : 1;
    return new Array(count + 1).join("⭐ ").trim();
  }

  function clearBalloons() {
    var nodes = arena.querySelectorAll(".balloon, .particle, .floating-score");
    Array.prototype.forEach.call(nodes, function (n) {
      n.remove();
    });
  }

  /* ---------- כפתורים ---------- */
  document.getElementById("begin").addEventListener("click", startRound);
  document.getElementById("again").addEventListener("click", startRound);

  soundBtn.addEventListener("click", function () {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? "🔊 צליל" : "🔇 מושתק";
    soundBtn.setAttribute("aria-pressed", String(soundOn));
  });

  /* עצירה כשעוזבים את הלשונית */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && running) {
      clearInterval(spawnId);
      clearInterval(countdownId);
      running = false;
      startPanel.classList.remove("is-hidden");
      clearBalloons();
    }
  });

  /* ---------- בועות רקע ---------- */
  (function decorate() {
    var host = document.getElementById("bubbles");
    if (!host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var tints = ["#f6c3ce", "#bee3f2", "#bce7ce", "#f5ce85"];
    for (var i = 0; i < 12; i++) {
      var b = document.createElement("span");
      var size = 16 + Math.random() * 42;
      b.style.width = size + "px";
      b.style.height = size + "px";
      b.style.right = Math.random() * 100 + "%";
      b.style.bottom = "-10vh";
      b.style.background = tints[i % tints.length];
      b.style.opacity = 0.25;
      b.style.animationDuration = 16 + Math.random() * 18 + "s";
      b.style.animationDelay = -Math.random() * 20 + "s";
      host.appendChild(b);
    }
  })();
})();
