alter table "app_session" add column "active_organization_id" text;
alter table "app_session" add column "active_team_id" text;
alter table "app_auth_email_outbox" drop constraint "app_auth_email_outbox_kind_check";
alter table "app_auth_email_outbox" add constraint "app_auth_email_outbox_kind_check" check ("kind" in ('email-verification', 'password-reset', 'organization-invitation'));

create table "app_organization" (
  "id" text not null primary key,
  "name" text not null,
  "slug" text not null unique,
  "logo" text,
  "created_at" timestamptz not null,
  "metadata" text
);

create table "app_organization_member" (
  "id" text not null primary key,
  "organization_id" text not null references "app_organization" ("id") on delete cascade,
  "user_id" text not null references "app_user" ("id") on delete cascade,
  "role" text not null default 'member',
  "created_at" timestamptz not null,
  unique ("organization_id", "user_id")
);

create table "app_team" (
  "id" text not null primary key,
  "name" text not null,
  "member_count" integer not null default 0,
  "organization_id" text not null references "app_organization" ("id") on delete cascade,
  "created_at" timestamptz not null,
  "updated_at" timestamptz
);

create table "app_team_member" (
  "id" text not null primary key,
  "team_id" text not null references "app_team" ("id") on delete cascade,
  "user_id" text not null references "app_user" ("id") on delete cascade,
  "membership_key" text unique,
  "created_at" timestamptz,
  unique ("team_id", "user_id")
);

create table "app_organization_invitation" (
  "id" text not null primary key,
  "organization_id" text not null references "app_organization" ("id") on delete cascade,
  "email" text not null,
  "role" text,
  "team_id" text,
  "status" text not null default 'pending',
  "expires_at" timestamptz not null,
  "created_at" timestamptz not null default current_timestamp,
  "inviter_id" text not null references "app_user" ("id") on delete cascade
);

create index "app_organization_member_organization_id_idx" on "app_organization_member" ("organization_id");
create index "app_organization_member_user_id_idx" on "app_organization_member" ("user_id");
create index "app_team_organization_id_idx" on "app_team" ("organization_id");
create index "app_team_member_team_id_idx" on "app_team_member" ("team_id");
create index "app_team_member_user_id_idx" on "app_team_member" ("user_id");
create index "app_organization_invitation_organization_id_idx" on "app_organization_invitation" ("organization_id");
create index "app_organization_invitation_email_idx" on "app_organization_invitation" ("email");
