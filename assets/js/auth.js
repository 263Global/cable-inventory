/**
 * Auth.js
 * Authentication logic using Supabase
 */

const Auth = {
    /**
     * Sign in with email and password
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<{user: object|null, error: object|null}>}
     */
    async signIn(email, password) {
        try {
            const { data, error } = await window.SupabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                return { user: null, error };
            }

            return { user: data.user, error: null };
        } catch (err) {
            return { user: null, error: { message: err.message } };
        }
    },

    /**
     * Sign out current user
     * @returns {Promise<{error: object|null}>}
     */
    async signOut() {
        try {
            const { error } = await window.SupabaseClient.auth.signOut();
            return { error };
        } catch (err) {
            return { error: { message: err.message } };
        }
    },

    /**
     * Get current authenticated user
     * @returns {Promise<object|null>}
     */
    async getCurrentUser() {
        try {
            const { data: { user } } = await window.SupabaseClient.auth.getUser();
            return user;
        } catch (err) {
            console.error('Error getting current user:', err);
            return null;
        }
    },

    /**
     * Get current session
     * @returns {Promise<object|null>}
     */
    async getSession() {
        try {
            const { data: { session } } = await window.SupabaseClient.auth.getSession();
            return session;
        } catch (err) {
            console.error('Error getting session:', err);
            return null;
        }
    },

    /**
     * Subscribe to auth state changes
     * @param {function} callback - Callback function(event, session)
     * @returns {object} Subscription object with unsubscribe method
     */
    onAuthStateChange(callback) {
        return window.SupabaseClient.auth.onAuthStateChange(callback);
    },

    /**
     * Check if user is authenticated and redirect if not
     * Call this on protected pages
     */
    async requireAuth() {
        const session = await this.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    /**
     * Redirect to main app if already authenticated
     * Call this on login page
     */
    async redirectIfAuthenticated() {
        const session = await this.getSession();
        if (session) {
            window.location.href = 'index.html';
            return true;
        }
        return false;
    }
};

// Export for global access
window.Auth = Auth;
