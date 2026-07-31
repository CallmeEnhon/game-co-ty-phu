/* =========================================================
   MONOCONCARD - MAIN ENTRY POINT (app.js)  v4.0.0
   Web-only. Orchestrates: state, board, rooms, bot, animations, ui.
   ========================================================= */

window.addEventListener("DOMContentLoaded", () => {
  if (window.RoomsModule) window.RoomsModule.initLobby();
  if (window.UIModule)    window.UIModule.bindEvents();
});
