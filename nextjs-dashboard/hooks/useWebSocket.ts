import { useState, useEffect, useCallback, useRef } from 'react'

interface SensorData {
  type: string
  device: string
  voc: number
  pm25: number
  pm10: number
  eco2?: number
  h2?: number
  ethanol?: number
  pressure: number
  altitude?: number
  temp_bmp: number
  temperature?: number
  humidity?: number
  relay_state: string
  status?: string
  heap?: number
  rssi?: number
  ml_mode?: boolean
  source?: string
  wifi_status?: string
  timestamp?: string
}

interface UseWebSocketReturn {
  sensorData: SensorData | null
  isConnected: boolean
  history: SensorData[]
  aiAnalysis: string | null
  lastDataTime: number | null
}

const DATA_TIMEOUT = 15000 // 15 seconds - if no data for 15s, consider disconnected

export default function useWebSocket(url: string): UseWebSocketReturn {
  const [sensorData, setSensorData] = useState<SensorData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [history, setHistory] = useState<SensorData[]>([])
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [lastDataTime, setLastDataTime] = useState<number | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let websocket: WebSocket

    const connect = () => {
      websocket = new WebSocket(url)

      websocket.onopen = () => {
        console.log('WebSocket connected to server')
        setWsConnected(true)
      }

      websocket.onclose = () => {
        console.log('WebSocket disconnected from server')
        setWsConnected(false)
        setIsConnected(false)
        setLastDataTime(null)
        // Reconnect after 3 seconds
        setTimeout(connect, 3000)
      }

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error)
        setWsConnected(false)
        setIsConnected(false)
      }

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'sensor_data' || data.type === 'sensor_update') {
            const now = Date.now()
            // Normalize data structure
            const normalizedData = {
              ...data,
              type: 'sensor_data',
              // Handle both temperature field names
              temp_bmp: data.temp_bmp || data.temperature || 0,
              temperature: data.temperature || data.temp_bmp || 0,
              // Ensure PM10 is included
              pm10: data.pm10 || 0,
              pm25: data.pm25 || 0,
            }
            // Debug: Log PM10 data
            if (data.pm10 !== undefined) {
              console.log('[WebSocket] PM10 received:', data.pm10)
            }
            setSensorData(normalizedData)
            setLastDataTime(now)
            setIsConnected(true) // Mark as connected when we receive data
            
            // Clear existing timeout
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
            }
            
            // Set new timeout - if no data for 15 seconds, mark as disconnected
            timeoutRef.current = setTimeout(() => {
              console.log('No sensor data for 15 seconds - marking as disconnected')
              setIsConnected(false)
            }, DATA_TIMEOUT)
            
            setHistory((prev) => {
              const newHistory = [...prev, data]
              // Keep only last 50 data points
              return newHistory.slice(-50)
            })
          } else if (data.type === 'ai_response') {
            setAiAnalysis(data.text)
          } else if (data.type === 'device_status') {
            // Handle device status updates from server
            if (data.status === 'offline') {
              setIsConnected(false)
              setLastDataTime(null)
            }
          }
        } catch (error) {
          console.error('Error parsing message:', error)
        }
      }

      wsRef.current = websocket
    }

    connect()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [url])

  // Check connection status based on last data time
  useEffect(() => {
    if (lastDataTime === null) {
      setIsConnected(false)
      return
    }

    const checkInterval = setInterval(() => {
      const now = Date.now()
      const timeSinceLastData = now - lastDataTime
      
      if (timeSinceLastData > DATA_TIMEOUT) {
        setIsConnected(false)
      }
    }, 1000) // Check every second

    return () => clearInterval(checkInterval)
  }, [lastDataTime])

  return { sensorData, isConnected, history, aiAnalysis, lastDataTime }
}

