import type { App, Plugin } from "vue";

export const focusPlugin = {
  install(app: App) {
    app.directive("focus", {
      mounted(el: HTMLElement) {
        el.focus();
      }
    }
  )}


} as Plugin