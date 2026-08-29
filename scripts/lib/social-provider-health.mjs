const providers = ["google", "github", "apple"];

export function socialProviderHealthMatches(selectedProviders, healthComponents) {
  const selected = selectedProviders instanceof Set ? selectedProviders : new Set(selectedProviders);
  return providers.every((provider) => {
    const component = healthComponents.get(provider);
    return selected.has(provider)
      ? component?.status === "ok" && component?.details?.selected === true && component?.details?.configured === true
      : component?.status === "not-selected" && component?.details?.selected === false;
  });
}
