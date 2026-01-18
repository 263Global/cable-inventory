// Login page handlers.
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

(async () => {
    await Auth.redirectIfAuthenticated();
})();

const form = document.getElementById('login-form');
const btn = document.getElementById('login-btn');
const errorDiv = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    errorDiv.classList.remove('show');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        errorText.textContent = 'Please enter both email and password';
        errorDiv.classList.add('show');
        return;
    }

    btn.classList.add('loading');
    btn.disabled = true;

    const { user, error } = await Auth.signIn(email, password);

    if (error) {
        errorText.textContent = error.message || 'Invalid email or password';
        errorDiv.classList.add('show');
        btn.classList.remove('loading');
        btn.disabled = false;
        return;
    }

    if (user || !error) {
        window.location.href = 'index.html';
    }
});

const successDiv = document.getElementById('success-message');
const successText = document.getElementById('success-text');

document.getElementById('forgot-link').addEventListener('click', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    if (!email) {
        errorText.textContent = 'Please enter your email first';
        errorDiv.classList.add('show');
        successDiv.classList.remove('show');
        return;
    }

    errorDiv.classList.remove('show');

    try {
        const { error } = await window.SupabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html'
        });

        if (error) {
            errorText.textContent = error.message;
            errorDiv.classList.add('show');
            return;
        }

        successText.textContent = 'Password reset email sent! Check your inbox.';
        successDiv.classList.add('show');
    } catch (err) {
        errorText.textContent = err.message || 'Failed to send reset email';
        errorDiv.classList.add('show');
    }
});
