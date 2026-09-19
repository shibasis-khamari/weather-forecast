/**
 * Weather Dashboard - Live Location, Autocomplete Suggestions & OpenWeatherMap API
 * Features:
 * 1. Live Geolocation weather fetching via latitude & longitude.
 * 2. Real-time City Search Suggestions via Geocoding API.
 * 3. Min and Max temperature extraction & display.
 * 4. Quick Indian City search (Mumbai, Pondicherry, Delhi, Chennai, Kochi, Bhubaneswar).
 * 5. Real 100% API responses (No demo/mock data).
 */

// API Configuration
const API_KEY = '1528dc3ee530a76e2d2410b0694cc65a';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_API_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const GEO_API_URL = 'https://api.openweathermap.org/geo/1.0/direct';

// Global Variables
let autocompleteDebounceTimer = null;
let currentPlace = null;
let lastWeatherScene = null;
const FAVORITES_STORAGE_KEY = 'atmos-starred-places';

// DOM Elements
const weatherForm = document.getElementById('weather-form');
const cityInput = document.getElementById('city-input');
const suggestionsList = document.getElementById('suggestions-list');
const dateInput = document.getElementById('date-input');
const locationBtn = document.getElementById('location-btn');

const welcomeCard = document.getElementById('welcome-card');
const welcomeText = document.getElementById('welcome-text');
const loader = document.getElementById('loader');
const loaderText = document.getElementById('loader-text');
const errorCard = document.getElementById('error-card');
const errorTitle = document.getElementById('error-title');
const errorMessage = document.getElementById('error-message');

const weatherCard = document.getElementById('weather-card');
const dateNotice = document.getElementById('date-notice');
const dateNoticeText = document.getElementById('date-notice-text');
const favoritesPanel = document.getElementById('favorites-panel');
const favoritesList = document.getElementById('favorites-list');
const favoritesCount = document.getElementById('favorites-count');
const favoriteBtn = document.getElementById('favorite-btn');
const animationStatus = document.getElementById('animation-status');
const restoreLiveSceneBtn = document.getElementById('restore-live-scene');
const weatherBackground = new WeatherBackgroundManager({
    onThunder: () => document.body.classList.add('thunder-pulse')
}).init();

// Weather Details Elements
const cityNameEl = document.getElementById('city-name');
const currentDateEl = document.getElementById('current-date');
const weatherBadgeEl = document.getElementById('weather-badge');
const weatherIconEl = document.getElementById('weather-icon');
const tempEl = document.getElementById('temperature');
const weatherDescEl = document.getElementById('weather-description');
const feelsLikeEl = document.getElementById('feels-like');
const tempMinEl = document.getElementById('temp-min');
const tempMaxEl = document.getElementById('temp-max');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('wind-speed');
const pressureEl = document.getElementById('pressure');
const visibilityEl = document.getElementById('visibility');
const forecastSection = document.getElementById('forecast-section');
const forecastGrid = document.getElementById('forecast-grid');
const jsonOutputEl = document.getElementById('json-output');
const jsonToggleBtn = document.getElementById('json-toggle');
const jsonChevron = document.getElementById('json-chevron');

function updateWeatherScene(condition, iconCode = '', rainData = {}, conditionId = 800, windSpeed = 0) {
    const conditionKey = (condition || '').toLowerCase();
    const weatherId = Number(conditionId);
    const rainVolume = Number(rainData['1h'] || rainData['3h'] || 0);
    const rainIntensity = rainVolume > 0 && rainVolume < 2.5 || [500, 501].includes(weatherId)
        ? 'rain-light'
        : rainVolume >= 2.5 && rainVolume < 7.5 || [502, 503].includes(weatherId)
            ? 'rain-medium'
            : 'rain-heavy';
    let sceneClass = 'weather-default';
    let sceneModifier = '';

    if (weatherId >= 200 && weatherId < 300 || conditionKey.includes('thunder')) {
        sceneClass = 'weather-storm';
        sceneModifier = weatherId >= 211 ? 'storm-heavy' : 'storm-light';
    } else if (weatherId >= 300 && weatherId < 400 || conditionKey.includes('drizzle')) {
        sceneClass = 'weather-drizzle';
        sceneModifier = weatherId >= 313 ? 'drizzle-heavy' : 'drizzle-light';
    } else if (weatherId >= 500 && weatherId < 600 || conditionKey.includes('rain')) {
        sceneClass = 'weather-rain';
        sceneModifier = rainIntensity;
    } else if (weatherId >= 600 && weatherId < 700 || conditionKey.includes('snow')) {
        sceneClass = 'weather-snow';
        sceneModifier = weatherId >= 602 ? 'snow-heavy' : 'snow-light';
    } else if (weatherId === 701 || conditionKey.includes('mist')) {
        sceneClass = 'weather-mist';
    } else if (weatherId === 711 || conditionKey.includes('smoke')) {
        sceneClass = 'weather-smoke';
    } else if (weatherId === 721 || conditionKey.includes('haze')) {
        sceneClass = 'weather-haze';
    } else if ([731, 751, 761, 762].includes(weatherId) || conditionKey.includes('dust') || conditionKey.includes('sand') || conditionKey.includes('ash')) {
        sceneClass = 'weather-dust';
    } else if (weatherId === 771 || weatherId === 781 || conditionKey.includes('squall') || conditionKey.includes('tornado')) {
        sceneClass = 'weather-wind';
    } else if (weatherId === 800 || conditionKey.includes('clear') || iconCode.startsWith('01')) {
        sceneClass = 'weather-sunny';
    } else if (weatherId === 801) {
        sceneClass = 'weather-few-clouds';
    } else if (weatherId === 802) {
        sceneClass = 'weather-scattered-clouds';
    } else if (weatherId >= 803 || conditionKey.includes('cloud')) {
        sceneClass = 'weather-cloudy';
    }

    lastWeatherScene = { condition, iconCode, rainData, conditionId, windSpeed };
    const mapped = mapWeatherToEffect({
        weather: [{ id: weatherId, icon: iconCode, main: condition }],
        wind: { speed: windSpeed }
    });
    mapped.intensity = sceneModifier === 'rain-heavy' || sceneModifier === 'snow-heavy' || sceneModifier === 'storm-heavy' ? .9 : sceneModifier === 'rain-light' || sceneModifier === 'snow-light' ? .35 : mapped.intensity;
    mapped.variant = weatherId === 801 ? 'few' : weatherId === 802 ? 'scattered' : weatherId === 803 ? 'broken' : weatherId === 804 ? 'overcast' : undefined;
    weatherBackground.setWeather(mapped);
}

function applySceneClasses(sceneClass, sceneModifier = '') {
    const previewConditions = {
        'weather-sunny': 'sunny',
        'weather-few-clouds': 'clouds',
        'weather-scattered-clouds': 'clouds',
        'weather-cloudy': 'clouds',
        'weather-drizzle': 'drizzle',
        'weather-rain': 'rain',
        'weather-storm': 'storm',
        'weather-snow': 'snow',
        'weather-mist': 'mist',
        'weather-smoke': 'smoke',
        'weather-haze': 'haze',
        'weather-wind': 'wind',
        'weather-dust': 'dust'
    };
    const previewIntensity = sceneModifier.includes('heavy') ? .9 : sceneModifier.includes('light') ? .35 : .6;
    weatherBackground.setWeather({
        condition: previewConditions[sceneClass] || 'clouds',
        isDay: true,
        windSpeed: sceneClass === 'weather-wind' ? 16 : 0,
        intensity: previewIntensity,
        variant: sceneClass.replace('weather-', '')
    });
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Set default date picker value to Today (YYYY-MM-DD)
    const todayStr = new Date().toISOString().split('T')[0];
    dateInput.value = todayStr;
    dateInput.min = todayStr;
    const forecastLimit = new Date();
    forecastLimit.setDate(forecastLimit.getDate() + 5);
    dateInput.max = forecastLimit.toISOString().split('T')[0];
    renderFavorites();

    // Form Submit
    weatherForm.addEventListener('submit', (e) => {
        e.preventDefault();
        hideSuggestions();
        const city = cityInput.value.trim();
        const selectedDate = dateInput.value;
        if (city) {
            getWeatherDataByCity(city, selectedDate);
        } else {
            showError('Input Required', 'Please enter a city name or click "Live Location".');
        }
    });

    // Autocomplete input listener
    cityInput.addEventListener('input', handleCityInput);

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-container')) {
            hideSuggestions();
        }
    });

    // Live Location Button Click
    locationBtn.addEventListener('click', () => {
        hideSuggestions();
        fetchUserLiveLocation();
    });

    // Quick Search Tags (Indian Cities)
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const city = btn.getAttribute('data-city');
            cityInput.value = city;
            hideSuggestions();
            getWeatherDataByCity(city, dateInput.value);
        });
    });

    // JSON Inspector Accordion Toggle
    jsonToggleBtn.addEventListener('click', () => {
        const isHidden = jsonOutputEl.classList.toggle('hidden');
        jsonChevron.className = isHidden ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
    });

    favoriteBtn.addEventListener('click', toggleCurrentFavorite);

    document.querySelectorAll('.animation-option[data-scene]').forEach((button) => {
        button.addEventListener('click', () => {
            const sceneClass = button.dataset.scene;
            const sceneModifier = button.dataset.modifier || '';
            applySceneClasses(sceneClass, sceneModifier);
            document.querySelectorAll('.animation-option').forEach((option) => option.classList.remove('is-active'));
            button.classList.add('is-active');
            animationStatus.textContent = `${button.dataset.label} animation preview active.`;
        });
    });

    restoreLiveSceneBtn.addEventListener('click', () => {
        if (!lastWeatherScene) {
            animationStatus.textContent = 'Live weather is still loading.';
            return;
        }

        updateWeatherScene(
            lastWeatherScene.condition,
            lastWeatherScene.iconCode,
            lastWeatherScene.rainData,
            lastWeatherScene.conditionId,
            lastWeatherScene.windSpeed
        );
        document.querySelectorAll('.animation-option').forEach((option) => option.classList.remove('is-active'));
        animationStatus.textContent = 'Live weather animation restored.';
    });

    // Automatically attempt live location on initial page load
    fetchUserLiveLocation(true);
});

function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]');
    } catch (error) {
        return [];
    }
}

function saveFavorites(favorites) {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
}

function isFavorite(place) {
    return getFavorites().some((favorite) => favorite.name.toLowerCase() === place.name.toLowerCase());
}

function renderFavorites() {
    const favorites = getFavorites();
    favoritesPanel.classList.toggle('hidden', favorites.length === 0);
    favoritesCount.textContent = `${favorites.length} saved`;
    favoritesList.innerHTML = '';

    favorites.forEach((place) => {
        const item = document.createElement('div');
        item.className = 'favorite-place';
        item.innerHTML = `
            <button class="favorite-load" type="button" title="Load weather for ${place.name}">
                <i class="fa-solid fa-star"></i>
                <span>${place.name}</span>
                <small>${place.country || ''}</small>
            </button>
            <button class="favorite-remove" type="button" title="Remove ${place.name}" aria-label="Remove ${place.name}">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        item.querySelector('.favorite-load').addEventListener('click', () => {
            cityInput.value = place.name;
            getWeatherDataByCity(place.name, dateInput.value);
        });
        item.querySelector('.favorite-remove').addEventListener('click', () => {
            saveFavorites(getFavorites().filter((favorite) => favorite.name !== place.name));
            renderFavorites();
            updateFavoriteButton();
        });
        favoritesList.appendChild(item);
    });
}

function updateFavoriteButton() {
    if (!currentPlace) return;
    const saved = isFavorite(currentPlace);
    favoriteBtn.classList.toggle('is-favorite', saved);
    favoriteBtn.innerHTML = `<i class="fa-${saved ? 'solid' : 'regular'} fa-star"></i>`;
    favoriteBtn.title = saved ? 'Remove this place from starred places' : 'Add this place to starred places';
    favoriteBtn.setAttribute('aria-label', favoriteBtn.title);
}

function toggleCurrentFavorite() {
    if (!currentPlace) return;
    const favorites = getFavorites();
    const existingIndex = favorites.findIndex((favorite) => favorite.name.toLowerCase() === currentPlace.name.toLowerCase());
    if (existingIndex >= 0) {
        favorites.splice(existingIndex, 1);
    } else {
        favorites.unshift(currentPlace);
    }
    saveFavorites(favorites.slice(0, 8));
    renderFavorites();
    updateFavoriteButton();
}

/* ==========================================================================
   1. LOCATION AUTOCOMPLETE SUGGESTIONS (AJAX)
   ========================================================================== */

function handleCityInput(e) {
    const query = e.target.value.trim();
    clearTimeout(autocompleteDebounceTimer);

    if (query.length < 2) {
        hideSuggestions();
        return;
    }

    // Debounce AJAX request by 250ms
    autocompleteDebounceTimer = setTimeout(() => {
        fetchLocationSuggestions(query);
    }, 250);
}

/**
 * Fetch matching location suggestions via OpenWeatherMap Geocoding API
 */
async function fetchLocationSuggestions(query) {
    try {
        const url = `${GEO_API_URL}?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            hideSuggestions();
            return;
        }

        const locations = await response.json();
        renderSuggestions(locations);
    } catch (err) {
        console.error('Geocoding AJAX error:', err);
        hideSuggestions();
    }
}

/**
 * Render Autocomplete Dropdown List HTML
 */
function renderSuggestions(locations) {
    if (!suggestionsList) return;
    suggestionsList.innerHTML = '';

    if (!locations || locations.length === 0) {
        hideSuggestions();
        return;
    }

    locations.forEach((loc) => {
        const li = document.createElement('li');
        const stateText = loc.state ? `, ${loc.state}` : '';
        const displayName = `${loc.name}${stateText}, ${loc.country}`;
        
        li.innerHTML = `
            <span><i class="fa-solid fa-location-dot" style="margin-right: 8px; color: #38bdf8;"></i>${displayName}</span>
            <span class="geo-flag">${loc.country}</span>
        `;

        li.addEventListener('click', () => {
            cityInput.value = `${loc.name}, ${loc.country}`;
            hideSuggestions();
            getWeatherDataByCity(cityInput.value, dateInput.value);
        });

        suggestionsList.appendChild(li);
    });

    suggestionsList.classList.remove('hidden');
}

function hideSuggestions() {
    if (suggestionsList) {
        suggestionsList.classList.add('hidden');
        suggestionsList.innerHTML = '';
    }
}

/* ==========================================================================
   2. LIVE GEOLOCATION FETCHING
   ========================================================================== */

/**
 * Fetch User's Live Geolocation Coordinates
 * @param {boolean} isInitialLoad - Whether this call is on page load
 */
function fetchUserLiveLocation(isInitialLoad = false) {
    if (!navigator.geolocation) {
        showWelcomeState('Geolocation Unsupported', 'Your browser does not support Geolocation. Please enter a city manually.');
        return;
    }

    showLoading('Accessing your GPS live location...');

    navigator.geolocation.getCurrentPosition(
        // Success Callback
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            getWeatherDataByCoords(lat, lon, dateInput.value);
        },
        // Error / Permission Denied Callback
        (error) => {
            console.warn('Geolocation failed/denied:', error.message);
            showWelcomeState(
                'Live Location Disabled or Unavailable',
                'Location access was denied or could not be detected. Please manually enter a city name or select a quick city below.'
            );
        },
        { timeout: 8000, enableHighAccuracy: true }
    );
}

/* ==========================================================================
   3. AJAX WEATHER FETCHING VIA OPENWEATHERMAP API
   ========================================================================== */

/**
 * Fetch Weather Data by Coordinates (Latitude & Longitude)
 */
async function getWeatherDataByCoords(lat, lon, selectedDateStr) {
    showLoading(`Fetching live weather for coordinates (${lat.toFixed(2)}, ${lon.toFixed(2)})...`);

    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = new Date(selectedDateStr);
    const today = new Date(todayStr);
    const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    try {
        let url;
        if (diffDays > 0 && diffDays <= 5) {
            // Forecast Endpoint by Coords
            url = `${FORECAST_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                showError(`API Error ${response.status}`, data.message);
                return;
            }
            processForecastData(data, selectedDateStr, diffDays);
        } else {
            // Current Weather Endpoint by Coords
            url = `${WEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                showError(`API Error ${response.status}`, data.message);
                return;
            }

            dateNoticeText.textContent = `📍 Live Weather fetched via GPS Coordinates (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
            dateNotice.classList.remove('hidden');

            renderWeatherData(data);
            await fetchForecastStrip(`${FORECAST_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`, todayStr, todayStr);
        }
    } catch (err) {
        console.error('AJAX Fetch Error:', err);
        showError('Network Error', 'Failed to connect to OpenWeatherMap API.');
    }
}

/**
 * Fetch Weather Data by City Name
 */
async function getWeatherDataByCity(city, selectedDateStr) {
    showLoading(`Fetching weather for ${city}...`);

    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = new Date(selectedDateStr);
    const today = new Date(todayStr);
    const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    try {
        if (diffDays > 0 && diffDays <= 5) {
            // Forecast Endpoint
            const url = `${FORECAST_API_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                handleApiError(response.status, data.message, city);
                return;
            }
            processForecastData(data, selectedDateStr, diffDays);
        } else {
            // Current Weather Endpoint
            const url = `${WEATHER_API_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                handleApiError(response.status, data.message, city);
                return;
            }

            if (diffDays !== 0) {
                dateNoticeText.textContent = `Note: OpenWeatherMap Free Tier provides 5-day forecast. Showing current weather for ${data.name}.`;
                dateNotice.classList.remove('hidden');
            } else {
                dateNotice.classList.add('hidden');
            }

            renderWeatherData(data);
            await fetchForecastStrip(`${FORECAST_API_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`, data.name, todayStr);
        }
    } catch (err) {
        console.error('AJAX Fetch Error:', err);
        showError('Network Error', 'Failed to connect to OpenWeatherMap API.');
    }
}

async function fetchForecastStrip(url, cityName, selectedDateStr) {
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && data.list && data.city) {
            renderForecastStrip(data, selectedDateStr);
        }
    } catch (err) {
        console.warn(`Forecast strip unavailable for ${cityName}:`, err.message);
        forecastSection.classList.add('hidden');
    }
}

/**
 * Helper to process 5-day forecast response
 */
function processForecastData(data, targetDateStr, diffDays) {
    const matchingEntries = data.list.filter(item => item.dt_txt.startsWith(targetDateStr));

    if (matchingEntries.length === 0) {
        showError('Forecast Date Unavailable', `No forecast entry found for ${targetDateStr}. Please select a date within the next 5 days.`);
        return;
    }

    // Select midday forecast entry (or first entry for that date)
    const selectedEntry = matchingEntries.find(item => item.dt_txt.includes('12:00:00')) || matchingEntries[0];

    // Compute min and max temp across all 3-hour forecasts for that day
    const minTemps = matchingEntries.map(e => e.main.temp_min);
    const maxTemps = matchingEntries.map(e => e.main.temp_max);
    const dayMin = Math.min(...minTemps);
    const dayMax = Math.max(...maxTemps);

    const payload = {
        name: data.city.name,
        sys: { country: data.city.country },
        main: {
            ...selectedEntry.main,
            temp_min: dayMin,
            temp_max: dayMax
        },
        weather: selectedEntry.weather,
        rain: selectedEntry.rain || {},
        wind: selectedEntry.wind,
        visibility: selectedEntry.visibility || 10000
    };

    dateNoticeText.textContent = `Live 5-Day Forecast prediction for ${targetDateStr} (+${diffDays} day${diffDays > 1 ? 's' : ''})`;
    dateNotice.classList.remove('hidden');

    renderForecastStrip(data, targetDateStr);
    renderWeatherData(payload, targetDateStr);
}

function renderForecastStrip(data, selectedDateStr) {
    const forecastByDate = data.list.reduce((dates, item) => {
        const date = item.dt_txt.split(' ')[0];
        dates[date] = dates[date] || [];
        dates[date].push(item);
        return dates;
    }, {});

    forecastGrid.innerHTML = '';
    Object.entries(forecastByDate).slice(0, 5).forEach(([date, entries]) => {
        const midday = entries.find((entry) => entry.dt_txt.includes('12:00:00')) || entries[0];
        const low = Math.min(...entries.map((entry) => entry.main.temp_min));
        const high = Math.max(...entries.map((entry) => entry.main.temp_max));
        const card = document.createElement('button');
        const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
        card.className = `forecast-item${date === selectedDateStr ? ' is-selected' : ''}`;
        card.type = 'button';
        card.innerHTML = `
            <span class="forecast-day">${dateLabel}</span>
            <span class="forecast-date">${date.slice(5).replace('-', '/')}</span>
            <img src="https://openweathermap.org/img/wn/${midday.weather[0].icon}.png" alt="${midday.weather[0].description}">
            <strong>${Math.round(midday.main.temp)}°</strong>
            <span class="forecast-high-low">${Math.round(high)}° / ${Math.round(low)}°</span>
        `;
        card.addEventListener('click', () => {
            dateInput.value = date;
            getWeatherDataByCity(`${data.city.name}, ${data.city.country}`, date);
        });
        forecastGrid.appendChild(card);
    });

    forecastSection.classList.toggle('hidden', forecastGrid.children.length === 0);
}

/* ==========================================================================
   4. DOM RENDERING & UI STATES
   ========================================================================== */

/**
 * Dynamically render parsed JSON payload into DOM
 */
function renderWeatherData(data, targetDateStr = null) {
    cityNameEl.textContent = `${data.name}, ${data.sys.country}`;
    currentPlace = { name: data.name, country: data.sys.country };
    cityInput.value = data.name;

    // Date formatting
    const displayDate = targetDateStr ? new Date(targetDateStr + 'T12:00:00') : new Date();
    currentDateEl.textContent = displayDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    // Weather Metrics (Temperature, Feels Like, Min Temp, Max Temp)
    tempEl.textContent = Math.round(data.main.temp);
    feelsLikeEl.textContent = Math.round(data.main.feels_like);
    tempMinEl.textContent = `${Math.round(data.main.temp_min)} °C`;
    tempMaxEl.textContent = `${Math.round(data.main.temp_max)} °C`;

    weatherDescEl.textContent = data.weather[0].description;
    weatherBadgeEl.textContent = data.weather[0].main;

    // Weather Icon
    const iconCode = data.weather[0].icon;
    updateWeatherScene(data.weather[0].main, iconCode, data.rain, data.weather[0].id, data.wind.speed);
    updateFavoriteButton();
    weatherIconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    weatherIconEl.alt = data.weather[0].description;

    // Grid Metrics
    humidityEl.textContent = `${data.main.humidity}%`;
    windSpeedEl.textContent = `${data.wind.speed} m/s`;
    pressureEl.textContent = `${data.main.pressure} hPa`;
    visibilityEl.textContent = `${(data.visibility / 1000).toFixed(1)} km`;

    // Raw JSON Inspector Output
    jsonOutputEl.querySelector('code').textContent = JSON.stringify(data, null, 2);

    showWeatherCard();
}

function handleApiError(status, message, city) {
    if (status === 401) {
        showError('API Key Error (401)', 'Invalid API key or key activation pending.');
    } else if (status === 404) {
        showError('City Not Found (404)', `Could not find weather data for "${city}". Please check spelling.`);
    } else {
        showError(`Error ${status}`, message || 'Failed to fetch weather data.');
    }
}

// UI State Functions
function showLoading(text) {
    loaderText.textContent = text || 'Fetching JSON weather data via AJAX...';
    welcomeCard.classList.add('hidden');
    loader.classList.remove('hidden');
    errorCard.classList.add('hidden');
    weatherCard.classList.add('hidden');
    forecastSection.classList.add('hidden');
}

function showWeatherCard() {
    welcomeCard.classList.add('hidden');
    loader.classList.add('hidden');
    errorCard.classList.add('hidden');
    weatherCard.classList.remove('hidden');
}

function showError(title, message) {
    welcomeCard.classList.add('hidden');
    loader.classList.add('hidden');
    weatherCard.classList.add('hidden');
    forecastSection.classList.add('hidden');
    errorTitle.textContent = title;
    errorMessage.textContent = message;
    errorCard.classList.remove('hidden');
}

function showWelcomeState(title, message) {
    loader.classList.add('hidden');
    weatherCard.classList.add('hidden');
    errorCard.classList.add('hidden');
    
    if (title && message) {
        welcomeCard.querySelector('h3').textContent = title;
        welcomeText.textContent = message;
    }
    welcomeCard.classList.remove('hidden');
}
