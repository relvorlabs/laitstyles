const actorEnvironment = {
  consumer: ["AUTH_ACCEPTANCE_CONSUMER_EMAIL", "AUTH_ACCEPTANCE_CONSUMER_PASSWORD"],
  manager: ["AUTH_ACCEPTANCE_MANAGER_EMAIL", "AUTH_ACCEPTANCE_MANAGER_PASSWORD"],
  admin: ["AUTH_ACCEPTANCE_ADMIN_EMAIL", "AUTH_ACCEPTANCE_ADMIN_PASSWORD"],
};

const expectedResponses = {
  anonymous: {
    status: 401,
    error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in before continuing." },
  },
  consumer: {
    status: 403,
    error: {
      code: "MISSING_CAPABILITY",
      message: "This account role cannot perform that action.",
    },
  },
  manager: { status: 201 },
  admin: { status: 201 },
};

export function parseAuthorizationDomain(argv) {
  if (!argv.includes("--authorization")) return null;
  const domainIndex = argv.indexOf("--domain");
  const domain = domainIndex >= 0 ? argv[domainIndex + 1] : undefined;
  if (!domain) throw new Error("Authorization acceptance requires --domain");
  if (domain !== "products") throw new Error(`Unsupported authorization domain: ${domain}`);
  return domain;
}

export function requireProductAuthorizationActors(environment) {
  const missing = Object.values(actorEnvironment)
    .flat()
    .filter((name) => !environment[name]);
  if (missing.length) {
    throw new Error(
      `Pre-provisioned Product authorization actors are unavailable: missing ${missing.join(", ")}`,
    );
  }

  return Object.fromEntries(
    Object.entries(actorEnvironment).map(([actor, [emailName, passwordName]]) => [
      actor,
      { email: environment[emailName], password: environment[passwordName] },
    ]),
  );
}

export function assertProductAuthorizationResponse(actor, status, payload) {
  const expected = expectedResponses[actor];
  const validSuccess =
    expected?.status === 201 &&
    status === 201 &&
    isRecord(payload) &&
    isRecord(payload.data) &&
    isRecord(payload.data.product) &&
    typeof payload.data.product.id === "string";
  const validDenial =
    expected?.error &&
    status === expected.status &&
    isRecord(payload) &&
    isRecord(payload.error) &&
    payload.error.code === expected.error.code &&
    payload.error.message === expected.error.message &&
    Object.keys(payload).length === 1;
  if (!validSuccess && !validDenial) {
    throw new Error(`Unexpected ${actor} Product authorization response`);
  }
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
