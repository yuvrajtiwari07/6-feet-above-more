# security_spec.md - Firebase Firestore Security Specifications

This specification enforces attribute-based access control (ABAC) and role-based validation constraints for our 6FT Tall Fashion platform's Firestore database.

## 1. Data Invariants

1. **User Profiles Isolation**: High-security user profile documents inside `/users/{userId}` are strictly private. No standard user can read or modify another user's profile document.
2. **Product Directory Integrity**: The curated tall product list `/products/{productId}` is universally readable by standard users (authenticated or guest/unauthenticated) so they can browse garments. It is strictly write-protected. Only system-verified administrators (`ytiwari@argusoft.com` and `yuvrajtiwari0710@gmail.com`) can perform mutations (create, update, delete).
3. **Immutability of Key Claims**: A user's `userId` inside their user profile cannot be spoofed to target other users.
4. **Temporal Integrity**: All state modification timestamps (`updatedAt`) must strictly be synchronized with the server's authoritative clock (`request.time`). Custom client dates are rejected.

---

## 2. The "Dirty Dozen" Payloads

The following payloads represent malicious state injections and privilege escalation attempts that are strictly rejected by the firewall laws defined inside our `firestore.rules`:

### Users Collection Attacks (/users/{userId})

1. **A-1: Identity Spoofing (Write to another user)**: Writing a user profile with ID `user_abc` when authenticated as `user_xyz`.
2. **A-2: Keys Over-injection (Ghost Fields)**: Trying to inject non-whitelisted admin-privilege keys into the user profile.
3. **A-3: Untrusted Temporal Data**: Forcing a custom client-side `updatedAt` string instead of the server timestamp.
4. **A-4: Invalid Sizing Inputs**: Specifying blank, oversized, or malicious non-standard strings for the height parameters.

### Products Collection Attacks (/products/{productId})

5. **P-1: Public Mutation (Unauthenticated creation)**: Anonymous or guest user attempting to insert mock/spoofed apparel products.
6. **P-2: Exploit Spoofing (Non-Admin Write)**: Standard authenticated user (whose email is NOT `ytiwari@argusoft.com` or `yuvrajtiwari0710@gmail.com`) attempting to create or edit products.
7. **P-3: Missing Core Schema Integrity**: Admin attempt to insert a product without required fields (`id`, `brand`, `title`, `category`, `priceAtRetailer`).
8. **P-4: Invaliding Pricing Range**: Submitting negative values for `priceAtRetailer`.
9. **P-5: ID Poisoning**: Specifying an extremely long document ID (>128 chars) containing special exploit code to exhaust read costs.
10. **P-6: Malformed Sizing Structures**: Inserting wrong types (e.g. string instead of array for sizes).
11. **P-7: Review Spam Injection**: Forcing unverified mock lists as ratings or rating integers out of the [1-5] boundary.
12. **P-8: Fraudulent Out-of-Stock Status**: Non-verified accounts attempting to flag products as out of stock.

---

## 3. The Validation Proof

Our implementation of `firestore.rules` ensures that all twelve vectors fail with `PERMISSION_DENIED` checks automatically, maintaining a highly resilient cloud fortress.
