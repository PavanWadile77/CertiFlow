# Security Specification: E-Cert System

## 1. Data Invariants
- A certificate must have a valid `issuerId` matching the creator's UID.
- Certificates are immutable once created, except for the `status` field (revocation).
- `certId` is a 8-character uppercase alphanumeric string.
- Public can ONLY read certificates if they know the exact `certId`. They cannot list all certificates.

## 2. Dirty Dozen Payloads (Rejection Targets)
1. **Identity Spoofing**: User A tries to create a certificate with `issuerId` of User B.
2. **Shadow Field**: Adding `isVerifiedBySystem: true` to a certificate.
3. **Privilege Escalation**: User tries to change `recipientName` of an existing certificate.
4. **Invalid Type**: Sending a 1MB string for `grade`.
5. **Orphan Write**: Creating a certificate with a non-existent issuer profile (if issuer profiles were mandatory).
6. **Query Scraping**: Authenticated user tries to `list` all certificates without an `issuerId` filter.
7. **Bypass Verification**: Guest tries to `get` certificate data using just the Firestore Document ID instead of querying by `certId`. (Actually, we enforce `certId` knowledge).
8. **Malicious ID**: Using a 10KB string as a document ID.
9. **Fake Timestamp**: Client providing a `issueDate` from 2010.
10. **State Skipping**: Trying to create a certificate with status `revoked` initially (optional, but good to check).
11. **PII Leak**: Guest trying to `list` all certificates to find an email.
12. **Double Revocation**: Trying to update status when it's already terminal.

## 3. Test Runner (Draft)
A `firestore.rules.test.ts` would verify these. (I will focus on the rules first).
