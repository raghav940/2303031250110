import axios from 'axios';

const LOG_URL = 'http://4.224.186.213/evaluation-service/logs';

export const Log = async (level, pkg, message, token) => {
    try {
        if (!token) return;
        // frontend allowed packages: "api", "component", "hook", "page", "state", "style", "auth", "config", "middleware", "utils"
        await axios.post(LOG_URL, {
            stack: 'frontend',
            level,
            package: pkg,
            message: message.substring(0, 48) // Limit to 48 chars as per API rules
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (e) {
        // console.log is strictly prohibited
    }
}
