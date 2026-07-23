/* =========================================================
   מגלים מילים – התאמת מילה לתמונה (גרירה או לחיצה)
   ========================================================= */
(function () {
  "use strict";

  var LEVELS = [
    [
      { icon: "🌳", word: "עץ" },
      { icon: "🚲", word: "אופניים" },
      { icon: "🍎", word: "תפוח" },
      { icon: "🐶", word: "כלב" }
    ],
    [
      { icon: "🐱", word: "חתול" },
      { icon: "🌞", word: "שמש" },
      { icon: "🏠", word: "בית" },
      { icon: "🐟", word: "דג" }
    ],
    [
      { icon: "🌸", word: "פרח" },
      { icon: "🚗", word: "מכונית" },
      { icon: "🥕", word: "גזר" },
      { icon: "🦋", word: "פרפר" }
    ]
  ];

  var POINTS_PER_MATCH = 25;

  var slotsEl = document.getElementById("slots");
  var wordsEl = document.getElementById("words");
  var scoreEl = document.getElementById("score");
  var levelEl = document.getElementById("level");
  var foundEl = document.getElementById("found");
  var finalEl = document.getElementById("final");
  var overlay = document.getElementById("overlay");

  var levelIndex = 0;
  var score = 0;
  var matchedInLevel = 0;
  var mistakes = 0;
  var selectedWord = null;

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

  function chime(ok) {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      chime.ctx = chime.ctx || new Ctx();
      var ctx = chime.ctx;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(ok ? 660 : 260, ctx.currentTime);
      if (ok) osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch (e) {
      /* אודיו חסום – ממשיכים בלי צליל */
    }
  }

  /* ---------- בניית שלב ---------- */
  function buildLevel() {
    var pairs = LEVELS[levelIndex];
    matchedInLevel = 0;
    selectedWord = null;
    slotsEl.innerHTML = "";
    wordsEl.innerHTML = "";
    levelEl.textContent = levelIndex + 1;
    foundEl.textContent = "0/" + pairs.length;

    shuffle(pairs).forEach(function (pair) {
      var slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.word = pair.word;
      slot.setAttribute("role", "button");
      slot.innerHTML =
        '<span class="slot__art" aria-hidden="true">' +
        pair.icon +
        '</span><span class="slot__answer"></span>';
      slot.addEventListener("click", function () {
        if (selectedWord) tryMatch(selectedWord, slot);
      });
      slotsEl.appendChild(slot);
    });

    shuffle(pairs).forEach(function (pair) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "word";
      chip.textContent = pair.word;
      chip.dataset.word = pair.word;
      makeDraggable(chip);
      wordsEl.appendChild(chip);
    });
  }

  /* ---------- גרירה (Pointer Events – עובד גם במגע) ---------- */
  function makeDraggable(chip) {
    var startX = 0;
    var startY = 0;
    var dragging = false;
    var moved = false;

    chip.addEventListener("pointerdown", function (event) {
      if (chip.classList.contains("is-placed")) return;
      dragging = true;
      moved = false;
      startX = event.clientX;
      startY = event.clientY;
      chip.setPointerCapture(event.pointerId);
    });

    chip.addEventListener("pointermove", function (event) {
      if (!dragging) return;
      var dx = event.clientX - startX;
      var dy = event.clientY - startY;

      if (!moved && Math.abs(dx) + Math.abs(dy) < 6) return;
      moved = true;
      chip.classList.add("is-dragging");
      chip.style.transform = "translate(" + dx + "px," + dy + "px) scale(1.06)";
      highlightSlotAt(event.clientX, event.clientY);
    });

    chip.addEventListener("pointerup", function (event) {
      if (!dragging) return;
      dragging = false;
      chip.releasePointerCapture(event.pointerId);

      if (!moved) {
        selectWord(chip);
        return;
      }

      var slot = slotAt(event.clientX, event.clientY);
      chip.classList.remove("is-dragging");
      chip.style.transform = "";
      clearHighlights();

      if (slot) tryMatch(chip, slot);
      else nudge(chip);
    });

    chip.addEventListener("pointercancel", function () {
      dragging = false;
      chip.classList.remove("is-dragging");
      chip.style.transform = "";
      clearHighlights();
    });
  }

  function slotAt(x, y) {
    var el = document.elementFromPoint(x, y);
    if (!el) return null;
    var slot = el.closest(".slot");
    return slot && !slot.classList.contains("is-done") ? slot : null;
  }

  function highlightSlotAt(x, y) {
    clearHighlights();
    var slot = slotAt(x, y);
    if (slot) slot.classList.add("is-hover");
  }

  function clearHighlights() {
    Array.prototype.forEach.call(slotsEl.querySelectorAll(".slot"), function (s) {
      s.classList.remove("is-hover");
    });
  }

  /* ---------- לחיצה במקום גרירה ---------- */
  function selectWord(chip) {
    if (selectedWord === chip) {
      chip.classList.remove("is-selected");
      selectedWord = null;
      return;
    }
    if (selectedWord) selectedWord.classList.remove("is-selected");
    selectedWord = chip;
    chip.classList.add("is-selected");
  }

  /* ---------- בדיקת התאמה ---------- */
  function tryMatch(chip, slot) {
    if (slot.classList.contains("is-done")) return;

    if (chip.dataset.word === slot.dataset.word) {
      chip.classList.remove("is-selected");
      chip.classList.add("is-placed");
      slot.classList.add("is-done");
      slot.querySelector(".slot__answer").textContent = slot.dataset.word;
      selectedWord = null;

      score += POINTS_PER_MATCH;
      matchedInLevel++;
      scoreEl.textContent = score;
      foundEl.textContent = matchedInLevel + "/" + LEVELS[levelIndex].length;
      chime(true);

      if (matchedInLevel === LEVELS[levelIndex].length) {
        setTimeout(nextLevel, 750);
      }
    } else {
      mistakes++;
      chime(false);
      nudge(chip);
    }
  }

  function nudge(chip) {
    chip.classList.add("is-wrong");
    setTimeout(function () {
      chip.classList.remove("is-wrong");
    }, 420);
  }

  /* ---------- התקדמות וסיום ---------- */
  function nextLevel() {
    levelIndex++;
    if (levelIndex < LEVELS.length) {
      buildLevel();
    } else {
      showWin();
    }
  }

  function showWin() {
    var count = mistakes <= 1 ? 5 : mistakes <= 3 ? 4 : mistakes <= 6 ? 3 : 2;
    document.getElementById("stars").textContent = new Array(count + 1).join("⭐ ").trim();
    finalEl.textContent = "ניקוד סופי: " + score + " נקודות";
    overlay.classList.add("is-open");
  }

  function restart() {
    levelIndex = 0;
    score = 0;
    mistakes = 0;
    scoreEl.textContent = "0";
    overlay.classList.remove("is-open");
    buildLevel();
  }

  document.getElementById("restart").addEventListener("click", restart);
  document.getElementById("again").addEventListener("click", restart);

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

  buildLevel();
})();
