// Reset password page handlers.
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

const form = document.getElementById('reset-form');
const btn = document.getElementById('reset-btn');
const messageDiv = document.getElementById('message');
const messageText = document.getElementById('message-text');
const messageIcon = document.getElementById('message-icon');

function showMessage(text, type) {
    messageDiv.className = `message show ${type}`;
    messageText.textContent = text;
    messageIcon.setAttribute('name', type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline');
}

(async () => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if ((type === 'recovery' || type === 'invite' || type === 'signup') && accessToken && refreshToken) {
        const { data: { session }, error } = await window.SupabaseClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        if (error || !session) {
            showMessage('Invalid or expired link. Please request a new one.', 'error');
            form.style.display = 'none';
            return;
        }

        const subtitle = document.getElementById('subtitle');
        const passwordLabel = document.getElementById('password-label');
        if (type === 'invite' || type === 'signup') {
            subtitle.textContent = 'Welcome! Set your password to get started';
            passwordLabel.textContent = 'Create Password';
        } else {
            subtitle.textContent = 'Set your new password';
            passwordLabel.textContent = 'New Password';
        }
    } else if (!accessToken) {
        const { data: { session } } = await window.SupabaseClient.auth.getSession();
        if (!session) {
            showMessage('Invalid or missing link. Please request a new one.', 'error');
            form.style.display = 'none';
            return;
        }
    }
})();

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }

    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const { error } = await window.SupabaseClient.auth.updateUser({
            password: password
        });

        if (error) {
            showMessage(error.message, 'error');
            btn.classList.remove('loading');
            btn.disabled = false;
            return;
        }

        showMessage('Password updated successfully! Redirecting...', 'success');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);

    } catch (err) {
        showMessage(err.message || 'An error occurred', 'error');
        btn.classList.remove('loading');
        btn.disabled = false;
    }
});
