import axios from 'axios';

// Use environment variable for API URL or default to localhost
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '') + '/';

const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 30000, // 30s — prevents premature timeouts on slower networks/larger payloads
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Add Auth Token
apiClient.interceptors.request.use(async (config) => {
    const token = localStorage.getItem('testoza_token');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response Interceptor: Handle Errors
apiClient.interceptors.response.use((response) => {
    return response;
}, (error) => {
    if (error.response) {
        // Backend returned an error response (4xx, 5xx)
        console.error("API Error:", error.response.data);
    } else if (error.request) {
        // No response received
        console.error("Network Error:", error.request);
    } else {
        // Request setup error
        console.error("Request Error:", error.message);
    }
    return Promise.reject(error);
});

export default apiClient;
