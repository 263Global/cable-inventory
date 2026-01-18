// App bootstrapping and UI handlers.
(async () => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');

    if (type === 'invite' || type === 'recovery' || type === 'signup') {
        window.location.href = 'reset-password.html' + window.location.hash;
        return;
    }

    const isAuthed = await Auth.requireAuth();
    if (isAuthed) {
        const userSection = document.getElementById('user-section');
        const userEmail = document.getElementById('user-email');
        const mobileUserEmail = document.getElementById('mobile-user-email');
        const user = await Auth.getCurrentUser();

        if (user) {
            userEmail.textContent = user.email;
            if (mobileUserEmail) mobileUserEmail.textContent = user.email;
            userSection.style.display = 'block';
        }

        await window.Store.init();
        App.init();
    }
})();

document.getElementById('mobile-user-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('mobile-user-dropdown')?.classList.toggle('open');
});

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('mobile-user-dropdown');
    const btn = document.getElementById('mobile-user-btn');
    if (dropdown && !dropdown.contains(e.target) && !btn?.contains(e.target)) {
        dropdown.classList.remove('open');
    }
});

document.getElementById('mobile-logout')?.addEventListener('click', async () => {
    await Auth.signOut();
    window.location.href = 'login.html';
});

document.getElementById('mobile-change-password')?.addEventListener('click', async () => {
    document.getElementById('mobile-user-dropdown')?.classList.remove('open');
    document.getElementById('change-password-btn')?.click();
});

document.getElementById('mobile-theme-toggle')?.addEventListener('click', () => {
    document.getElementById('mobile-user-dropdown')?.classList.remove('open');
    if (typeof App !== 'undefined' && App.toggleTheme) {
        App.toggleTheme();
    }
});

document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await Auth.signOut();
    window.location.href = 'login.html';
});

document.getElementById('change-password-btn')?.addEventListener('click', async () => {
    const newPassword = prompt('Enter new password (minimum 6 characters):');
    if (!newPassword) return;

    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    const confirmPassword = prompt('Confirm new password:');
    if (newPassword !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    try {
        const { error } = await window.SupabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) {
            alert('Failed to update password: ' + error.message);
            return;
        }

        alert('Password updated successfully! Please log in again.');
        await Auth.signOut();
        window.location.href = 'login.html';
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

const INACTIVITY_TIMEOUT = 10 * 60 * 1000;
let inactivityTimer;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(async () => {
        alert('You have been logged out due to inactivity.');
        await Auth.signOut();
        window.location.href = 'login.html';
    }, INACTIVITY_TIMEOUT);
}

['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach(event => {
    document.addEventListener(event, resetInactivityTimer, { passive: true });
});

resetInactivityTimer();
