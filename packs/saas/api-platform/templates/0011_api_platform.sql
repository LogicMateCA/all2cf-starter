insert into "app_billing_plan_entitlement"
  ("plan_id", "feature_key", "enabled", "limit_value", "metadata")
values
  ('free', 'api.requests', true, 1000, '{"window":"month"}'::jsonb),
  ('pro', 'api.requests', true, 100000, '{"window":"month"}'::jsonb);
