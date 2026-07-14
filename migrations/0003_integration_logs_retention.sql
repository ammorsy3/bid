-- Retention sweep for integration_logs.
--
-- integration_logs is append-only: one row per API call made through a customer
-- integration, including truncated request/response previews. Nothing deletes
-- from it in the normal course of business, so it needs an explicit retention
-- policy — both to keep the table bounded and to honour the audit-log retention
-- window promised in the privacy policy.
--
-- This used to be a setInterval() inside the Express process. That only worked
-- because the server ran continuously; on a serverless host the process freezes
-- between requests and the timer would never fire — silently, with no error and
-- no growing table to notice until the feature saw real traffic. Scheduling it
-- in Postgres means it runs regardless of where (or whether) the app is hosted.
--
-- Idempotent: safe to re-run.

create extension if not exists pg_cron;

-- Supports the delete's range scan on created_at.
create index if not exists integration_logs_created_at_idx
  on integration_logs (created_at);

-- cron.schedule() upserts on job name, so re-running just redefines the job.
select cron.schedule(
  'integration-logs-retention',
  '17 3 * * *',  -- daily at 03:17 UTC, off the hour to avoid the thundering herd
  $$
    delete from integration_logs
     where created_at < now() - interval '30 days'
  $$
);
