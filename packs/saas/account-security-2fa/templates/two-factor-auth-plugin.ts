import { twoFactor } from "better-auth/plugins";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";

type SelectedFeatures = { twoFactor: boolean };

export function createTwoFactorAuthPlugin(
  input: SelectedAuthPluginInput,
  _features: SelectedFeatures,
) {
  return twoFactor({
    issuer: input.appName,
    twoFactorTable: "app_two_factor",
    skipVerificationOnEnable: false,
    allowPasswordless: false,
    twoFactorCookieMaxAge: 10 * 60,
    trustDeviceMaxAge: 30 * 24 * 60 * 60,
    totpOptions: { digits: 6, period: 30 },
    backupCodeOptions: { amount: 10, length: 10 },
    accountLockout: {
      enabled: true,
      maxFailedAttempts: 5,
      durationSeconds: 15 * 60,
    },
    schema: {
      user: { fields: { twoFactorEnabled: "two_factor_enabled" } },
      twoFactor: {
        modelName: "app_two_factor",
        fields: {
          userId: "user_id",
          backupCodes: "backup_codes",
          failedVerificationCount: "failed_verification_count",
          lockedUntil: "locked_until",
        },
      },
    },
  });
}
