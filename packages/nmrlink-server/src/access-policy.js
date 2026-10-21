/** Local administrator policy. Never copied into Firestore Security Rules. */
export function createAccessPolicy(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("Invalid access policy.");
  const keys = ["allowedDomains", "allowedEmails", "allowedEmailPatterns", "deniedEmails"];
  if (Object.keys(config).some(key => !keys.includes(key))) throw new Error("Unknown access policy key.");
  const values = Object.fromEntries(keys.map(key => {
    const value = config[key] ?? [];
    if (!Array.isArray(value) || value.some(item => typeof item !== "string" || !item.trim())) {
      throw new Error(`${key} must be an array of non-empty strings.`);
    }
    return [key, value];
  }));
  const domains = values.allowedDomains.map(value => value.toLowerCase());
  if (domains.some(value => !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(value))) throw new Error("Invalid allowed domain.");
  const patterns = values.allowedEmailPatterns.map(pattern => new RegExp(pattern, "i"));
  const allowed = values.allowedEmails.map(value => value.toLowerCase());
  const denied = values.deniedEmails.map(value => value.toLowerCase());
  return user => {
    if (user.disabled || !user.emailVerified || !user.email ||
        !user.providerData?.some(provider => provider.providerId === "google.com")) return false;
    const email = user.email.toLowerCase();
    if (denied.includes(email)) return false;
    return allowed.includes(email) || domains.includes(email.split("@")[1]) ||
      patterns.some(pattern => pattern.test(email));
  };
}
