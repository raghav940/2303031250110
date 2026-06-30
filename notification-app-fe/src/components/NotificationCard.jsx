import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CircleIcon from '@mui/icons-material/Circle';

export default function NotificationCard({ notification }) {
    // Unread logic (assuming visually distinct)
    const isUnread = !notification.is_read; 

    return (
        <Card sx={{ mb: 2, borderLeft: isUnread ? '6px solid #1976d2' : '6px solid #e0e0e0', backgroundColor: isUnread ? '#f8fbff' : '#ffffff' }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Chip label={notification.Type} color={notification.Type === 'Placement' ? 'success' : notification.Type === 'Result' ? 'warning' : 'primary'} size="small" />
                    {isUnread ? <CircleIcon color="primary" fontSize="small" /> : <CheckCircleIcon color="disabled" fontSize="small" />}
                </Box>
                <Typography variant="body1" sx={{ fontWeight: isUnread ? 'bold' : 'normal' }}>
                    {notification.Message}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {new Date(notification.Timestamp).toLocaleString()}
                </Typography>
            </CardContent>
        </Card>
    );
}
