'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface User {
    id: number
    username: string
    role: string
}

interface AuthContextType {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>
    logout: () => void
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    login: async () => ({ success: false }),
    logout: () => { },
})

export function useAuth() {
    return useContext(AuthContext)
}

const API_URL = 'http://localhost:3000'

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Validate token on mount
    useEffect(() => {
        const token = localStorage.getItem('cleankiln_token')
        if (!token) {
            setIsLoading(false)
            return
        }

        fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setUser(data.user)
                } else {
                    localStorage.removeItem('cleankiln_token')
                    localStorage.removeItem('cleankiln_user')
                }
            })
            .catch(() => {
                localStorage.removeItem('cleankiln_token')
                localStorage.removeItem('cleankiln_user')
            })
            .finally(() => setIsLoading(false))
    }, [])

    const login = useCallback(async (username: string, password: string) => {
        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            })
            const data = await res.json()

            if (data.success) {
                localStorage.setItem('cleankiln_token', data.token)
                localStorage.setItem('cleankiln_user', JSON.stringify(data.user))
                setUser(data.user)
                return { success: true }
            } else {
                return { success: false, message: data.message }
            }
        } catch (err) {
            return { success: false, message: 'Connection error — is the server running?' }
        }
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem('cleankiln_token')
        localStorage.removeItem('cleankiln_user')
        setUser(null)
    }, [])

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}
