/**
 * tRPC context factory.
 *
 * The context is constructed once per HTTP request and is available to every
 * procedure. P0 uses an in-memory demo user; real authentication will be
 * added in a follow-up ADR.
 */

export interface ApiContext {
  requestId: string;
  user: {
    id: string;
    displayName: string;
  };
}

export function createContext(): ApiContext {
  return {
    requestId: crypto.randomUUID(),
    user: {
      id: "00000000-0000-0000-0000-000000000001",
      displayName: "Demo User",
    },
  };
}
