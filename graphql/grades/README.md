# Grades Domain

This module handles grade-related GraphQL operations including:

- **Query**: Fetch grades for students
- **Mutation**: Add new grades (teachers only)
- **Subscription**: Real-time grade notifications via WebSocket

## Subscription Privacy

The `gradeAdded` subscription uses dynamic channels (`GRADE_ADDED_${studentId}`) to ensure that each student only receives notifications for their own grades. This prevents data leakage between students.
