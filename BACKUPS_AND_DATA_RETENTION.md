# Backups and Data Retention Policy

## Overview

This document outlines the backup strategy and data retention policies for the Event Match application.

## Backup Strategy

### Supabase Automatic Backups

Supabase provides automatic daily backups for all projects:

- **Frequency**: Daily backups at midnight UTC
- **Retention Period**: 
  - Free tier: 7 days of backups
  - Pro tier: 30 days of backups
  - Enterprise: Custom retention periods
- **Backup Type**: Full database backups including:
  - PostgreSQL database (all tables, schemas, functions)
  - Storage bucket files
  - Auth users and sessions

### Accessing Backups

1. Navigate to Supabase Dashboard → Settings → Backups
2. Select the backup date you want to restore
3. Click "Restore" to create a new project from the backup
4. **Note**: Restoring creates a new project; existing data is not overwritten

### Point-in-Time Recovery (PITR)

For Pro and Enterprise tiers:
- Enables restoration to any point in time within the retention period
- Up to 7-30 days retention depending on plan
- Ideal for recovering from accidental deletions or data corruption

## Data Retention Policy

### User Data

#### Active Users
- **Retention**: Indefinite while account is active
- **Includes**:
  - User profile information
  - Authentication credentials
  - User preferences and settings
  - Activity history

#### Deleted Accounts
- **Soft Delete Period**: 30 days
  - Account marked as deleted but data retained
  - Allows recovery if user changes mind
- **Hard Delete**: After 30 days
  - All user data permanently deleted
  - Cannot be recovered

### Event Data

#### Active Events
- **Retention**: Indefinite for upcoming and ongoing events
- **Includes**:
  - Event details and metadata
  - RSVP lists and status
  - Event photos and media

#### Past Events
- **Retention**: 1 year after event date
- **Purpose**: Historical data for analytics and user history
- **After 1 Year**: 
  - Event details archived or deleted
  - User participation history retained (anonymized)

### Messages

#### Active Conversations
- **Retention**: Indefinite while both users are active
- **Includes**: All message content and metadata

#### Deleted Conversations
- **User-Initiated Delete**: Immediate removal from user's view
- **Server Retention**: 90 days for compliance and dispute resolution
- **Hard Delete**: After 90 days

### Analytics Data

#### Raw Event Logs
- **Retention**: 90 days
- **Purpose**: Debugging and detailed analysis
- **Storage**: Aggregated and stored in analytics store

#### Aggregated Analytics
- **Retention**: 2 years
- **Purpose**: Trend analysis and reporting
- **Data**: Anonymized and aggregated metrics

### Notification Data

- **Push Tokens**: Retained while user is active
- **Notification History**: 30 days
- **Notification Settings**: Retained while account is active

## Backup Best Practices

### Regular Backup Verification

**Weekly**: Verify that automated backups are running
- Check Supabase Dashboard → Backups
- Confirm latest backup timestamp

**Monthly**: Test backup restoration
- Create a test project from a backup
- Verify data integrity
- Document any issues

### Manual Backup Triggers

Create manual backups before:
- Major schema migrations
- Bulk data operations
- Production deployments
- Critical feature launches

### Manual Backup Commands

```bash
# Export database schema
pg_dump -h <supabase-host> -U postgres -s -f schema_backup.sql

# Export all data
pg_dump -h <supabase-host> -U postgres -d postgres -f full_backup.sql

# Export specific table
pg_dump -h <supabase-host> -U postgres -t users -f users_backup.sql
```

## Disaster Recovery Plan

### Recovery Time Objective (RTO)
- **Target**: 4 hours
- **Maximum Acceptable Downtime**: 8 hours

### Recovery Point Objective (RPO)
- **Target**: 1 hour (with PITR enabled)
- **Without PITR**: 24 hours (daily backups)

### Recovery Steps

1. **Assess the Issue**
   - Identify what data is lost or corrupted
   - Determine the extent of the incident

2. **Notify Stakeholders**
   - Alert team members
   - Update status page if necessary

3. **Restore from Backup**
   - Select appropriate backup point
   - Create new Supabase project from backup
   - Verify data integrity

4. **Update DNS/Connections**
   - Update connection strings in environment variables
   - Redirect traffic to restored instance

5. **Post-Recovery**
   - Document the incident
   - Review and update recovery procedures
   - Implement preventive measures

## Compliance and Legal

### GDPR Compliance

- Users can request data export (Right to Data Portability)
- Users can request data deletion (Right to Erasure)
- Data processing agreements in place with Supabase

### Data Deletion Requests

Process for handling user deletion requests:
1. Verify user identity
2. Mark account for deletion
3. 30-day grace period
4. Permanent deletion after grace period
5. Confirm deletion to user

### Data Export Requests

Users can request a full export of their data:
- Profile information
- Event history
- Messages
- Activity logs

Export format: JSON or CSV

## Monitoring and Alerts

### Backup Monitoring

Set up alerts for:
- Failed backup jobs
- Backup size anomalies (too large or too small)
- Storage capacity warnings

### Data Growth Monitoring

Track:
- Database size growth rate
- Storage usage trends
- Table-specific growth

Alert when:
- Database approaching 80% capacity
- Unexpected spike in data growth
- Storage costs exceeding budget

## Cost Optimization

### Storage Cost Management

- Archive old events to cold storage after 1 year
- Compress historical data
- Delete orphaned files and unused media

### Query Optimization

- Regular review of slow queries
- Maintain proper indexes
- Clean up unused data

## Contact and Escalation

### Backup Issues
- Primary: DevOps Team
- Escalation: Supabase Support (support@supabase.com)

### Data Recovery Requests
- Primary: Support Team
- Escalation: Engineering Lead

## Version History

- **v1.0** (2025-12-24): Initial backup and retention policy
- Future updates will be documented here

## Related Documentation

- [Supabase Backups Documentation](https://supabase.com/docs/guides/platform/backups)
- [Data Protection Policy](./DATA_PROTECTION.md) (if exists)
- [Incident Response Plan](./INCIDENT_RESPONSE.md) (if exists)

---

**Last Updated**: 2025-12-24  
**Review Schedule**: Quarterly  
**Next Review**: 2025-03-24
