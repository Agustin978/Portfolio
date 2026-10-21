import argon2 from 'argon2';

// Single source of argon2 parameters: the seed, login and the timing-equalizing dummy hash must
// all share them, otherwise an unknown email would answer measurably faster than a known one.
const HASH_OPTIONS = { type: argon2.argon2id } as const;

export const hashPassword = (plain: string) => argon2.hash(plain, HASH_OPTIONS);

export const verifyPassword = (hash: string, plain: string) => argon2.verify(hash, plain);

let dummyHash: Promise<string> | undefined;

// Verified against when the email doesn't exist, so both paths cost one argon2 verification.
export const getDummyHash = () => (dummyHash ??= hashPassword('not-a-real-password'));
