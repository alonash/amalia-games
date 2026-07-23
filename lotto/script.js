/* =========================================================
   לוטו השי"ן – מיון מילים לפי מיקום האות ש׳
   ========================================================= */
(function () {
  "use strict";

  var HAND_SIZE = 4; // כמה קלפים מוצגים בקופה בכל רגע
  var POINTS = 10;

  var CATEGORIES = [
    {
      id: "start",
      title: 'ש׳ בתחילת המילה',
      hint: "שָׁפָן",
      tint: "#f291a9",
      words: [
        { word: "שפן", icon: "🐰" },
        { word: "שועל", icon: "🦊" },
        { word: "שעון", icon: "⌚" }
      ]
    },
    {
      id: "syllable",
      title: 'ש׳ בסוף ההברה הראשונה',
      hint: "מִשְׁ־קֶפֶת",
      tint: "#f3c163",
      words: [
        { word: "משקפת", icon: "🔭" },
        { word: "אשפה", icon: "🗑️" },
        { word: "משפחה", icon: "👨‍👩‍👧" }
      ]
    },
    {
      id: "middle",
      title: 'ש׳ באמצע המילה',
      hint: "קֶשֶׁת",
      tint: "#7ec6e0",
      words: [
        { word: "קשת", icon: "🌈" },
        { word: "גשם", icon: "🌧️" },
        { word: "מברשת", icon: "🪥" }
      ]
    },
    {
      id: "end",
      title: 'ש׳ בסוף המילה',
      hint: "עַכָּבִישׁ",
      tint: "#7fcfa4",
      words: [
        { word: "עכביש", icon: "🕷️" },
        { word: "אש", icon: "🔥" },
        { word: "כביש", icon: "🛣️" }
      ]
    },
    {
      id: "double",
      title: 'ש׳ כפולה במילה',
      hint: "שַׁרְשֶׁרֶת",
      tint: "#bda7e8",
      words: [
        { word: "שמש", icon: "☀️" },
        { word: "שרשרת", icon: "📿" },
        { word: "שמשיה", icon: "⛱️" }
      ]
    }
  ];

  var CHEERS = ["כל הכבוד!", "מצוין!", "איזה יופי!", "ככה זה נשמע!", "אלוף השי\"ן!"];

  var boardEl = document.getElementById("board");
  var potEl = document.getElementById("potCards");
  var scoreEl = document.getElementById("score");
  var placedEl = document.getElementById("placed");
  var shlomi = document.getElementById("shlomi");
  var cheerEl = document.getElementById("cheer");
  var overlay = document.getElementById("overlay");
  var finalEl = document.getElementById("final");
  var voiceBtn = document.getElementById("voice");

  var deck = [];
  var total = 0;
  var placed = 0;
  var score = 0;
  var mistakes = 0;
  var selectedTile = null;
  var voiceOn = true;
  var cheerTimer = null;

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

  /* מדגיש כל ש׳ במילה – עוזר לילד לראות איפה הצליל יושב */
  function markShin(word) {
    return word.split("ש").join("<b>ש</b>");
  }

  function say(text) {
    if (!voiceOn) return;
    try {
      if (!("speechSynthesis" in window)) return;
      var utter = new SpeechSynthesisUtterance(text);
      utter.lang = "he-IL";
      utter.rate = 0.82;
      utter.pitch = 1.1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (e) {
      /* אין תמיכה בהקראה – ממשיכים בלי */
    }
  }

  function chime(ok) {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      chime.ctx = chime.ctx || new Ctx();
      var ctx = chime.ctx;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = ok ? "sine" : "triangle";
      osc.frequency.setValueAtTime(ok ? 620 : 240, ctx.currentTime);
      if (ok) {
        osc.frequency.setValueAtTime(780, ctx.currentTime + 0.09);
        osc.frequency.setValueAtTime(980, ctx.currentTime + 0.18);
      }
      gain.gain.setValueAtTime(0.13, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.34);
    } catch (e) {
      /* אודיו חסום – ממשיכים */
    }
  }

  /* ---------- בניית הלוח ---------- */
  function buildBoard() {
    boardEl.innerHTML = "";
    deck = [];
    total = 0;

    CATEGORIES.forEach(function (cat) {
      var row = document.createElement("div");
      row.className = "row";
      row.style.setProperty("--tint", cat.tint);

      var label = document.createElement("div");
      label.className = "row__label";
      label.innerHTML =
        '<span class="row__title">' +
        cat.title +
        '</span><span class="row__hint">' +
        cat.hint +
        "</span>";

      var slots = document.createElement("div");
      slots.className = "row__slots";

      shuffle(cat.words).forEach(function (item) {
        var slot = document.createElement("div");
        slot.className = "slot";
        slot.dataset.word = item.word;
        slot.setAttribute("role", "button");
        slot.setAttribute("tabindex", "0");
        slot.setAttribute("aria-label", item.word + " – " + cat.title);
        slot.innerHTML =
          '<span class="slot__art" aria-hidden="true">' +
          item.icon +
          '</span><span class="slot__word">' +
          markShin(item.word) +
          "</span>";

        slot.addEventListener("click", function () {
          if (selectedTile) tryPlace(selectedTile, slot);
        });
        slot.addEventListener("keydown", function (event) {
          if ((event.key === "Enter" || event.key === " ") && selectedTile) {
            event.preventDefault();
            tryPlace(selectedTile, slot);
          }
        });

        slots.appendChild(slot);
        deck.push({ word: item.word, icon: item.icon, tint: cat.tint });
        total++;
      });

      row.appendChild(label);
      row.appendChild(slots);
      boardEl.appendChild(row);
    });

    deck = shuffle(deck);
    placedEl.textContent = "0/" + total;
  }

  /* ---------- הקופה ---------- */
  function dealTiles() {
    while (potEl.children.length < HAND_SIZE && deck.length) {
      potEl.appendChild(createTile(deck.shift()));
    }
  }

  function createTile(item) {
    var tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    tile.dataset.word = item.word;
    tile.style.setProperty("--tile-shadow", item.tint);
    tile.setAttribute("aria-label", "קלף " + item.word);
    tile.innerHTML =
      '<span class="tile__art" aria-hidden="true">' +
      item.icon +
      '</span><span class="tile__word">' +
      markShin(item.word) +
      "</span>";

    makeDraggable(tile);
    return tile;
  }

  /* ---------- גרירה (Pointer Events – עובד גם במגע) ---------- */
  function makeDraggable(tile) {
    var startX = 0;
    var startY = 0;
    var dragging = false;
    var moved = false;

    tile.addEventListener("pointerdown", function (event) {
      dragging = true;
      moved = false;
      startX = event.clientX;
      startY = event.clientY;
      tile.setPointerCapture(event.pointerId);
    });

    tile.addEventListener("pointermove", function (event) {
      if (!dragging) return;
      var dx = event.clientX - startX;
      var dy = event.clientY - startY;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 7) return;

      if (!moved) {
        moved = true;
        tile.classList.add("is-dragging");
        selectTile(tile, true);
      }
      tile.style.transform = "translate(" + dx + "px," + dy + "px) scale(1.08)";
      highlightSlotAt(event.clientX, event.clientY);
    });

    tile.addEventListener("pointerup", function (event) {
      if (!dragging) return;
      dragging = false;
      tile.releasePointerCapture(event.pointerId);

      if (!moved) {
        selectTile(tile);
        return;
      }

      var slot = slotAt(event.clientX, event.clientY);
      tile.classList.remove("is-dragging");
      tile.style.transform = "";
      clearTargets();

      if (slot) tryPlace(tile, slot);
    });

    tile.addEventListener("pointercancel", function () {
      dragging = false;
      tile.classList.remove("is-dragging");
      tile.style.transform = "";
      clearTargets();
    });
  }

  function slotAt(x, y) {
    var el = document.elementFromPoint(x, y);
    if (!el) return null;
    var slot = el.closest(".slot");
    return slot && !slot.classList.contains("is-filled") ? slot : null;
  }

  function highlightSlotAt(x, y) {
    clearTargets();
    var slot = slotAt(x, y);
    if (slot) slot.classList.add("is-target");
  }

  function clearTargets() {
    Array.prototype.forEach.call(boardEl.querySelectorAll(".slot"), function (s) {
      s.classList.remove("is-target");
    });
  }

  /* ---------- בחירה בלחיצה + הקראה ---------- */
  function selectTile(tile, silent) {
    if (selectedTile === tile && !silent) {
      tile.classList.remove("is-selected");
      selectedTile = null;
      return;
    }
    if (selectedTile) selectedTile.classList.remove("is-selected");
    selectedTile = tile;
    tile.classList.add("is-selected");
    if (!silent) say(tile.dataset.word);
  }

  /* ---------- הנחת קלף ---------- */
  function tryPlace(tile, slot) {
    if (slot.classList.contains("is-filled")) return;

    if (tile.dataset.word === slot.dataset.word) {
      slot.classList.add("is-filled");
      tile.classList.remove("is-selected");
      tile.classList.add("is-gone");
      selectedTile = null;

      setTimeout(function () {
        tile.remove();
        dealTiles();
      }, 280);

      placed++;
      score += POINTS;
      scoreEl.textContent = score;
      placedEl.textContent = placed + "/" + total;

      chime(true);
      sparkle(slot);
      cheer();

      if (placed === total) setTimeout(finish, 1400);
    } else {
      mistakes++;
      chime(false);
      slot.classList.add("is-wrong");
      tile.classList.add("is-wrong");
      setTimeout(function () {
        slot.classList.remove("is-wrong");
        tile.classList.remove("is-wrong");
      }, 420);
    }
  }

  /* ---------- שלומי מוחא כפיים ---------- */
  function cheer() {
    cheerEl.textContent = CHEERS[Math.floor(Math.random() * CHEERS.length)];
    shlomi.classList.remove("is-cheering");
    void shlomi.offsetWidth; /* מאתחל את האנימציה */
    shlomi.classList.add("is-cheering");

    clearTimeout(cheerTimer);
    cheerTimer = setTimeout(function () {
      shlomi.classList.remove("is-cheering");
    }, 2000);
  }

  /* ---------- כוכבים מנצנצים ---------- */
  function sparkle(slot) {
    var rect = slot.getBoundingClientRect();
    var icons = ["⭐", "✨", "🌟", "✨", "⭐", "🌟"];

    icons.forEach(function (icon, i) {
      var star = document.createElement("span");
      star.className = "sparkle";
      star.textContent = icon;
      star.style.left = rect.left + rect.width / 2 - 12 + "px";
      star.style.top = rect.top + rect.height / 2 - 12 + "px";
      star.style.setProperty("--dx", (i - 2.5) * 22 + "px");
      star.style.setProperty("--rot", (i % 2 ? 60 : -60) + "deg");
      star.style.animationDelay = i * 60 + "ms";
      document.body.appendChild(star);
      setTimeout(function () {
        star.remove();
      }, 1200 + i * 60);
    });
  }

  /* ---------- סיום ---------- */
  function finish() {
    var count = mistakes <= 2 ? 5 : mistakes <= 5 ? 4 : mistakes <= 9 ? 3 : 2;
    document.getElementById("stars").textContent = new Array(count + 1)
      .join("⭐ ")
      .trim();
    finalEl.textContent = "ניקוד: " + score + " נקודות";
    overlay.classList.add("is-open");
    say("כל הכבוד! אלופי השין!");
  }

  /* ---------- התחלה מחדש ---------- */
  function restart() {
    placed = 0;
    score = 0;
    mistakes = 0;
    selectedTile = null;
    scoreEl.textContent = "0";
    potEl.innerHTML = "";
    overlay.classList.remove("is-open");
    shlomi.classList.remove("is-cheering");
    buildBoard();
    dealTiles();
  }

  document.getElementById("restart").addEventListener("click", restart);
  document.getElementById("again").addEventListener("click", restart);

  voiceBtn.addEventListener("click", function () {
    voiceOn = !voiceOn;
    voiceBtn.textContent = voiceOn ? "🔊 הקראה" : "🔇 ללא הקראה";
    voiceBtn.setAttribute("aria-pressed", String(voiceOn));
    if (!voiceOn && "speechSynthesis" in window) window.speechSynthesis.cancel();
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
      b.style.opacity = 0.22;
      b.style.animationDuration = 16 + Math.random() * 18 + "s";
      b.style.animationDelay = -Math.random() * 20 + "s";
      host.appendChild(b);
    }
  })();

  restart();
})();
