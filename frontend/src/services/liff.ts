import liff from '@line/liff';

const LIFF_ID = import.meta.env.VITE_LIFF_ID;

/**
 * Initialize LIFF
 */
export async function initLiff() {
    try {
        await liff.init({ liffId: LIFF_ID });
        return true;
    } catch (error) {
        console.error('LIFF initialization failed', error);
        return false;
    }
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
    return liff.isLoggedIn();
}

/**
 * Login via LINE
 */
export function login() {
    liff.login();
}

/**
 * Logout
 */
export function logout() {
    liff.logout();
}

/**
 * Get user profile
 */
export async function getProfile() {
    if (!liff.isLoggedIn()) {
        throw new Error('Not logged in');
    }
    return await liff.getProfile();
}

/**
 * Get access token for API calls
 */
export function getAccessToken(): string | null {
    if (!liff.isLoggedIn()) {
        return null;
    }
    return liff.getAccessToken();
}

/**
 * Close LIFF window
 */
export function closeLiff() {
    liff.closeWindow();
}
