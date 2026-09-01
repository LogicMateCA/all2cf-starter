import { i18n, locales } from "@better-auth/i18n";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";
export function createI18nAuthPlugin(
  _input: SelectedAuthPluginInput,
  _features: Record<string, boolean>,
) {
  return i18n({
    translations: { en: locales.en, fr: locales.fr, zh: locales.zh },
    detection: ["session", "header"],
    userLocaleField: "locale",
  });
}
