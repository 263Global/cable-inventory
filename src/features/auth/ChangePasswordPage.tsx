import { useState, type FormEvent } from 'react'
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/useAuth'

const MIN_PASSWORD_LENGTH = 8

export function ChangePasswordPage() {
    const { user, changePassword } = useAuth()
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault()

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
            return
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setError('')
        setSaving(true)

        try {
            await changePassword(newPassword)
            setNewPassword('')
            setConfirmPassword('')
            toast.success('Password updated')
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to change password'
            setError(message)
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-8">
                <KeyRound className="h-7 w-7 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">Change Password</h1>
                    <p className="text-sm text-text-dim mt-1">Update the password for your signed-in account.</p>
                </div>
            </div>

            <div className="bg-surface rounded-xl border border-border-subtle p-6">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-background border border-border-subtle mb-6">
                    <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-medium">Account security</p>
                        <p className="text-sm text-text-muted mt-1">
                            Signed in as <span className="font-medium text-text">{user?.email ?? 'current user'}</span>.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
                    <div>
                        <label htmlFor="new-password" className="block text-sm font-medium text-text-muted mb-1.5">
                            New Password
                        </label>
                        <input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim"
                            placeholder="Enter a new password"
                            autoComplete="new-password"
                            required
                        />
                        <p className="text-xs text-text-dim mt-1.5">Use at least {MIN_PASSWORD_LENGTH} characters.</p>
                    </div>

                    <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-text-muted mb-1.5">
                            Confirm New Password
                        </label>
                        <input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim"
                            placeholder="Re-enter the new password"
                            autoComplete="new-password"
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
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Update Password
                    </button>
                </form>
            </div>
        </div>
    )
}
