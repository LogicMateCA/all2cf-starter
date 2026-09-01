alter table app_auth_email_outbox drop constraint if exists app_auth_email_outbox_kind_check;
alter table app_auth_email_outbox add constraint app_auth_email_outbox_kind_check check (kind in ('email-verification','password-reset','email-otp','organization-invitation','magic-link'));
