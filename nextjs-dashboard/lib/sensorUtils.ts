// AQI Calculation based on EPA Breakpoints for PM2.5
// Reference: https://www.airnow.gov/aqi/aqi-basics/

interface AQIBreakpoint {
    cLow: number
    cHigh: number
    iLow: number
    iHigh: number
    label: string
    color: string
    bgClass: string
}

const PM25_BREAKPOINTS: AQIBreakpoint[] = [
    { cLow: 0, cHigh: 12, iLow: 0, iHigh: 50, label: 'Good', color: '#34d399', bgClass: 'from-emerald-400 to-green-500' },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100, label: 'Moderate', color: '#fbbf24', bgClass: 'from-amber-400 to-yellow-500' },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150, label: 'Unhealthy (Sensitive)', color: '#fb923c', bgClass: 'from-orange-400 to-orange-500' },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200, label: 'Unhealthy', color: '#fb7185', bgClass: 'from-rose-400 to-red-500' },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300, label: 'Very Unhealthy', color: '#a78bfa', bgClass: 'from-violet-400 to-purple-500' },
    { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500, label: 'Hazardous', color: '#ef4444', bgClass: 'from-red-500 to-red-700' },
]

export interface AQIResult {
    value: number
    label: string
    color: string
    bgClass: string
}

export function calculateAQI(pm25: number): AQIResult {
    if (pm25 < 0) pm25 = 0

    for (const bp of PM25_BREAKPOINTS) {
        if (pm25 >= bp.cLow && pm25 <= bp.cHigh) {
            const aqi = Math.round(
                ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (pm25 - bp.cLow) + bp.iLow
            )
            return { value: aqi, label: bp.label, color: bp.color, bgClass: bp.bgClass }
        }
    }

    // Above 500
    return {
        value: 500,
        label: 'Hazardous',
        color: '#ef4444',
        bgClass: 'from-red-500 to-red-700',
    }
}

// Heat Index calculation (Rothfusz regression)
// Reference: https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml
export interface HeatIndexResult {
    value: number
    label: string
    color: string
    bgClass: string
}

export function calculateHeatIndex(tempC: number, humidity: number): HeatIndexResult {
    // Convert to Fahrenheit for the formula
    const T = (tempC * 9) / 5 + 32
    const RH = humidity

    let HI: number

    // Simple formula for low conditions
    const simple = 0.5 * (T + 61.0 + (T - 68.0) * 1.2 + RH * 0.094)

    if (simple < 80) {
        HI = simple
    } else {
        // Full Rothfusz regression
        HI =
            -42.379 +
            2.04901523 * T +
            10.14333127 * RH -
            0.22475541 * T * RH -
            0.00683783 * T * T -
            0.05481717 * RH * RH +
            0.00122874 * T * T * RH +
            0.00085282 * T * RH * RH -
            0.00000199 * T * T * RH * RH

        // Adjustments
        if (RH < 13 && T >= 80 && T <= 112) {
            HI -= ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17)
        }
        if (RH > 85 && T >= 80 && T <= 87) {
            HI += ((RH - 85) / 10) * ((87 - T) / 5)
        }
    }

    // Convert back to Celsius
    const hiCelsius = ((HI - 32) * 5) / 9

    // Categorize
    let label: string
    let color: string
    let bgClass: string

    if (hiCelsius < 27) {
        label = 'Comfortable'
        color = '#34d399'
        bgClass = 'from-emerald-400 to-green-500'
    } else if (hiCelsius < 32) {
        label = 'Caution'
        color = '#fbbf24'
        bgClass = 'from-amber-400 to-yellow-500'
    } else if (hiCelsius < 39) {
        label = 'Extreme Caution'
        color = '#fb923c'
        bgClass = 'from-orange-400 to-orange-500'
    } else if (hiCelsius < 51) {
        label = 'Danger'
        color = '#fb7185'
        bgClass = 'from-rose-400 to-red-500'
    } else {
        label = 'Extreme Danger'
        color = '#ef4444'
        bgClass = 'from-red-500 to-red-700'
    }

    return { value: Math.round(hiCelsius * 10) / 10, label, color, bgClass }
}

// Min / Max / Avg calculator
export interface SensorStats {
    min: number
    max: number
    avg: number
}

export function calculateStats(values: number[]): SensorStats {
    if (values.length === 0) return { min: 0, max: 0, avg: 0 }

    const filtered = values.filter((v) => v != null && !isNaN(v) && v > 0)
    if (filtered.length === 0) return { min: 0, max: 0, avg: 0 }

    const min = Math.min(...filtered)
    const max = Math.max(...filtered)
    const avg = filtered.reduce((a, b) => a + b, 0) / filtered.length

    return {
        min: Math.round(min * 10) / 10,
        max: Math.round(max * 10) / 10,
        avg: Math.round(avg * 10) / 10,
    }
}
