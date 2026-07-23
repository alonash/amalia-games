/* =========================================================
   אלופי הזיכרון – לוח 4x4, 8 זוגות
   ========================================================= */
(function () {
  "use strict";

  var PAIRS = [
    { icon: "🌳", name: "עץ" },
    { icon: "🚲", name: "אופניים" },
    { icon: "🍎", name: "תפוח" },
    { icon: "🐶", name: "כלב" },
    { icon: "🐱", name: "חתול" },
    { icon: "🌻", name: "חמנייה" },
    { icon: "🦋", name: "פרפר" },
    { icon: "⭐", name: "כוכב" }
  ];

  var FLIP_BACK_MS = 700;

  var board = document.getElementById("board");
  var scoreEl = document.getElementById("score");
  var triesEl = document.getElementById("tries");
  var timerEl = document.getElementById("timer");
  var starsEl = document.getElementById("stars");
  var summaryEl = document.getElementById("summary");
  var overlay = document.getElementById("overlay");

  var firstCard = null;
  var lockBoard = false;
  var score = 0;
  var tries = 0;
  var matched = 0;
  var seconds = 0;
  var timerId = null;
  var gameId = 0;

  /* ---------- כלים ---------- */
  function shuffle(list) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function formatTime(total) {
    var m = Math.floor(total / 60);
    var s = total % 60;
    return m + ":" + (s < 10 ? "0" + s : s);
  }

  function startTimer() {
    stopTimer();
    timerId = setInterval(function () {
      seconds++;
      timerEl.textContent = formatTime(seconds);
    }, 1000);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  /* ---------- בניית הלוח ---------- */
  function buildBoard() {
    board.innerHTML = "";
    var deck = shuffle(PAIRS.concat(PAIRS));

    deck.forEach(function (item, index) {
      /* div ולא button: חלק מהדפדפנים משטחים תלת-ממד בתוך כפתור והקלף נעלם */
      var slot = document.createElement("div");
      slot.className = "card-slot";
      slot.dataset.icon = item.icon;
      slot.setAttribute("role", "button");
      slot.setAttribute("tabindex", "0");
      slot.setAttribute("aria-label", "קלף מספר " + (index + 1));

      slot.innerHTML =
        '<div class="card-inner">' +
        '<div class="card-face card-face--back"></div>' +
        '<div class="card-face card-face--front">' +
        item.icon +
        "</div>" +
        "</div>";

      slot.addEventListener("click", function () {
        flipCard(slot, item);
      });

      slot.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          flipCard(slot, item);
        }
      });

      board.appendChild(slot);
    });
  }

  /* הצצה פותחת: כל הקלפים נפתחים לרגע ואז נסגרים */
  function peek() {
    var slots = board.querySelectorAll(".card-slot");
    var myGame = gameId;
    lockBoard = true;

    Array.prototype.forEach.call(slots, function (slot, i) {
      setTimeout(function () {
        if (myGame === gameId) slot.classList.add("is-flipped");
      }, i * 45);
    });

    setTimeout(function () {
      if (myGame !== gameId) return;
      Array.prototype.forEach.call(slots, function (slot) {
        slot.classList.remove("is-flipped");
      });
      lockBoard = false;
    }, 2400);
  }

  /* ---------- מהלך המשחק ---------- */
  function flipCard(slot, item) {
    if (lockBoard) return;
    if (slot.classList.contains("is-flipped")) return;
    if (slot.classList.contains("is-matched")) return;

    if (!timerId) startTimer();

    slot.classList.add("is-flipped");
    slot.setAttribute("aria-label", item.name);

    if (!firstCard) {
      firstCard = { slot: slot, item: item };
      return;
    }

    tries++;
    triesEl.textContent = tries;

    if (firstCard.item.icon === item.icon) {
      handleMatch(firstCard.slot, slot);
    } else {
      handleMiss(firstCard.slot, slot);
    }
    firstCard = null;
  }

  function handleMatch(a, b) {
    a.classList.add("is-matched");
    b.classList.add("is-matched");
    matched++;
    score += 20;
    scoreEl.textContent = score;

    if (matched === PAIRS.length) {
      stopTimer();
      setTimeout(showWin, 600);
    }
  }

  function handleMiss(a, b) {
    lockBoard = true;
    a.classList.add("is-wrong");
    b.classList.add("is-wrong");

    setTimeout(function () {
      [a, b].forEach(function (el) {
        el.classList.remove("is-flipped", "is-wrong");
      });
      lockBoard = false;
    }, FLIP_BACK_MS);
  }

  /* ---------- סיום ---------- */
  function ratingStars() {
    // 8 זוגות = 8 ניסיונות מושלמים. פחות ניסיונות = יותר כוכבים.
    if (tries <= 11) return 5;
    if (tries <= 14) return 4;
    if (tries <= 18) return 3;
    if (tries <= 23) return 2;
    return 1;
  }

  function showWin() {
    var stars = ratingStars();
    starsEl.textContent = new Array(stars + 1).join("⭐ ").trim();
    starsEl.setAttribute("aria-label", stars + " מתוך 5 כוכבים");
    summaryEl.textContent =
      "ניקוד " + score + " · " + tries + " ניסיונות · " + formatTime(seconds);
    overlay.classList.add("is-open");
  }

  /* ---------- משחק חדש ---------- */
  function newGame() {
    stopTimer();
    gameId++;
    overlay.classList.remove("is-open");
    firstCard = null;
    lockBoard = false;
    score = 0;
    tries = 0;
    matched = 0;
    seconds = 0;
    scoreEl.textContent = "0";
    triesEl.textContent = "0";
    timerEl.textContent = "0:00";
    buildBoard();
    peek();
  }

  document.getElementById("restart").addEventListener("click", newGame);
  document.getElementById("again").addEventListener("click", newGame);

  /* ---------- בועות רקע ---------- */
  function decorate() {
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
  }

  decorate();
  newGame();
})();
