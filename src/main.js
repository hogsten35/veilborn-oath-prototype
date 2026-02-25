import './styles.css';
import { Game } from './game/Game.js';

const appEl = document.getElementById('app');
const uiRootEl = document.getElementById('ui-root');

if (!appEl || !uiRootEl) {
  throw new Error('Missing #app or #ui-root in index.html');
}

const game = new Game({
  mountEl: appEl,
  uiRootEl
});

game.start();

// Handy for debugging in browser console:
window.__VO_GAME__ = game;
