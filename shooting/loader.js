export function loadGoogleMapsApi() {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.maps) {
            resolve(window.google.maps);
            return;
        }

        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            reject(new Error("Google Maps API Key is missing in .env"));
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            if (window.google && window.google.maps) {
                resolve(window.google.maps);
            } else {
                reject(new Error("Google Maps API loaded but google.maps is undefined"));
            }
        };

        script.onerror = (error) => {
            reject(new Error("Failed to load Google Maps API"));
        };

        document.head.appendChild(script);
    });
}
