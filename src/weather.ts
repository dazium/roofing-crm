export type WeatherDaySnapshot = {
  date: string
  summary: string
  highTempC: number | null
  lowTempC: number | null
  rainChance: number | null
  precipitationMm: number | null
  windKph: number | null
  weatherCode: number | null
  roofingRisk: string
}

export type JobWeatherSnapshot = {
  addressLabel: string
  targetDate: string
  cityLabel: string
  summary: string
  currentTempC: number | null
  currentWindKph: number | null
  highTempC: number | null
  lowTempC: number | null
  rainChance: number | null
  precipitationMm: number | null
  weatherCode: number | null
  roofingRisk: string
  daily: WeatherDaySnapshot[]
}

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Heavy rain showers',
  82: 'Violent rain showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm with hail',
}

function describeWeatherCode(code: number | null | undefined) {
  if (code == null) return 'Forecast unavailable'
  return WEATHER_CODES[code] ?? 'Weather update available'
}

function assessRoofingRisk(args: {
  rainChance: number | null
  precipitationMm: number | null
  maxWindKph: number | null
  lowTempC: number | null
  weatherCode: number | null
}) {
  const { rainChance, precipitationMm, maxWindKph, lowTempC, weatherCode } = args

  if (weatherCode != null && weatherCode >= 95) return 'High risk, thunderstorms expected'
  if ((precipitationMm ?? 0) >= 5 || (rainChance ?? 0) >= 70) return 'High rain risk, rough roofing day'
  if ((maxWindKph ?? 0) >= 35) return 'High wind risk, watch tear-off and shingle handling'
  if ((lowTempC ?? 99) <= 0) return 'Cold-weather caution, adhesives and sealants may not cooperate'
  if ((precipitationMm ?? 0) > 0 || (rainChance ?? 0) >= 35) return 'Some weather risk, keep an eye on timing'
  return 'Good roofing window'
}

export async function fetchJobWeather(address: string, targetDate?: string): Promise<JobWeatherSnapshot> {
  const trimmed = address.trim()
  if (!trimmed) {
    throw new Error('Missing project address')
  }

  const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=en&format=json`
  const geocodeResponse = await fetch(geocodeUrl)
  if (!geocodeResponse.ok) {
    throw new Error('Could not look up the project location')
  }

  const geocodeData = await geocodeResponse.json() as {
    results?: Array<{ latitude: number; longitude: number; name: string; admin1?: string; country?: string }>
  }

  const match = geocodeData.results?.[0]
  if (!match) {
    throw new Error('Could not match that project address to a weather location')
  }

  const date = targetDate || new Date().toISOString().slice(0, 10)
  const startDate = new Date(date)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 4)
  const endDateLabel = endDate.toISOString().slice(0, 10)
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${match.latitude}&longitude=${match.longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&start_date=${date}&end_date=${endDateLabel}`
  const weatherResponse = await fetch(weatherUrl)
  if (!weatherResponse.ok) {
    throw new Error('Could not load the weather forecast')
  }

  const weatherData = await weatherResponse.json() as {
    current?: { temperature_2m?: number; weather_code?: number; wind_speed_10m?: number }
    daily?: {
      time?: string[]
      weather_code?: number[]
      temperature_2m_max?: number[]
      temperature_2m_min?: number[]
      precipitation_sum?: number[]
      precipitation_probability_max?: number[]
      wind_speed_10m_max?: number[]
    }
  }

  const daily = weatherData.daily
  const cityBits = [match.name, match.admin1, match.country].filter(Boolean)
  const dailySnapshots: WeatherDaySnapshot[] = (daily?.time ?? []).map((day, index) => {
    const dayWeatherCode = daily?.weather_code?.[index] ?? null
    const dayHigh = daily?.temperature_2m_max?.[index] ?? null
    const dayLow = daily?.temperature_2m_min?.[index] ?? null
    const dayRainChance = daily?.precipitation_probability_max?.[index] ?? null
    const dayPrecip = daily?.precipitation_sum?.[index] ?? null
    const dayWind = daily?.wind_speed_10m_max?.[index] ?? null

    return {
      date: day,
      summary: describeWeatherCode(dayWeatherCode),
      highTempC: dayHigh,
      lowTempC: dayLow,
      rainChance: dayRainChance,
      precipitationMm: dayPrecip,
      windKph: dayWind,
      weatherCode: dayWeatherCode,
      roofingRisk: assessRoofingRisk({
        rainChance: dayRainChance,
        precipitationMm: dayPrecip,
        maxWindKph: dayWind,
        lowTempC: dayLow,
        weatherCode: dayWeatherCode,
      }),
    }
  })

  const primaryDay = dailySnapshots[0]
  const weatherCode = primaryDay?.weatherCode ?? weatherData.current?.weather_code ?? null
  const highTempC = primaryDay?.highTempC ?? null
  const lowTempC = primaryDay?.lowTempC ?? null
  const rainChance = primaryDay?.rainChance ?? null
  const precipitationMm = primaryDay?.precipitationMm ?? null
  const maxWindKph = primaryDay?.windKph ?? weatherData.current?.wind_speed_10m ?? null

  return {
    addressLabel: trimmed,
    targetDate: date,
    cityLabel: cityBits.join(', '),
    summary: describeWeatherCode(weatherCode),
    currentTempC: weatherData.current?.temperature_2m ?? null,
    currentWindKph: weatherData.current?.wind_speed_10m ?? null,
    highTempC,
    lowTempC,
    rainChance,
    precipitationMm,
    weatherCode,
    roofingRisk: assessRoofingRisk({ rainChance, precipitationMm, maxWindKph, lowTempC, weatherCode }),
    daily: dailySnapshots,
  }
}
