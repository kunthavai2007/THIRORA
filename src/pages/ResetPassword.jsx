import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function ResetPassword() {
    const navigate = useNavigate()

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    async function handleSubmit(event) {
        event.preventDefault()

        setError('')
        setMessage('')

        if (!password || password.length < 8) {
            setError('Password must be at least 8 characters long.')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setLoading(true)

        try {
            const { error: updateError } =
                await supabase.auth.updateUser({
                    password,
                })

            if (updateError) {
                throw updateError
            }

            setMessage(
                'Your password has been updated successfully.'
            )

            setPassword('')
            setConfirmPassword('')

            setTimeout(() => {
                navigate('/login', { replace: true })
            }, 1500)
        } catch (err) {
            setError(
                err?.message ||
                'Unable to reset your password. Please try again.'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '430px',
                }}
            >
                <div
                    style={{
                        padding: '32px',
                        borderRadius: '20px',
                        border: '1px solid rgba(0,0,0,0.08)',
                    }}
                >
                    <h1>Reset Password</h1>

                    <p>
                        Enter your new password below.
                    </p>

                    {error && (
                        <div
                            role="alert"
                            style={{
                                marginBottom: '16px',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {message && (
                        <div
                            role="status"
                            style={{
                                marginBottom: '16px',
                            }}
                        >
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <label htmlFor="new-password">
                                New Password
                            </label>

                            <input
                                id="new-password"
                                type="password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                placeholder="Enter new password"
                                autoComplete="new-password"
                                disabled={loading}
                                required
                                style={{
                                    width: '100%',
                                    marginTop: '8px',
                                    padding: '12px',
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label htmlFor="confirm-password">
                                Confirm Password
                            </label>

                            <input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(event) =>
                                    setConfirmPassword(event.target.value)
                                }
                                placeholder="Confirm new password"
                                autoComplete="new-password"
                                disabled={loading}
                                required
                                style={{
                                    width: '100%',
                                    marginTop: '8px',
                                    padding: '12px',
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '13px',
                            }}
                        >
                            {loading
                                ? 'Updating...'
                                : 'Update Password'}
                        </button>
                    </form>

                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        disabled={loading}
                        style={{
                            width: '100%',
                            marginTop: '12px',
                            padding: '12px',
                        }}
                    >
                        Back to Sign In
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ResetPassword