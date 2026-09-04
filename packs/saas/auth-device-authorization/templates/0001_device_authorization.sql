create table "deviceCode" ("id" text not null primary key, "deviceCode" text not null, "userCode" text not null, "userId" text, "expiresAt" timestamptz not null, "status" text not null, "lastPolledAt" timestamptz, "pollingInterval" integer, "clientId" text, "scope" text, "resources" jsonb, "oauthClientId" text);
create unique index "deviceCode_deviceCode_uidx" on "deviceCode" ("deviceCode");
create unique index "deviceCode_userCode_uidx" on "deviceCode" ("userCode");
