import { initMathCoords } from './mathCoords.mjs';
import { trackCanvasSizeAndRender } from './trackCanvasSizeAndRender.mjs';
import { trackMouseLocation } from './trackMouseLocation.mjs';
import { trackWheel } from './trackWheel.mjs';
import { trackMouse } from './trackMouse.mjs';
import { trackTouch } from './trackTouch.mjs';

const canvas = document.getElementById('main-canvas');

initMathCoords(canvas);
trackMouseLocation(canvas);
trackCanvasSizeAndRender(canvas);
trackWheel(canvas)
trackMouse(canvas);
trackTouch(canvas);
