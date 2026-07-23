/* =========================================================
   הצליל הפותח – מיון תמונות לפי הצליל שבו המילה מתחילה
   ========================================================= */
(function () {
  "use strict";

  var ROUNDS = [
    {
      letters: [
        { letter: "ל", tint: "#f291a9" },
        { letter: "ב", tint: "#7ec6e0" },
        { letter: "ד", tint: "#7fcfa4" }
      ],
      cards: [
        { word: "לחם", icon: "🍞", letter: "ל" },
        { word: "לימון", icon: "🍋", letter: "ל" },
        { word: "בננה", icon: "🍌", letter: "ב" },
        { word: "בית", icon: "🏠", letter: "ב" },
        { word: "דג", icon: "🐟", letter: "ד" },
        { word: "דלת", icon: "🚪", letter: "ד" }
      ]
    },
    {
      letters: [
        { letter: "מ", tint: "#bda7e8" },
        { letter: "ת", tint: "#f3a06b" },
        { letter: "כ", tint: "#6fc9c0" }
      ],
      cards: [
        { word: "מטוס", icon: "✈️", letter: "מ" },
        { word: "מכונית", icon: "🚗", letter: "מ" },
        { word: "תפוח", icon: "🍎", letter: "ת" },
        { word: "תות", icon: "🍓", letter: "ת" },
        { word: "כלב", icon: "🐶", letter: "כ" },
        { word: "כדור", icon: "⚽", letter: "כ" }
      ]
    },
    {
      letters: [
        { letter: "ג", tint: "#e79ac4" },
        { letter: "פ", tint: "#88b7e8" },
        { letter: "ס", tint: "#9bc96a" }
      ],
      cards: [
        { word: "גזר", icon: "🥕", letter: "ג" },
        { word: "גלידה", icon: "🍦", letter: "ג" },
        { word: "פיל", icon: "🐘", letter: "פ" },
        { word: "פרפר", icon: "🦋", letter: "פ" },
        { word: "סוס", icon: "🐴", letter: "ס" },
        { word: "סירה", icon: "⛵", letter: "ס" }
      ]
    }
  ];

  var BALLOON_COLORS = [
    "#f291a9",
    "#7ec6e0",
    "#7fcfa4",
    "#f3c163",
    "#bda7e8",
    "#f7a476",
    "#6fcfcf"
  ];

  var TRY_AGAIN = ["נסה שוב", "כמעט! נסו שוב", "עוד פעם אחת"];

  var binsEl = document.getElementById("bins");
  var trayEl = document.getElementById("tray");
  var bouquetEl = document.getElementById("bouquet");
  var countEl = document.getElementById("count");
  var roundEl = document.getElementById("round");
  var overlay = document.getElementById("overlay");
  var finalEl = document.getElementById("final");
  var voiceBtn = document.getElementById("voice");
  var wordsBtn = document.getElementById("showWords");

  var roundIndex = 0;
  var balloons = 0;
  var mistakes = 0;
  var remaining = 0;
  var selectedPic = null;
  var voiceOn = true;

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
      /* אין תמיכה בהקראה */
    }
  }

  function tone(ok) {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      tone.ctx = tone.ctx || new Ctx();
      var ctx = tone.ctx;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = ok ? "sine" : "triangle";
      osc.frequency.setValueAtTime(ok ? 620 : 300, ctx.currentTime);
      if (ok) {
        osc.frequency.setValueAtTime(790, ctx.currentTime + 0.09);
        osc.frequency.setValueAtTime(990, ctx.currentTime + 0.18);
      } else {
        osc.frequency.exponentialRampToValueAtTime(190, ctx.currentTime + 0.22);
      }
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.32);
    } catch (e) {
      /* אודיו חסום */
    }
  }

  /* ---------- דגלונים ברקע ---------- */
  function buildBunting() {
    var host = document.getElementById("bunting");
    if (!host) return;
    host.innerHTML = "";
    for (var i = 0; i < 18; i++) {
      var flag = document.createElement("span");
      flag.style.background = BALLOON_COLORS[i % BALLOON_COLORS.length];
      flag.style.animationDelay = (i % 6) * 0.18 + "s";
      host.appendChild(flag);
    }
  }

  /* ---------- בניית שלב ---------- */
  function buildRound() {
    var data = ROUNDS[roundIndex];
    binsEl.innerHTML = "";
    trayEl.innerHTML = "";
    selectedPic = null;
    remaining = data.cards.length;
    roundEl.textContent = "שלב " + (roundIndex + 1) + " מתוך " + ROUNDS.length;

    data.letters.forEach(function (item) {
      var bin = document.createElement("div");
      bin.className = "bin";
      bin.dataset.letter = item.letter;
      bin.style.setProperty("--tint", item.tint);
      bin.setAttribute("role", "button");
      bin.setAttribute("tabindex", "0");
      bin.setAttribute("aria-label", "האות " + item.letter);
      bin.innerHTML =
        '<span class="bin__letter">' +
        item.letter +
        '</span><div class="bin__drop"></div>';

      bin.addEventListener("click", function () {
        if (selectedPic) tryPlace(selectedPic, bin);
      });
      bin.addEventListener("keydown", function (event) {
        if ((event.key === "Enter" || event.key === " ") && selectedPic) {
          event.preventDefault();
          tryPlace(selectedPic, bin);
        }
      });

      binsEl.appendChild(bin);
    });

    shuffle(data.cards).forEach(function (card) {
      trayEl.appendChild(createPic(card));
    });
  }

  function createPic(card) {
    var pic = document.createElement("button");
    pic.type = "button";
    pic.className = "pic";
    pic.dataset.letter = card.letter;
    pic.dataset.word = card.word;
    pic.setAttribute("aria-label", card.word);
    pic.innerHTML =
      '<span class="pic__art" aria-hidden="true">' +
      card.icon +
      '</span><span class="pic__word">' +
      card.word +
      "</span>";
    makeDraggable(pic);
    return pic;
  }

  /* ---------- גרירה ---------- */
  function makeDraggable(pic) {
    var startX = 0;
    var startY = 0;
    var dragging = false;
    var moved = false;

    pic.addEventListener("pointerdown", function (event) {
      dragging = true;
      moved = false;
      startX = event.clientX;
      startY = event.clientY;
      pic.setPointerCapture(event.pointerId);
    });

    pic.addEventListener("pointermove", function (event) {
      if (!dragging) return;
      var dx = event.clientX - startX;
      var dy = event.clientY - startY;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 7) return;

      if (!moved) {
        moved = true;
        pic.classList.add("is-dragging");
        selectPic(pic, true);
      }
      pic.style.transform = "translate(" + dx + "px," + dy + "px) scale(1.08)";
      highlightBinAt(event.clientX, event.clientY);
    });

    pic.addEventListener("pointerup", function (event) {
      if (!dragging) return;
      dragging = false;
      pic.releasePointerCapture(event.pointerId);

      if (!moved) {
        selectPic(pic);
        return;
      }

      var bin = binAt(event.clientX, event.clientY);
      pic.classList.remove("is-dragging");
      pic.style.transform = "";
      clearTargets();

      if (bin) tryPlace(pic, bin);
    });

    pic.addEventListener("pointercancel", function () {
      dragging = false;
      pic.classList.remove("is-dragging");
      pic.style.transform = "";
      clearTargets();
    });
  }

  function binAt(x, y) {
    var el = document.elementFromPoint(x, y);
    return el ? el.closest(".bin") : null;
  }

  function highlightBinAt(x, y) {
    clearTargets();
    var bin = binAt(x, y);
    if (bin) bin.classList.add("is-target");
  }

  function clearTargets() {
    Array.prototype.forEach.call(binsEl.querySelectorAll(".bin"), function (b) {
      b.classList.remove("is-target");
    });
  }

  /* ---------- בחירה בלחיצה ---------- */
  function selectPic(pic, silent) {
    if (selectedPic === pic && !silent) {
      pic.classList.remove("is-selected");
      selectedPic = null;
      return;
    }
    if (selectedPic) selectedPic.classList.remove("is-selected");
    selectedPic = pic;
    pic.classList.add("is-selected");
    if (!silent) say(pic.dataset.word);
  }

  /* ---------- הנחה ---------- */
  function tryPlace(pic, bin) {
    if (pic.dataset.letter === bin.dataset.letter) {
      awardBalloon(pic);

      var mark = document.createElement("span");
      mark.className = "placed";
      mark.textContent = pic.querySelector(".pic__art").textContent;
      mark.title = pic.dataset.word;
      bin.querySelector(".bin__drop").appendChild(mark);

      pic.classList.remove("is-selected");
      pic.classList.add("is-gone");
      selectedPic = null;
      setTimeout(function () {
        pic.remove();
      }, 280);

      tone(true);
      remaining--;

      if (remaining === 0) setTimeout(nextRound, 900);
    } else {
      mistakes++;
      tone(false);
      bin.classList.add("is-wrong");
      pic.classList.add("is-wrong");
      say(TRY_AGAIN[Math.floor(Math.random() * TRY_AGAIN.length)]);
      setTimeout(function () {
        bin.classList.remove("is-wrong");
        pic.classList.remove("is-wrong");
      }, 440);
    }
  }

  /* ---------- פרס: בלון ---------- */
  function awardBalloon(pic) {
    var color = BALLOON_COLORS[balloons % BALLOON_COLORS.length];
    var rect = pic.getBoundingClientRect();

    /* בלון שעף מהקלף כלפי מעלה */
    var fly = document.createElement("div");
    fly.className = "fly-balloon";
    fly.style.background = color;
    fly.style.left = rect.left + rect.width / 2 - 23 + "px";
    fly.style.top = rect.top - 10 + "px";
    document.body.appendChild(fly);
    setTimeout(function () {
      fly.remove();
    }, 1200);

    /* ומצטרף לאוסף */
    balloons++;
    countEl.textContent = balloons;
    var mini = document.createElement("span");
    mini.className = "mini-balloon";
    mini.style.background = color;
    mini.style.animationDelay = "0.35s";
    bouquetEl.appendChild(mini);
  }

  /* ---------- קונפטי ---------- */
  function confetti() {
    for (var i = 0; i < 26; i++) {
      var bit = document.createElement("span");
      bit.className = "confetti";
      bit.style.background = BALLOON_COLORS[i % BALLOON_COLORS.length];
      bit.style.left = Math.random() * 100 + "vw";
      bit.style.animationDuration = 2 + Math.random() * 1.6 + "s";
      bit.style.animationDelay = Math.random() * 0.5 + "s";
      document.body.appendChild(bit);
      (function (node) {
        setTimeout(function () {
          node.remove();
        }, 4200);
      })(bit);
    }
  }

  /* ---------- מעבר שלב וסיום ---------- */
  function nextRound() {
    confetti();
    roundIndex++;
    if (roundIndex < ROUNDS.length) {
      say("שלב חדש!");
      buildRound();
    } else {
      finish();
    }
  }

  function finish() {
    var count = mistakes <= 2 ? 5 : mistakes <= 5 ? 4 : mistakes <= 9 ? 3 : 2;
    document.getElementById("stars").textContent = new Array(count + 1)
      .join("⭐ ")
      .trim();
    finalEl.textContent = "אספתם " + balloons + " בלונים!";
    overlay.classList.add("is-open");
    say("איזו חגיגה! כל הכבוד!");
  }

  /* ---------- התחלה מחדש ---------- */
  function restart() {
    roundIndex = 0;
    balloons = 0;
    mistakes = 0;
    selectedPic = null;
    countEl.textContent = "0";
    bouquetEl.innerHTML = "";
    overlay.classList.remove("is-open");
    buildRound();
  }

  document.getElementById("restart").addEventListener("click", restart);
  document.getElementById("again").addEventListener("click", restart);

  voiceBtn.addEventListener("click", function () {
    voiceOn = !voiceOn;
    voiceBtn.textContent = voiceOn ? "🔊 הקראה" : "🔇 ללא הקראה";
    voiceBtn.setAttribute("aria-pressed", String(voiceOn));
    if (!voiceOn && "speechSynthesis" in window) window.speechSynthesis.cancel();
  });

  wordsBtn.addEventListener("click", function () {
    var on = document.body.classList.toggle("words-on");
    wordsBtn.setAttribute("aria-pressed", String(on));
    wordsBtn.textContent = on ? "🙈 בלי מילים" : "👁️ מילים";
  });

  buildBunting();
  restart();
})();
