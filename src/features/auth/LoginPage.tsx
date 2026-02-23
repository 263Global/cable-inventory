import { useState, type FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Cable, Loader2 } from 'lucide-react'

export function LoginPage() {
    const { signIn } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const { error } = await signIn(email, password)
        if (error) {
            setError(error.message)
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <Cable className="h-10 w-10 text-primary" />
                        <span className="text-3xl font-bold tracking-tight">CableTrack</span>
                    </div>
                    <p className="text-text-muted text-sm">Cable Inventory Management System</p>
                </div>

                {/* Login card */}
                <div className="bg-surface rounded-xl border border-border-subtle p-6">
                    <h2 className="text-lg font-semibold mb-6">Sign in</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-text-muted mb-1.5">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim"
                                placeholder="you@company.com"
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-text-muted mb-1.5">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && (
                            <div className="text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
