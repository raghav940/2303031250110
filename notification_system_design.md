# Stage 1

## Core Actions
1. **Fetch Notifications:** Retrieve a list of notifications (paginated and filterable by type).
2. **Mark as Read:** Update the status of one or multiple notifications as read.
3. **Get Unread Count:** Retrieve the total number of unread notifications for a quick overview.

## REST API Endpoints

### 1. Fetch Notifications
**Endpoint:** `GET /api/v1/notifications`
**Description:** Fetches a list of notifications for the authenticated student.

**Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Query Parameters:**
- `limit` (optional): Number of records to fetch. Default: 10
- `page` (optional): Page number. Default: 1
- `notification_type` (optional): Filter by type (`Event`, `Result`, `Placement`)
- `is_read` (optional): Filter by read status (boolean)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "Placement",
        "message": "CSX Corporation hiring",
        "timestamp": "2026-04-22T17:51:18Z",
        "is_read": false
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 45
    }
  }
}
```

### 2. Mark Notification(s) as Read
**Endpoint:** `PATCH /api/v1/notifications/read`
**Description:** Marks specific notifications or all notifications as read.

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "notification_ids": ["uuid-1", "uuid-2"] 
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Notifications marked as read successfully."
}
```

### 3. Get Unread Count
**Endpoint:** `GET /api/v1/notifications/unread-count`
**Description:** Fetches the count of unread notifications.

**Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "unread_count": 12
  }
}
```

## Real-time Notifications Mechanism
To deliver real-time notifications to connected clients without constant polling, **Server-Sent Events (SSE)** or **WebSockets** should be utilized.

**Recommendation: WebSockets**
Given the need for real-time delivery and potential bidirectional communication, WebSockets provide a low-latency, persistent connection.
- **Connection URL:** `wss://api.domain.com/v1/notifications/stream`
- **Authentication:** Token passed via initial handshake query parameter or protocol headers.
- **Event Payload:**
```json
{
  "event": "new_notification",
  "data": {
    "id": "uuid",
    "type": "Event",
    "message": "tech-fest starting soon",
    "timestamp": "2026-04-22T17:50:06Z"
  }
}
```
When a new notification is generated in the backend, it will be published to a message broker (like Redis Pub/Sub), which the WebSocket servers subscribe to and push the event directly to the active connection of the designated student.
