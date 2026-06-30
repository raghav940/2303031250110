import axios from 'axios';
import { Log } from '../logger';

const BASE_URL = 'http://4.224.186.213/evaluation-service/notifications';

export async function fetchNotifications(token, page = 1, limit = 10, filter = "All") {
    try {
        await Log('info', 'api', `Fetching page=${page} filter=${filter}`, token);
        let url = `${BASE_URL}?page=${page}&limit=${limit}`;
        if (filter && filter !== 'All') {
            url += `&notification_type=${filter}`;
        }
        const res = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.data;
    } catch (e) {
        await Log('error', 'api', 'Failed to fetch API data', token);
        throw e;
    }
}
