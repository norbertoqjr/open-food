// Open Food has exactly one demo user, referenced by this fixed ID rather
// than looked up by an authentication identity. The seed script creates the
// row; the API resolves it server-side and never accepts a client-supplied
// user ID (see build plan, section 1).
export const DEMO_USER_ID = 'demo-user';
