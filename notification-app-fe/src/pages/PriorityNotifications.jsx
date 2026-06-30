import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Typography, Box, CircularProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import NotificationCard from '../components/NotificationCard';
import { Log } from '../logger';

const WEIGHTS = { 'Placement': 3, 'Result': 2, 'Event': 1 };

export default function PriorityNotifications({ token }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('All');
    const [limit, setLimit] = useState(10);

    useEffect(() => {
        if (!token) return;
        const fetchPriority = async () => {
            setLoading(true);
            try {
                await Log('info', 'page', `Fetching priority msgs filter=${filterType}`, token);
                
                let url = `http://4.224.186.213/evaluation-service/notifications?limit=50`; // Fetch a good chunk to sort
                if (filterType !== 'All') {
                    url += `&notification_type=${filterType}`;
                }

                const res = await axios.get(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                let notifs = res.data.notifications || [];
                
                // Sort by weight then recency
                notifs.sort((a, b) => {
                    const wA = WEIGHTS[a.Type] || 0;
                    const wB = WEIGHTS[b.Type] || 0;
                    if (wA !== wB) return wB - wA;
                    return new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime();
                });

                setNotifications(notifs.slice(0, limit));
            } catch (err) {
                await Log('error', 'api', 'Failed to fetch priority notifications', token);
            } finally {
                setLoading(false);
            }
        };
        fetchPriority();
    }, [token, filterType, limit]);

    return (
        <Container maxWidth="sm" sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>Priority Inbox</Typography>
            <Box display="flex" gap={2} mb={3}>
                <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select value={filterType} label="Type" onChange={(e) => setFilterType(e.target.value)}>
                        <MenuItem value="All">All</MenuItem>
                        <MenuItem value="Placement">Placement</MenuItem>
                        <MenuItem value="Result">Result</MenuItem>
                        <MenuItem value="Event">Event</MenuItem>
                    </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                    <InputLabel>Limit</InputLabel>
                    <Select value={limit} label="Limit" onChange={(e) => setLimit(e.target.value)}>
                        <MenuItem value={5}>Top 5</MenuItem>
                        <MenuItem value={10}>Top 10</MenuItem>
                        <MenuItem value={15}>Top 15</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {loading ? <CircularProgress /> : (
                <Box>
                    {notifications.map((n, i) => <NotificationCard key={i} notification={n} />)}
                </Box>
            )}
        </Container>
    );
}
