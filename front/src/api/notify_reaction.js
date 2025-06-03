import axios from 'axios';


const API_BASE_URL = 'http://127.0.0.1:5000/api';

export async function sendNotificationReaction(notification, reaction) {
    const token = localStorage.getItem('jwtToken');
    const payload = { ...notification, reaction };
    try {
        const response = await axios.post(
            API_BASE_URL+'/notification_reaction',
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'tokenJWTAuthorization': token
                }
            }
        );
        return response.data;
    } catch (err) {
        console.error('Error sending notification reaction:', err);
        throw err;
    }
}
