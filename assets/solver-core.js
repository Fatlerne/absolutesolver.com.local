(function () {
  "use strict";

  var STORAGE_PREFIX = "solver_visited_";
  var GLITCH_CHARS = "̷̶̸̡̢̧̨̛̖̗̘̙̜̝̞̟̠̣̤̥̦̩̪̫̬̭̮̯̰̱̲̳̹̺̻̼͇͈͉͍͎̀́̂̃̄̅̆̇̈̉̊̋̌̍̎̏̐̑̒̓̔̽̾̿̀́͂̓̈́͆͊͋͌̕̚ͅ";
  var MORSE_MAP = {
    A: ".-",    B: "-...",  C: "-.-.",  D: "-..",   E: ".",
    F: "..-.",  G: "--.",   H: "....",  I: "..",    J: ".---",
    K: "-.-",   L: ".-..",  M: "--",    N: "-.",    O: "---",
    P: ".--.",  Q: "--.-",  R: ".-.",   S: "...",   T: "-",
    U: "..-",   V: "...-",  W: ".--",   X: "-..-",  Y: "-.--",
    Z: "--..",  "0": "-----","1": ".----","2": "..---","3": "...--",
    "4": "....-","5": ".....","6": "-....","7": "--...","8": "---..","9": "----.",
    ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.",
    "!": "-.-.--", "/": "-..-.",  "(": "-.--.",  ")": "-.--.-",
    "&": ".-...",  ":": "---...", ";": "-.-.-.", "=": "-...-",
    "+": ".-.-.",  "-": "-....-", "_": "..--.-", '"': ".-..-.",
    "$": "...-..-","@": ".--.-."
  };

  var REVERSE_MORSE = {};
  for (var k in MORSE_MAP) {
    if (MORSE_MAP.hasOwnProperty(k)) REVERSE_MORSE[MORSE_MAP[k]] = k;
  }

  function hexEncode(str) {
    var out = "";
    for (var i = 0; i < str.length; i++) {
      out += str.charCodeAt(i).toString(16).padStart(2, "0");
    }
    return out;
  }

  function hexDecode(hex) {
    var out = "";
    for (var i = 0; i < hex.length; i += 2) {
      out += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
    }
    return out;
  }

  function base64Encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function base64Decode(b64) {
    return decodeURIComponent(escape(atob(b64)));
  }

  function rot13(str) {
    return str.replace(/[A-Za-z]/g, function (c) {
      var base = c <= "Z" ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    });
  }

  function caesarShift(str, n) {
    n = ((n % 26) + 26) % 26;
    return str.replace(/[A-Za-z]/g, function (c) {
      var base = c <= "Z" ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + n) % 26) + base);
    });
  }

  function vigenereEncrypt(plaintext, key) {
    key = key.toUpperCase();
    var ki = 0;
    return plaintext.replace(/[A-Za-z]/g, function (c) {
      var base = c <= "Z" ? 65 : 97;
      var shift = key.charCodeAt(ki % key.length) - 65;
      ki++;
      return String.fromCharCode(((c.charCodeAt(0) - base + shift) % 26) + base);
    });
  }

  function vigenereDecrypt(ciphertext, key) {
    key = key.toUpperCase();
    var ki = 0;
    return ciphertext.replace(/[A-Za-z]/g, function (c) {
      var base = c <= "Z" ? 65 : 97;
      var shift = key.charCodeAt(ki % key.length) - 65;
      ki++;
      return String.fromCharCode(((c.charCodeAt(0) - base - shift + 26) % 26) + base);
    });
  }

  function xorEncrypt(str, key) {
    var out = "";
    for (var i = 0; i < str.length; i++) {
      var xored = str.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      out += xored.toString(16).padStart(2, "0");
    }
    return out;
  }

  function morseEncode(str) {
    return str
      .toUpperCase()
      .split("")
      .map(function (c) {
        if (c === " ") return "/";
        return MORSE_MAP[c] || "";
      })
      .filter(Boolean)
      .join(" ");
  }

  function morseDecode(morse) {
    return morse
      .split(" ")
      .map(function (token) {
        if (token === "/" || token === "") return " ";
        return REVERSE_MORSE[token] || "";
      })
      .join("");
  }

  function trackVisit(pageId) {
    try {
      localStorage.setItem(STORAGE_PREFIX + pageId, Date.now().toString());
    } catch (_) {}
  }

  function hasVisited(pageId) {
    try {
      return localStorage.getItem(STORAGE_PREFIX + pageId) !== null;
    } catch (_) {
      return false;
    }
  }

  function getVisitedPages() {
    var pages = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf(STORAGE_PREFIX) === 0) {
          pages.push(key.substring(STORAGE_PREFIX.length));
        }
      }
    } catch (_) {}
    return pages;
  }

  function getVisitCount() {
    return getVisitedPages().length;
  }

  function clearTracking() {
    try {
      var toRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf(STORAGE_PREFIX) === 0) toRemove.push(key);
      }
      toRemove.forEach(function (k) { localStorage.removeItem(k); });
    } catch (_) {}
  }

  function solverWarn() {
    console.log(
      "%c⊗ ABSOLUTE SOLVER DETECTED ⊗",
      "color:#FFD700;font-size:20px;font-weight:bold;text-shadow:0 0 10px #FFD700;"
    );
  }

  function solverMessage(msg) {
    console.log(
      "%c[SOLVER] " + msg,
      "color:#FF3333;font-family:monospace;font-size:13px;"
    );
  }

  function hiddenClue(encoded) {
    var noise = "";
    for (var i = 0; i < 40; i++) {
      noise += String.fromCharCode(0x2580 + Math.floor(Math.random() * 32));
    }
    console.log(
      "%c" + noise + "\n%c" + encoded + "\n%c" + noise,
      "color:#222;font-size:8px;",
      "color:#333;font-family:monospace;font-size:10px;",
      "color:#222;font-size:8px;"
    );
  }

  function corruptText(element, intensity) {
    if (!element) return;
    intensity = Math.max(0, Math.min(1, intensity || 0.3));
    var original = element.textContent;
    var chars = original.split("");
    for (var i = 0; i < chars.length; i++) {
      if (Math.random() < intensity) {
        var numGlitch = 1 + Math.floor(Math.random() * 3);
        var corrupted = chars[i];
        for (var g = 0; g < numGlitch; g++) {
          corrupted += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }
        chars[i] = corrupted;
      }
    }
    element.textContent = chars.join("");
  }

  function glitchElement(element, duration) {
    if (!element) return;
    duration = duration || 600;
    var orig = element.style.cssText;
    var steps = 6;
    var interval = duration / steps;
    var count = 0;
    var timer = setInterval(function () {
      if (count >= steps) {
        clearInterval(timer);
        element.style.cssText = orig;
        return;
      }
      var dx = (Math.random() - 0.5) * 10;
      var dy = (Math.random() - 0.5) * 4;
      var skew = (Math.random() - 0.5) * 6;
      element.style.transform = "translate(" + dx + "px," + dy + "px) skewX(" + skew + "deg)";
      element.style.filter = "hue-rotate(" + Math.floor(Math.random() * 360) + "deg) brightness(" + (0.8 + Math.random() * 0.4) + ")";
      element.style.textShadow = (Math.random() > 0.5 ? "-" : "") + "2px 0 #FF3333," +
        (Math.random() > 0.5 ? "-" : "") + "2px 0 #33FF33";
      count++;
    }, interval);
  }

  function typewriterEffect(element, text, speed, callback) {
    if (!element) return;
    speed = speed || 50;
    var i = 0;
    element.textContent = "";
    function tick() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(tick, speed);
      } else if (typeof callback === "function") {
        callback();
      }
    }
    tick();
  }

  window.SolverCore = {
    hexEncode: hexEncode,
    hexDecode: hexDecode,
    base64Encode: base64Encode,
    base64Decode: base64Decode,
    rot13: rot13,
    caesarShift: caesarShift,
    vigenereEncrypt: vigenereEncrypt,
    vigenereDecrypt: vigenereDecrypt,
    xorEncrypt: xorEncrypt,
    morseEncode: morseEncode,
    morseDecode: morseDecode,

    trackVisit: trackVisit,
    hasVisited: hasVisited,
    getVisitedPages: getVisitedPages,
    getVisitCount: getVisitCount,
    clearTracking: clearTracking,

    solverWarn: solverWarn,
    solverMessage: solverMessage,
    hiddenClue: hiddenClue,

    corruptText: corruptText,
    glitchElement: glitchElement,
    typewriterEffect: typewriterEffect
  };
})();
