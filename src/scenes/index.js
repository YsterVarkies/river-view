// River View Three.js scenes, bundled as one script and loaded when a page scrolls near one.
// Build: npm run build:scenes
import { initBed, BED_ROOMS } from './bed.js';
import { initLamp } from './lamp.js';

window.RVScenes = { bed: initBed, lamp: initLamp, rooms: BED_ROOMS };
