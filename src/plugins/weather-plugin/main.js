/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * Weather Plugin - Main Module
 * 
 * ╔══════════════════════════════════════════════════════════════╗
 * ║ Weather data provider for Internet Server browser            ║
 * ║ Demonstrates plugin API usage with sidebar and toolbar icons ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * FEATURES:
 * - [+] Current weather conditions
 * - [+] 5-day forecast 
 * - [+] Temperature units toggle
 * - [+] Location detection
 * - [+] Custom location setting
 * - [+] Weather alert notifications
 * 
 * (c) 2025 ZARI CORP - DISTRIBUTE FREELY
 */

// Default settings
const DEFAULT_SETTINGS = {
    location: 'auto',
    units: 'metric', // metric or imperial
    refreshInterval: 30, // minutes
    showNotifications: true
};

// Cache for weather data
let weatherCache = null;
let forecastCache = null;
let lastUpdate = 0;

/**
 * ██████████████████████████████████████████████████
 * █ INITIALIZE PLUGIN                              █
 * █ Called when plugin is loaded by browser        █
 * █ Sets up message handlers and loads settings    █
 * ██████████████████████████████████████████████████
 */
exports.initialize = async function(api) {
    try {
        api.logger.log('Weather plugin initializing...');
        
        // Load saved settings
        const savedSettings = await api.storage.get('settings') || {};
        const settings = {...DEFAULT_SETTINGS, ...savedSettings};
        
        // Set up message handlers for UI components
        api.messaging.onMessage('getWeather', async () => {
            const weatherData = await getWeatherData(api, settings);
            api.messaging.sendToRenderer('weatherData', weatherData);
        });
        
        api.messaging.onMessage('getForecast', async () => {
            const forecastData = await getForecastData(api, settings);
            api.messaging.sendToRenderer('forecastData', forecastData);
        });
        
        api.messaging.onMessage('updateSettings', async (newSettings) => {
            // Update settings
            Object.assign(settings, newSettings);
            
            // Save to storage
            await api.storage.set('settings', settings);
            
            // Clear cache if location or units changed
            weatherCache = null;
            forecastCache = null;
            
            // Send updated settings to renderer
            api.messaging.sendToRenderer('settingsUpdated', settings);
            
            // Fetch new data with updated settings
            const weatherData = await getWeatherData(api, settings);
            api.messaging.sendToRenderer('weatherData', weatherData);
        });
        
        // Set up refresh interval
        setInterval(() => {
            refreshWeatherData(api, settings);
        }, settings.refreshInterval * 60 * 1000);
        
        // Initial data fetch
        await refreshWeatherData(api, settings);
        
        api.logger.log('Weather plugin initialized successfully');
        
        return {
            // Public API
            getWeather: async () => getWeatherData(api, settings),
            getForecast: async () => getForecastData(api, settings),
            
            // Cleanup function
            cleanup: () => {
                api.logger.log('Weather plugin cleanup');
                // Clean up any resources or event listeners
            }
        };
    } catch (error) {
        api.logger.error('Failed to initialize weather plugin:', error);
        throw error;
    }
};

/**
 * ██████████████████████████████████████████████████
 * █ FETCH WEATHER DATA                             █
 * █ Gets current weather for configured location   █
 * █ Uses caching to reduce API requests            █
 * ██████████████████████████████████████████████████
 */
async function getWeatherData(api, settings) {
    try {
        // Use cache if available and recent (less than 15 minutes old)
        const now = Date.now();
        if (weatherCache && (now - lastUpdate < 15 * 60 * 1000)) {
            return weatherCache;
        }
        
        // In a real plugin this would call an actual weather API
        // For this demo we'll use mock data
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock weather data
        const weatherData = {
            location: settings.location === 'auto' ? 'Current Location' : settings.location,
            temperature: Math.round(15 + Math.random() * 10),
            units: settings.units === 'metric' ? '°C' : '°F',
            condition: getRandomCondition(),
            humidity: Math.round(40 + Math.random() * 40),
            windSpeed: Math.round(5 + Math.random() * 15),
            windUnits: settings.units === 'metric' ? 'km/h' : 'mph',
            updated: new Date().toLocaleTimeString()
        };
        
        // Update cache
        weatherCache = weatherData;
        lastUpdate = now;
        
        return weatherData;
    } catch (error) {
        api.logger.error('Error fetching weather data:', error);
        
        // Return last cached data or error
        return weatherCache || { error: 'Failed to fetch weather data' };
    }
}

/**
 * ██████████████████████████████████████████████████
 * █ FETCH FORECAST DATA                            █
 * █ Gets 5-day weather forecast                    █
 * █ Uses caching to reduce API requests            █
 * ██████████████████████████████████████████████████
 */
async function getForecastData(api, settings) {
    try {
        // Use cache if available and recent (less than 1 hour old)
        const now = Date.now();
        if (forecastCache && (now - lastUpdate < 60 * 60 * 1000)) {
            return forecastCache;
        }
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Generate 5-day forecast
        const forecast = [];
        const today = new Date();
        
        for (let i = 0; i < 5; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            
            forecast.push({
                day: getDayName(date),
                date: date.toLocaleDateString(),
                high: Math.round(18 + Math.random() * 10),
                low: Math.round(8 + Math.random() * 5),
                units: settings.units === 'metric' ? '°C' : '°F',
                condition: getRandomCondition()
            });
        }
        
        // Update cache
        forecastCache = forecast;
        
        return forecast;
    } catch (error) {
        api.logger.error('Error fetching forecast data:', error);
        
        // Return last cached data or error
        return forecastCache || { error: 'Failed to fetch forecast data' };
    }
}

/**
 * ██████████████████████████████████████████████████
 * █ REFRESH WEATHER DATA                           █
 * █ Updates both current weather and forecast      █
 * █ Sends new data to UI components                █
 * ██████████████████████████████████████████████████
 */
async function refreshWeatherData(api, settings) {
    try {
        // Fetch weather data
        const weatherData = await getWeatherData(api, settings);
        
        // Fetch forecast data
        const forecastData = await getForecastData(api, settings);
        
        // Send to renderer
        api.messaging.sendToRenderer('weatherData', weatherData);
        api.messaging.sendToRenderer('forecastData', forecastData);
        
        // Check for severe weather alerts (demo)
        if (settings.showNotifications && Math.random() < 0.1) {
            // 10% chance of showing a weather alert (for demo purposes)
            api.messaging.sendToRenderer('weatherAlert', {
                title: 'Weather Alert',
                message: 'Heavy rain expected in your area',
                severity: 'warning'
            });
        }
        
        return { weather: weatherData, forecast: forecastData };
    } catch (error) {
        api.logger.error('Error refreshing weather data:', error);
        return null;
    }
}

/**
 * ██████████████████████████████████████████████████
 * █ HELPER FUNCTIONS                               █
 * █ Utility functions for weather data generation  █
 * ██████████████████████████████████████████████████
 */

// Get day name from date
function getDayName(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
}

// Get random weather condition
function getRandomCondition() {
    const conditions = [
        'Sunny', 'Partly Cloudy', 'Cloudy', 
        'Light Rain', 'Rain', 'Thunderstorm',
        'Foggy', 'Snow', 'Windy', 'Clear'
    ];
    
    const index = Math.floor(Math.random() * conditions.length);
    return conditions[index];
}
