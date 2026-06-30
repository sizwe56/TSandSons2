# Firebase Backend Architecture Specification: Pretoria Plumbing Marketplace

This document provides a comprehensive blueprint of the backend architecture designed to support the **24/7 Pretoria Emergency Plumbing Marketplace** (`TSandSons2`).

---

## 1. Firebase Authentication Roles & Custom Claims

To enforce zero-trust security and granular feature routing, we define three explicit roles within Firebase Authentication:

| Role Name | Custom Auth Claim | Description |
| :--- | :--- | :--- |
| **Client** | `{ role: "client" }` | Free or paid consumers who search, hire, and chat with plumbers, and post call-out jobs. |
| **Plumber** | `{ role: "plumber", isPaid: true/false }` | Professional plumbers who pay R50/month to display public profiles, receive jobs, and chat. |
| **Crew Member** | `{ role: "crew", masterPlumberId: "UID" }` | Restricted team members registered under a master plumber. Cannot accept independent jobs. |

### Role Assuring Invariant:
- Custom claims are assigned exclusively via **secure backend triggers or Cloud Functions** (see Section 4) and are validated against corresponding Firestore records in the `/users/{userId}` collection.

---

## 2. Firestore Collection & Document Structures

We utilize a split-collection strategy to fully isolate Personally Identifiable Information (PII) for South African POPIA compliance.

### Collection 1: `users` (Public Profiles)
- **Path**: `/users/{userId}`
- **Structure**:
```json
{
  "id": "UID_123456",
  "email": "piet@pretoriaplumbing.co.za",
  "role": "plumber",
  "name": "Piet van der Merwe",
  "city": "Pretoria",
  "province": "Gauteng",
  "createdAt": "2026-06-29T10:00:00.000Z",
  "popiaConsent": true,
  "plumberId": "PLM-000042",
  "isPaid": true,
  "subscriptionExpiry": 1782723600000,
  "isMaster": true,
  "crewMemberIds": ["crew_uid_1", "crew_uid_2"],
  "bio": "Specialist in geysers, leak detection, and high-pressure drain jetting within Pretoria West & East.",
  "experienceYears": 12,
  "profilePhoto": "https://firebasestorage.googleapis.com/.../piet_profile.jpg",
  "workPhotos": [
    "https://firebasestorage.googleapis.com/.../job1.jpg",
    "https://firebasestorage.googleapis.com/.../job2.jpg"
  ],
  "rating": 4.9,
  "reviewsCount": 24,
  "activeJobId": "callout_888999"
}
```

### Collection 2: `users/{userId}/private/info` (PII Isolation for POPIA)
- **Path**: `/users/{userId}/private/info/details`
- **Structure**:
```json
{
  "phone": "+27 82 555 1234",
  "streetAddress": "42 Paul Kruger St, Pretoria Central",
  "hidePhoneFromPublic": true,
  "hideAddressFromPublic": true
}
```

### Collection 3: `callouts` (Job Postings)
- **Path**: `/callouts/{calloutId}`
- **Structure**:
```json
{
  "id": "callout_888999",
  "userId": "client_uid_555",
  "jobCategoryId": "geyser-repair",
  "projectName": "Geyser Repair & Replacements",
  "projectDescription": "Solar geyser heating element has burned out, tripping the main DB board.",
  "issueDescription": "Solar geyser heating element has burned out, tripping the main DB board.",
  "status": "Accepted",
  "isEmergency": true,
  "termsAccepted": true,
  "pdfUrl": "https://firebasestorage.googleapis.com/.../contracts/contract_888999.pdf",
  "responsePeriod": "Instant",
  "assignedPlumberId": "UID_123456",
  "baseFee": 450.00,
  "createdAt": "2026-06-29T11:15:30.000Z"
}
```

### Collection 4: `callouts/{calloutId}/pii/details` (Client Contact Details)
- **Path**: `/callouts/{calloutId}/pii/details`
- **Structure**:
```json
{
  "clientName": "Sizwe Dladla",
  "clientPhone": "+27 71 222 9876",
  "clientEmail": "sizwe@gmail.com",
  "clientAddress": "104 Garsfontein Rd, Waterkloof Glen, Pretoria"
}
```

### Collection 5: `callouts/{calloutId}/messages` (Real-time Messaging)
- **Path**: `/callouts/{calloutId}/messages/{messageId}`
- **Structure**:
```json
{
  "id": "msg_001",
  "sender": "user",
  "text": "Please bring a 150L geyser element. Model is standard Kwikot.",
  "timestamp": "13:20",
  "read": true,
  "createdAt": 1782739200000
}
```

---

## 3. Security Rules Architecture

We have implemented a zero-trust Attribute-Based Access Control (ABAC) ruleset in `firestore.rules`. Here is the mathematical logic of the security boundaries:

1. **Client PII Security**:
   - Clients have access to their own PII document.
   - Plumbers can read `/callouts/{calloutId}/pii/details` **only if** they are the assigned plumber on the job AND the job status is `"Accepted"`. This prevents unauthorized scraping of clients' phone numbers or street addresses.
2. **Subscription Gate**:
   - Plumbers cannot perform list queries on the `callouts` collection or access client messages unless their user document has `isPaid == true`.
3. **Crew Restrictions**:
   - Crew members do not have a master `role == 'plumber'`, so they fail the rule-level check when attempting to set themselves as `assignedPlumberId` on a callout directly.
4. **Single Active Job Gate**:
   - A plumber can only accept a job if their public profile has `activeJobId == null`.

---

## 4. Cloud Function Requirements

To maintain transactional consistency and system integrity without exposing administrative credentials to the client SDK, the following five Cloud Functions are required:

### Function 1: `generatePlumberId`
- **Trigger**: Firestore `/users/{userId}` `onCreate` with `role == "plumber"`.
- **Logic**:
  1. Executes inside a transaction on a single counter document: `/system/counters`.
  2. Increments `plumberCount` by 1.
  3. Formats the counter (e.g., `42` becomes `PLM-000042`).
  4. Writes `plumberId` and initial state `{ isPaid: false, crewMemberIds: [], isMaster: true }` to `/users/{userId}`.

### Function 2: `processSubscriptionPayment`
- **Trigger**: HTTP Webhook (e.g., Capitec Bank EFT settlement or Stripe Webhook).
- **Logic**:
  1. Validates payment authenticity.
  2. Locates the plumber's UID from the transaction metadata.
  3. Updates `/users/{userId}`: `isPaid: true` and `subscriptionExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000`.
  4. Refreshes the user's Custom Auth Claims (`isPaid: true`) so that client-side routers update immediately.

### Function 3: `registerCrewMember`
- **Trigger**: HTTP Callable (Callable on behalf of a Master Plumber).
- **Arguments**: `{ crewName: string, crewEmail: string }`
- **Logic**:
  1. Verifies the caller is a Paid Master Plumber (`isMaster == true`, `isPaid == true`, `crewMemberIds.size < 5`).
  2. Creates a new Firebase Auth account for the crew member.
  3. Sets Custom Claims on the new account: `{ role: "crew", masterPlumberId: masterUid }`.
  4. Adds the new UID to `/users/{masterUid}/crewMemberIds` list.
  5. Saves the public profile `/users/{crewUid}` with `{ role: "crew", masterPlumberId: masterUid, name: crewName, email: crewEmail }`.

### Function 4: `generateEmergencyAgreementPdf`
- **Trigger**: Firestore `/callouts/{calloutId}` `onCreate` when `isEmergency == true`.
- **Logic**:
  1. Fetches client information from `/callouts/{calloutId}/pii/details`.
  2. Populates a South African legal template for emergency plumbing call-outs detailing the non-refundable dispatch fee and terms.
  3. Generates a PDF binary.
  4. Saves the PDF in Firebase Storage: `gs://bucket-name/contracts/{calloutId}.pdf`.
  5. Updates the callout document with `pdfUrl`.

### Function 5: `standardJobTimer`
- **Trigger**: Pub/Sub scheduled cron (Runs every 1 hour).
- **Logic**:
  1. Queries all `/callouts` with `status == "Pending Dispatch"` and `isEmergency == false`.
  2. Compares `createdAt` with current time.
  3. If elapsed time exceeds 48 hours without assignment, triggers an administrative SMS/push notification alerting dispatch of SLA breach.
