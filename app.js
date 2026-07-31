/* =========================================================
   MONOCONCARD - MAIN ENTRY POINT (app.js)
   Orchestrates modules: state.js, board.js, rooms.js, bot.js,
   animations.js, ui.js & Mobile Orientation Check.
   ========================================================= */

window.checkOrientation = function() {
  const overlay = document.querySelector("#orientationOverlay");
  if (!overlay) return;

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 900 && window.innerWidth < window.innerHeight);
  const isPortrait = window.innerHeight > window.innerWidth;

  if (isMobile && isPortrait) {
    overlay.classList.remove("hidden");
    overlay.style.display = "grid";
  } else {
    overlay.classList.add("hidden");
    overlay.style.display = "none";
  }
};

window.addEventListener("DOMContentLoaded", () => {
  if (window.RoomsModule) {
    window.RoomsModule.initLobby();
  }
  if (window.UIModule) {
    window.UIModule.bindEvents();
  }
  window.checkOrientation();
});

window.addEventListener("resize", window.checkOrientation);
window.addEventListener("orientationchange", window.checkOrientation);
