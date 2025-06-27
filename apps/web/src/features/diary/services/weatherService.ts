interface WeatherData {
  temperature: { min: number; max: number; unit: string };
  conditions: string;
  description: string;
  humidity: number;
  wind: { speed: number; direction: string; unit: string };
  precipitation: { amount: number; probability: number };
  uv_index: number;
  sunrise: string;
  sunset: string;
  fetched_at: string;
  source: string;
}

interface LocationCoordinates {
  lat: number;
  lon: number;
}

class WeatherService {
  private apiKey: string;
  private baseUrl: string;
  private cacheDuration: number = 3600000; // 1 hour in milliseconds
  private cache: Map<string, { data: WeatherData; timestamp: number }> = new Map();

  constructor() {
    // In production, this should come from environment variables
    this.apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '';
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
  }

  /**
   * Get weather data for a specific location
   */
  async getWeatherByLocation(location: string, date?: Date): Promise<WeatherData | null> {
    try {
      // Check cache first
      const cacheKey = `${location}-${date?.toISOString().split('T')[0] || 'today'}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // Get coordinates for location
      const coordinates = await this.geocodeLocation(location);
      if (!coordinates) {
        console.error('Could not geocode location:', location);
        return null;
      }

      // Fetch weather data
      const weather = date && this.isFutureDate(date)
        ? await this.getForecastWeather(coordinates, date)
        : await this.getCurrentWeather(coordinates);

      if (weather) {
        this.saveToCache(cacheKey, weather);
      }

      return weather;
    } catch (error) {
      console.error('Error fetching weather:', error);
      return null;
    }
  }

  /**
   * Get weather by coordinates
   */
  async getWeatherByCoordinates(lat: number, lon: number): Promise<WeatherData | null> {
    try {
      const cacheKey = `${lat},${lon}-today`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const weather = await this.getCurrentWeather({ lat, lon });
      if (weather) {
        this.saveToCache(cacheKey, weather);
      }

      return weather;
    } catch (error) {
      console.error('Error fetching weather by coordinates:', error);
      return null;
    }
  }

  /**
   * Get current weather data
   */
  private async getCurrentWeather(coords: LocationCoordinates): Promise<WeatherData | null> {
    if (!this.apiKey) {
      console.warn('Weather API key not configured');
      return this.getMockWeatherData();
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${this.apiKey}&units=metric`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      return this.transformWeatherData(data);
    } catch (error) {
      console.error('Error fetching current weather:', error);
      return this.getMockWeatherData();
    }
  }

  /**
   * Get forecast weather data
   */
  private async getForecastWeather(coords: LocationCoordinates, date: Date): Promise<WeatherData | null> {
    if (!this.apiKey) {
      console.warn('Weather API key not configured');
      return this.getMockWeatherData();
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${this.apiKey}&units=metric`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Find the forecast closest to the requested date
      const targetTime = date.getTime();
      let closestForecast = data.list[0];
      let minDiff = Math.abs(new Date(data.list[0].dt * 1000).getTime() - targetTime);

      for (const forecast of data.list) {
        const forecastTime = new Date(forecast.dt * 1000).getTime();
        const diff = Math.abs(forecastTime - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestForecast = forecast;
        }
      }

      return this.transformForecastData(closestForecast, data.city);
    } catch (error) {
      console.error('Error fetching forecast weather:', error);
      return this.getMockWeatherData();
    }
  }

  /**
   * Geocode a location string to coordinates
   */
  private async geocodeLocation(location: string): Promise<LocationCoordinates | null> {
    if (!this.apiKey) {
      // Return mock coordinates for development
      return { lat: 51.5074, lon: -0.1278 }; // London
    }

    try {
      const response = await fetch(
        `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.length === 0) {
        return null;
      }

      return { lat: data[0].lat, lon: data[0].lon };
    } catch (error) {
      console.error('Error geocoding location:', error);
      return null;
    }
  }

  /**
   * Transform OpenWeatherMap data to our format
   */
  private transformWeatherData(data: any): WeatherData {
    const sunrise = new Date(data.sys.sunrise * 1000);
    const sunset = new Date(data.sys.sunset * 1000);

    return {
      temperature: {
        min: Math.round(data.main.temp_min),
        max: Math.round(data.main.temp_max),
        unit: 'C',
      },
      conditions: data.weather[0].main,
      description: data.weather[0].description
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      humidity: data.main.humidity,
      wind: {
        speed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
        direction: this.getWindDirection(data.wind.deg),
        unit: 'km/h',
      },
      precipitation: {
        amount: data.rain?.['1h'] || 0,
        probability: data.pop ? Math.round(data.pop * 100) : 0,
      },
      uv_index: data.uvi || 0,
      sunrise: sunrise.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      sunset: sunset.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      fetched_at: new Date().toISOString(),
      source: 'OpenWeatherMap',
    };
  }

  /**
   * Transform forecast data to our format
   */
  private transformForecastData(forecast: any, city: any): WeatherData {
    const sunrise = new Date(city.sunrise * 1000);
    const sunset = new Date(city.sunset * 1000);

    return {
      temperature: {
        min: Math.round(forecast.main.temp_min),
        max: Math.round(forecast.main.temp_max),
        unit: 'C',
      },
      conditions: forecast.weather[0].main,
      description: forecast.weather[0].description
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      humidity: forecast.main.humidity,
      wind: {
        speed: Math.round(forecast.wind.speed * 3.6), // Convert m/s to km/h
        direction: this.getWindDirection(forecast.wind.deg),
        unit: 'km/h',
      },
      precipitation: {
        amount: forecast.rain?.['3h'] || 0,
        probability: forecast.pop ? Math.round(forecast.pop * 100) : 0,
      },
      uv_index: 0, // Not available in forecast
      sunrise: sunrise.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      sunset: sunset.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      fetched_at: new Date().toISOString(),
      source: 'OpenWeatherMap',
    };
  }

  /**
   * Convert wind degrees to direction
   */
  private getWindDirection(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  /**
   * Check if date is in the future
   */
  private isFutureDate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): WeatherData | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Save to cache
   */
  private saveToCache(key: string, data: WeatherData): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get mock weather data for development/fallback
   */
  private getMockWeatherData(): WeatherData {
    return {
      temperature: { min: 15, max: 25, unit: 'C' },
      conditions: 'Partly Cloudy',
      description: 'Partly Cloudy With Light Winds',
      humidity: 65,
      wind: { speed: 12, direction: 'NW', unit: 'km/h' },
      precipitation: { amount: 0, probability: 10 },
      uv_index: 6,
      sunrise: '06:30',
      sunset: '18:45',
      fetched_at: new Date().toISOString(),
      source: 'Mock Data',
    };
  }
}

// Export singleton instance
export const weatherService = new WeatherService();
export type { WeatherData, LocationCoordinates };