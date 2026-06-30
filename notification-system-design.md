# Notification System Design
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

---

# Stage 2

## Persistent Storage Suggestion
**Recommendation:** PostgreSQL (Relational Database)
**Reasoning:**
- **Data Integrity:** Notifications map cleanly to structured data, where consistency between users, notification types, and statuses is essential.
- **Complex Queries:** PostgreSQL handles complex filtering, indexing, and sorting exceptionally well, which is necessary when retrieving paginated and filtered notifications.
- **JSONB Support:** If payloads become unstructured later, PostgreSQL supports JSONB columns to give NoSQL-like flexibility within a relational table.
- **Reliability:** ACID compliance ensures states (like `is_read = true`) are not lost or rendered inconsistent.

## Database Schema
```sql
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    roll_number VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id INT NOT NULL,
    type notification_type NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_student
      FOREIGN KEY(student_id) 
      REFERENCES students(id)
);

-- Indexes to optimize the endpoints
CREATE INDEX idx_notifications_student_read_created ON notifications(student_id, is_read, created_at DESC);
```

## Potential Problems with Data Volume Increase
1. **Query Degradation:** As the notifications table exceeds millions of rows, querying unread notifications or running complex filters will lead to slow index scans or sequential scans.
2. **Storage Costs & Bloat:** Storing historical, read notifications indefinitely will bloat table size and make vacuuming and index maintenance expensive.
3. **Write Bottlenecks:** Sending notifications to 50,000 users simultaneously triggers high write IOPS and possible row locks.

## Solutions to Data Volume Problems
1. **Partitioning:** Implement Table Partitioning by date (e.g., partitioning by month or year) to separate fresh data from historical data. 
2. **Data Retention Policy:** Implement a cron job to automatically archive or delete notifications older than 6 months.
3. **Caching:** Cache the `unread_count` for users in Redis. Invalidate the cache when a new notification is sent or when notifications are marked as read.
4. **Message Broker / Async Inserts:** Buffer bulk notifications (e.g., "Notify All") in a message queue (Kafka/RabbitMQ) and batch-insert them asynchronously.

## Queries Based on Stage 1 APIs

### 1. Fetch Notifications (Paginated & Filterable)
```sql
SELECT id, type, message, is_read, created_at 
FROM notifications 
WHERE student_id = $1 
  AND ($2::notification_type IS NULL OR type = $2)
  AND ($3::boolean IS NULL OR is_read = $3)
ORDER BY created_at DESC 
LIMIT $4 OFFSET $5;
```

### 2. Mark Notification(s) as Read
```sql
UPDATE notifications 
SET is_read = true 
WHERE id = ANY($1::uuid[]) AND student_id = $2;
```

### 3. Get Unread Count
```sql
SELECT COUNT(id) 
FROM notifications 
WHERE student_id = $1 AND is_read = false;
```

---

# Stage 3

## Query Analysis
**Original Query:**
```sql
SELECT * FROM notifications WHERE studentID = 1042 AND isRead = false ORDER BY createdAt ASC;
```

**Is this query accurate?**
Yes, it is logically accurate for fetching unread notifications for a specific student, sorted by oldest first.

**Why is this slow?**
The database has grown to 5,000,000 rows. Without a composite index covering `studentID` and `isRead`, the database is forced to perform a Full Table Scan (or Sequential Scan) across all 5 million rows to find matches for `studentID = 1042`, followed by an in-memory or on-disk sort for the `ORDER BY` clause.

**What would you change and what would be the likely computation cost?**
1. **Change:** Add a composite index on `(studentID, isRead, createdAt ASC)`. 
2. **Cost impact:** With this index, the query planner can perform an Index Seek directly to the rows for that student where `isRead = false`. Because the index includes `createdAt`, the rows are retrieved already sorted. The time complexity drops from O(N) (where N is total rows) to O(log N + K) (where K is the number of unread notifications for the student), virtually eliminating the performance bottleneck.

## Advice on Adding Indexes on Every Column
**Is this advice effective?**
No, it is highly ineffective and dangerous for a high-scale production database.

**Why/Why not?**
1. **Write Performance Penalty:** Every `INSERT`, `UPDATE`, or `DELETE` operation requires updating every single index. Adding indexes on all columns will severely degrade write performance, which is catastrophic for a system expected to handle bursts of notifications (e.g., 50,000 at once).
2. **Storage Bloat:** Indexes take up disk space and memory. Indexing every column will multiply the storage requirements of the database unnecessarily, reducing cache hit rates as memory fills up with useless indexes.
3. **Query Planner Confusion:** Too many overlapping or unnecessary indexes can cause the query planner to pick suboptimal execution plans. Indexes should only be created to support specific, high-frequency, or slow queries.

## Query for Placement Notifications in the Last 7 Days
```sql
SELECT DISTINCT student_id 
FROM notifications 
WHERE type = 'Placement' 
  AND created_at >= NOW() - INTERVAL '7 days';
```
*(Note: Using `DISTINCT` ensures we get a unique list of students even if they received multiple placement notifications in that timeframe).*

---

# Stage 4

## Problem Analysis
Fetching notifications directly from the database on every page load for every active student causes massive Read IOPS. This overloads the database, exhausting connections and CPU, leading to high latency and a degraded user experience.

## Proposed Solutions & Performance Improvements

### 1. In-Memory Caching (Redis/Memcached)
**Strategy:** 
Cache the first page (or top N) notifications and the `unread_count` for each user in Redis. When a page loads, the application fetches the notifications from Redis. The cache is only invalidated or updated when a new notification is generated or the user marks a notification as read.
**Performance Improvement:** 
Drastically reduces database read queries. Memory reads are on the order of microseconds compared to milliseconds for DB disk/index seeks.

**Tradeoffs:**
- **Pros:** Massive read scalability, ultra-low latency.
- **Cons:** Cache invalidation complexity (stale data if not handled perfectly). Increased infrastructure cost (running Redis clusters).

### 2. Client-Side Caching & Local Storage
**Strategy:**
Leverage the browser's `localStorage` or `IndexedDB` alongside Service Workers. When the user loads a page, the UI instantly renders the locally cached notifications. A background API call (or WebSocket event) only fetches *new* notifications (using a `last_fetched_timestamp`) and merges them into the local cache.
**Performance Improvement:**
Eliminates redundant network requests for unchanged data. The DB only processes incremental updates rather than full list retrievals.

**Tradeoffs:**
- **Pros:** Zero database/network cost for returning visitors. Fast apparent load times for the user.
- **Cons:** If a user logs in on a new device, the cache is cold. Storage limits in older browsers.

### 3. Server-Sent Events (SSE) / WebSockets
**Strategy:**
Instead of polling or re-fetching on every client-side route change/page load, the frontend establishes a single persistent WebSocket/SSE connection upon authentication. The initial state is sent once, and subsequent notifications are pushed incrementally.
**Performance Improvement:**
Replaces heavy HTTP request overhead (headers, TLS handshakes, DB fetches) with a lightweight, persistent push model. 

**Tradeoffs:**
- **Pros:** Real-time UX. Eliminates polling.
- **Cons:** Harder to scale horizontally (requires sticky sessions or a pub/sub backplane like Redis Pub/Sub). Connection limits on load balancers.

### Conclusion / Recommended Approach
Implement **Redis Caching** for the `unread_count` and the first page of notifications. Combine this with **WebSockets** (established in Stage 1) so that page reloads fetch from the fast Redis cache, while active sessions receive real-time pushes without querying the database at all.

---

# Stage 5

## Shortcomings of the Proposed Implementation
1. **Synchronous Blocking:** The `for` loop executes sequentially and synchronously. If `send_email` takes 500ms, processing 50,000 students will take over 6 hours, which is unacceptable for real-time notifications.
2. **Lack of Fault Tolerance & Retries:** If `send_email` fails on the 200th user, the loop breaks or skips without any retry mechanism. The remaining 49,800 students might not get their notifications, and there is no tracking of who received it and who didn't.
3. **No Distributed Processing:** A single loop runs on a single server, making it a severe bottleneck. It cannot utilize multiple workers or servers to speed up the process.

## Resolving the 200 Failed Emails
Since there is no dead-letter queue (DLQ) or state tracking, we must manually write a script to cross-reference the database (`save_to_db` records) against the students array. However, because `send_email` happened *before* `save_to_db`, if it crashed, the DB record wasn't created. We would need to identify the exact student ID where it crashed and resume the script from that point, which is highly error-prone.

## Reliable and Fast Redesign (Message Queues)
We need to decouple the generation of the notification from the delivery mechanisms using a Message Queue like **RabbitMQ** or **Kafka**.

1. **Producer:** The API endpoint quickly validates the request and publishes a single event `notify_all_requested` to the message broker.
2. **Fan-out:** A worker service consumes this event, retrieves the 50,000 student IDs, and publishes 50,000 individual `notification_task` messages to a worker queue.
3. **Consumer Workers:** A pool of horizontally scaled workers pick up these tasks. Each task asynchronously executes DB insertion, Email, and Push notification independently.

## Should DB Saving and Email Sending Happen Together?
**No.** They should be decoupled. 
Database insertion is fast and internal. Email sending relies on a third-party API (like SendGrid/AWS SES) which is slow and prone to network errors or rate limits. If the email API times out, it should not prevent the notification from being saved in the database or pushed to the mobile app. Each delivery method (DB, Email, Push) should be an independent, idempotent task that can retry on its own failure without affecting the others.

## Revised Pseudocode
```python
# Producer Service (Fast Response to HR)
function notify_all(student_ids: array, message: string):
    # Just push tasks to the queue and return HTTP 200 immediately
    for student_id in student_ids:
        message_broker.publish('notification_queue', {
            'student_id': student_id,
            'message': message
        })

# Worker Service (Running across multiple servers)
function process_notification_worker(job):
    student_id = job.student_id
    message = job.message
    
    # Execute independently, handling their own retries
    async_run(save_to_db(student_id, message))
    async_run(push_to_app(student_id, message))
    
    # If this fails, the job can be pushed to a Dead Letter Queue to retry later
    try:
        send_email(student_id, message)
    except Exception:
        message_broker.publish('retry_email_queue', job)
```

---

# Stage 6

## Priority Inbox Approach
**Objective:** Maintain a dynamic top 10 list of notifications based on weight (`Placement > Result > Event`) and recency.

**Implementation Details:**
1. **Weight Mapping:** We mapped weights to the types: Placement (3), Result (2), Event (1).
2. **Custom Sorting Logic:** We sort the notifications array by these weights in descending order. If the weights are identical (e.g., two Placement notifications), we fallback to sorting by `Timestamp` in descending order (most recent first).
3. **Extraction:** Once sorted, we slice the top `N` elements (10 in this case) to get the Priority Inbox view.
4. **Output Generation:** Since `console.log` is strictly prohibited by the evaluation guidelines, the script outputs the result to a `stage6_output.json` file to allow for easy screenshot verification.

**How to maintain the top 10 efficiently as new notifications arrive:**
1. **Priority Queue / Max Heap:** Instead of re-sorting the entire array every time a new notification arrives (O(N log N)), we can maintain a Priority Queue (Max Heap) where the comparator utilizes the weight+recency logic. Inserting a new notification is O(log N).
2. **Sorted Sets (Redis):** If this list needs to be globally maintained per user without computing it on the fly, we can use a Redis Sorted Set (`ZADD`). The score can be a composite float where the integer part is the weight (1, 2, or 3) and the decimal part is the epoch timestamp. Redis automatically keeps this sorted, and we simply `ZREVRANGE 0 9` to fetch the top 10 in O(log(N)+M) time.
