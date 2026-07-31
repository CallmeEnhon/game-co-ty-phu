/* =========================================================
   MONOCONCARD - MAIN ENTRY POINT (app.js)
   Orchestrates modules: state.js, board.js, rooms.js, bot.js,
   animations.js, ui.js.
   ========================================================= */

window.addEventListener("DOMContentLoaded", () => {
  if (window.RoomsModule) {
    window.RoomsModule.initLobby();
  }
  if (window.UIModule) {
    window.UIModule.bindEvents();
  }
});
