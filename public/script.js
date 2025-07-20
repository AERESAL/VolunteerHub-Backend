// Global variables
let authToken = localStorage.getItem('authToken') || '';
let currentUser = localStorage.getItem('currentUser') || '';

// API Base URL
const API_BASE = window.location.origin;

// Utility Functions
function updateAuthStatus() {
    const authStatus = document.getElementById('authStatus');
    if (authToken) {
        authStatus.className = 'alert alert-success';
        authStatus.innerHTML = `<i class="fas fa-user-check"></i> Authenticated as: ${currentUser}`;
    } else {
        authStatus.className = 'alert alert-warning';
        authStatus.innerHTML = '<i class="fas fa-user-slash"></i> Not Authenticated';
    }
}

function displayResponse(elementId, data, isError = false) {
    const element = document.getElementById(elementId);
    element.className = `response-area ${isError ? 'text-danger' : ''}`;
    element.textContent = JSON.stringify(data, null, 2);
}

function showLoading(button) {
    button.classList.add('loading');
    button.disabled = true;
}

function hideLoading(button) {
    button.classList.remove('loading');
    button.disabled = false;
}

async function makeRequest(url, options = {}) {
    // Don't set default Content-Type for FormData
    const isFormData = options.body instanceof FormData;
    
    const defaultOptions = {
        headers: {
            ...(!isFormData && { 'Content-Type': 'application/json' }),
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        }
    };

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, finalOptions);
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // If not JSON, get text content
            const text = await response.text();
            
            // Handle empty responses
            if (!text.trim()) {
                data = { 
                    message: `HTTP ${response.status} ${response.statusText}`,
                    status: response.status,
                    statusText: response.statusText
                };
            } else {
                data = { 
                    error: `Server returned non-JSON response`, 
                    status: response.status,
                    statusText: response.statusText,
                    content: text.substring(0, 500) + (text.length > 500 ? '...' : '')
                };
            }
        }
        
        return { data, status: response.status, ok: response.ok };
    } catch (error) {
        return { 
            data: { 
                error: error.message,
                type: 'Network Error',
                details: 'Could not connect to server. Make sure the server is running.'
            }, 
            status: 0, 
            ok: false 
        };
    }
}

// Authentication Functions
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    showLoading(button);

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const result = await makeRequest(`${API_BASE}/signup`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

    displayResponse('signupResponse', result.data, !result.ok);
    hideLoading(button);
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    showLoading(button);

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.rememberMe = !!data.rememberMe;

    const result = await makeRequest(`${API_BASE}/login`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (result.ok && result.data.token) {
        authToken = result.data.token;
        currentUser = result.data.username;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', currentUser);
        updateAuthStatus();
    }

    displayResponse('loginResponse', result.data, !result.ok);
    hideLoading(button);
});

document.getElementById('validateSessionBtn').addEventListener('click', async () => {
    const button = document.getElementById('validateSessionBtn');
    showLoading(button);

    const result = await makeRequest(`${API_BASE}/validate-session?token=${authToken}`);
    displayResponse('validateResponse', result.data, !result.ok);
    hideLoading(button);
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    const button = document.getElementById('logoutBtn');
    showLoading(button);

    const result = await makeRequest(`${API_BASE}/logout`, { method: 'POST' });
    
    if (result.ok) {
        authToken = '';
        currentUser = '';
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        updateAuthStatus();
    }

    displayResponse('logoutResponse', result.data, !result.ok);
    hideLoading(button);
});

// Activity Functions
document.getElementById('addActivityForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    showLoading(button);

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const result = await makeRequest(`${API_BASE}/activities`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

    displayResponse('addActivityResponse', result.data, !result.ok);
    hideLoading(button);
});

document.getElementById('getActivitiesBtn').addEventListener('click', async () => {
    const button = document.getElementById('getActivitiesBtn');
    const username = document.getElementById('getActivitiesUsername').value || currentUser;
    showLoading(button);

    if (!username) {
        displayResponse('getActivitiesResponse', { error: 'Username is required' }, true);
        hideLoading(button);
        return;
    }

    const result = await makeRequest(`${API_BASE}/activities/${username}`);
    displayResponse('getActivitiesResponse', result.data, !result.ok);
    hideLoading(button);
});

document.getElementById('deleteActivityBtn').addEventListener('click', async () => {
    const button = document.getElementById('deleteActivityBtn');
    const activityId = document.getElementById('deleteActivityId').value;
    showLoading(button);

    if (!activityId) {
        displayResponse('deleteActivityResponse', { error: 'Activity ID is required' }, true);
        hideLoading(button);
        return;
    }

    const result = await makeRequest(`${API_BASE}/activities/${activityId}`, {
        method: 'DELETE'
    });

    displayResponse('deleteActivityResponse', result.data, !result.ok);
    hideLoading(button);
});

// Signature Functions
document.getElementById('signatureRequestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    showLoading(button);

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const result = await makeRequest(`${API_BASE}/send-signature-request`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

    displayResponse('signatureRequestResponse', result.data, !result.ok);
    hideLoading(button);
});

document.getElementById('getActivityByTokenBtn').addEventListener('click', async () => {
    const button = document.getElementById('getActivityByTokenBtn');
    const token = document.getElementById('activityToken').value;
    showLoading(button);

    if (!token) {
        displayResponse('activityByTokenResponse', { error: 'Token is required' }, true);
        hideLoading(button);
        return;
    }

    const result = await makeRequest(`${API_BASE}/activity-by-token/${token}`);
    displayResponse('activityByTokenResponse', result.data, !result.ok);
    hideLoading(button);
});

// Community Functions
document.getElementById('getCommunityPostsBtn').addEventListener('click', async () => {
    const button = document.getElementById('getCommunityPostsBtn');
    showLoading(button);

    const result = await makeRequest(`${API_BASE}/api/community-posts`);
    displayResponse('communityPostsResponse', result.data, !result.ok);
    hideLoading(button);
});

document.getElementById('createPostForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    showLoading(button);

    const formData = new FormData(e.target);

    // For FormData, the makeRequest function will automatically handle headers
    const result = await makeRequest(`${API_BASE}/api/community-posts`, {
        method: 'POST',
        body: formData
    });

    displayResponse('createPostResponse', result.data, !result.ok);
    hideLoading(button);
});

// Friends Functions
document.getElementById('searchFriendsBtn').addEventListener('click', async () => {
    const button = document.getElementById('searchFriendsBtn');
    const query = document.getElementById('friendSearchQuery').value;
    const username = document.getElementById('friendSearchUsername').value || currentUser;
    showLoading(button);

    if (!query) {
        displayResponse('searchFriendsResponse', { error: 'Search query is required' }, true);
        hideLoading(button);
        return;
    }

    const result = await makeRequest(`${API_BASE}/api/friends/search?query=${encodeURIComponent(query)}&username=${encodeURIComponent(username)}`);
    displayResponse('searchFriendsResponse', result.data, !result.ok);
    hideLoading(button);
});

document.getElementById('addFriendForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    showLoading(button);

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const result = await makeRequest(`${API_BASE}/api/friends/add`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

    displayResponse('addFriendResponse', result.data, !result.ok);
    hideLoading(button);
});

// Misc Functions
document.getElementById('getUserInfoBtn').addEventListener('click', async () => {
    const button = document.getElementById('getUserInfoBtn');
    showLoading(button);

    const result = await makeRequest(`${API_BASE}/users`);
    displayResponse('userInfoResponse', result.data, !result.ok);
    hideLoading(button);
});

document.getElementById('getLeaderboardBtn').addEventListener('click', async () => {
    const button = document.getElementById('getLeaderboardBtn');
    showLoading(button);

    const result = await makeRequest(`${API_BASE}/leaderboard`);
    displayResponse('leaderboardResponse', result.data, !result.ok);
    hideLoading(button);
});

document.getElementById('getThemesBtn').addEventListener('click', async () => {
    const button = document.getElementById('getThemesBtn');
    showLoading(button);

    const result = await makeRequest(`${API_BASE}/themes`);
    displayResponse('themesResponse', result.data, !result.ok);
    hideLoading(button);
});

document.getElementById('getMapboxKeyBtn').addEventListener('click', async () => {
    const button = document.getElementById('getMapboxKeyBtn');
    showLoading(button);

    const result = await makeRequest(`${API_BASE}/api/mapbox-key`);
    displayResponse('mapboxKeyResponse', result.data, !result.ok);
    hideLoading(button);
});

// Initialize
updateAuthStatus();

// Server Status Check
async function checkServerStatus() {
    try {
        // Use a simple GET endpoint that should always work
        const response = await fetch(`${API_BASE}/`);
        if (response.ok || response.status === 404) {
            console.log('✅ Server is running and accessible');
            document.body.style.opacity = '1';
        } else {
            console.warn('⚠️ Server responded but with error status:', response.status);
        }
    } catch (error) {
        console.error('❌ Cannot connect to server:', error.message);
        
        // Show connection error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger position-fixed top-50 start-50 translate-middle';
        errorDiv.style.zIndex = '9999';
        errorDiv.innerHTML = `
            <h5><i class="fas fa-exclamation-triangle"></i> Server Connection Error</h5>
            <p>Cannot connect to the backend server. Please ensure:</p>
            <ul>
                <li>The server is running (npm start)</li>
                <li>Server is running on the correct port (check console output)</li>
                <li>No firewall blocking the connection</li>
                <li>Check the browser console for more details</li>
            </ul>
            <button class="btn btn-outline-danger btn-sm" onclick="location.reload()">
                <i class="fas fa-refresh"></i> Retry
            </button>
        `;
        document.body.appendChild(errorDiv);
    }
}

// Auto-fill current user in relevant fields
document.addEventListener('DOMContentLoaded', () => {
    // Check server status
    checkServerStatus();
    
    if (currentUser) {
        // Auto-fill username fields where appropriate
        const usernameFields = [
            'getActivitiesUsername',
            'friendSearchUsername'
        ];
        
        usernameFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.placeholder = `${field.placeholder} (default: ${currentUser})`;
            }
        });
    }
});
