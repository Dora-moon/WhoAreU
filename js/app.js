/**
 * @file app.js
 * @description Application Bootstrap & Entry Point for the Live Wikipedia Gacha App.
 */

import AppController, { AppController as NamedAppController } from './controllers/AppController.js';

const ControllerClass = AppController || NamedAppController;

const bootstrapApp = () => {
  const app = new ControllerClass();
  app.bootstrap();
  if (typeof window !== 'undefined') {
    window.__APP__ = app;
  }
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapApp);
  } else {
    bootstrapApp();
  }
}

export default bootstrapApp;
