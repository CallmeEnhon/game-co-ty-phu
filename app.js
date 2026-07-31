/* =========================================================
   CỜ TỶ PHÚ CÔNG TY - MAIN ENTRY POINT (app.js)
   Orchestrates modules: state.js, board.js, rooms.js, bot.js,
   animations.js, ui.js.
   ========================================================= */

window.addEventListener("DOMContentLoaded", () => {
  if (window.UIModule) {
    window.UIModule.init();
  }
});
