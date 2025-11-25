import { loadGoogleMapsApi } from './loader.js';
import { Game } from './game.js';

async function init() {
    try {
        await loadGoogleMapsApi();
        console.log("Google Maps API loaded successfully");
        new Game();
    } catch (error) {
        console.error("Failed to initialize game:", error);
        alert("Failed to load Google Maps API. Please check your API key.");
    }
}

init();
