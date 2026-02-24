import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout() {
    return (
        <div className="min-h-screen bg-background">
            <Sidebar />
            <main className="md:ml-64 min-h-screen">
                <div className="p-4 pt-16 md:p-8 md:pt-8">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
