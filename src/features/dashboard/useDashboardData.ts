import { useCallback, useEffect, useState } from 'react'
import { fetchDashboardData } from './api'
import { EMPTY_DASHBOARD_DATA, type DashboardData } from './types'

export function useDashboardData() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA)

    const reload = useCallback(async () => {
        setLoading(true)
        try {
            const result = await fetchDashboardData()
            setData(result)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        reload().catch((error) => {
            console.error('Dashboard load error:', error)
        })
    }, [reload])

    return {
        ...data,
        loading,
        reload,
    }
}
