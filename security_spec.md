# Security Specification & Threat Model (Phase 2.1)

This security specification defines the data invariants, identifies the "Dirty Dozen" payload vulnerabilities, and outlines the defensive test runner to safeguard user privacy, state transitions, and billing integrity.

## 1. Core Data Invariants

1. **Plumber Active Job Lock**: A plumber cannot accept any emergency dispatch (`OPEN` status) if they already have an active job (`activeJob == true` or `activeJobId != null`).
2. **PII Cryptographic Isolation**: Personal Identifiable Information (PII) including street address, name, phone, and email are stored in a isolated subcollection `/callouts/{calloutId}/pii/details` which remains unreadable by any client or plumber until the status is explicitly accepted (`ACCEPTED`, `EN_ROUTE`, `IN_PROGRESS`, `COMPLETED`, `CLOSED`) by an authorized assigned plumber or crew member.
3. **One-Way Status Transitions**: Statuses can only progress along the standard sequential path: `OPEN` -> `ACCEPTED` -> `EN_ROUTE` -> `IN_PROGRESS` -> `COMPLETED` -> `CLOSED`. Backward transitions (e.g. going from `COMPLETED` back to `ACCEPTED`) are strictly forbidden.
4. **Sign-Off Authority**: Only the client who posted the emergency call-out can sign off and transition the ticket status to `CLOSED`, which triggers the feedback survey, unlocks the reviews, and releases the plumber's active job lock.
5. **Private Image Isolation**: If `isPrivateProject` is set to `true`, the associated before/after photos uploaded to Firebase Storage can never be accessed publicly, even if `photoPortfolioApproved` is set to `true`.

---

## 2. The "Dirty Dozen" Exploitative Payloads

These 12 payloads represent malicious client actions that MUST be rejected by Firestore Security Rules:

### 1. The Double-Dipper (Identity Violation)
*   **Target**: `/callouts/req_999`
*   **Attack**: Plumber attempts to accept a new job while already locked with an active job.
*   **Payload**:
    ```json
    {
      "assignedPlumberId": "plumber_attacker_uid",
      "status": "ACCEPTED"
    }
    ```
*   **Pre-condition**: Plumber profile `/users/plumber_attacker_uid` has `activeJobId: "req_111"`.

### 2. The PII Scraper (Privacy Violation)
*   **Target**: `/callouts/req_222/pii/details`
*   **Attack**: Unassigned plumber tries to scrape client PII before accepting the job.
*   **Payload**: Get query.
*   **Pre-condition**: Job status is `OPEN`. Plumber `uid` is not assigned.

### 3. The Status Warper (Workflow Violation)
*   **Target**: `/callouts/req_333`
*   **Attack**: Plumber bypasses `EN_ROUTE` and `IN_PROGRESS` stages, jumping straight to `COMPLETED` from `OPEN`.
*   **Payload**:
    ```json
    {
      "status": "COMPLETED"
    }
    ```

### 4. The Self-SignOff (Role Violation)
*   **Target**: `/callouts/req_444`
*   **Attack**: Plumber signs off on their own project, forcing the ticket to `CLOSED` without client approval.
*   **Payload**:
    ```json
    {
      "status": "CLOSED"
    }
    ```

### 5. The Ghost Field Injector (Shadow Update Attack)
*   **Target**: `/users/client_uid`
*   **Attack**: Client injects an unauthorized admin privilege into their profile update.
*   **Payload**:
    ```json
    {
      "fullName": "Jane Doe",
      "role": "plumber",
      "isPaid": true,
      "isAdmin": true
    }
    ```

### 6. The Backwards-Time-Traveler (Workflow Violation)
*   **Target**: `/callouts/req_555`
*   **Attack**: Plumber resets a completed job back to `ACCEPTED` to hoard the billing slot.
*   **Payload**:
    ```json
    {
      "status": "ACCEPTED"
    }
    ```
*   **Pre-condition**: Job status is already `COMPLETED`.

### 7. The Impostor Creator (Identity Spoofing)
*   **Target**: `/callouts/req_666`
*   **Attack**: User attempts to create an emergency ticket on behalf of a different client UID.
*   **Payload**:
    ```json
    {
      "id": "req_666",
      "userId": "victim_uid",
      "status": "OPEN",
      "baseFee": 1000
    }
    ```

### 8. The Infinite Wallet Exhaustor (Denial of Wallet Attack)
*   **Target**: `/callouts/req_777`
*   **Attack**: Attacker attempts to inject massive, multi-megabyte string blocks into fields.
*   **Payload**:
    ```json
    {
      "issueDescription": "[Generates 5MB string garbage...]"
    }
    ```

### 9. The Subcollection Bypass (Integrity Violation)
*   **Target**: `/callouts/req_888/messages/msg_111`
*   **Attack**: Unassigned plumber attempts to inject messages into another client's active chat.
*   **Payload**:
    ```json
    {
      "id": "msg_111",
      "sender": "plumber",
      "text": "Phishing attempt"
    }
    ```

### 10. The Free Surcharge Bypass (Billing Violation)
*   **Target**: `/callouts/req_901`
*   **Attack**: Non-Pretoria client attempts to clear the provincial surcharge field.
*   **Payload**:
    ```json
    {
      "surcharge": 0,
      "totalAmount": 1000,
      "clientProvince": "KwaZulu-Natal"
    }
    ```

### 11. The Immutable Tamperer (Data Integrity Violation)
*   **Target**: `/callouts/req_902`
*   **Attack**: Plumber attempts to change the `createdAt` timestamp of a job.
*   **Payload**:
    ```json
    {
      "createdAt": "2020-01-01T00:00:00Z"
    }
    ```

### 12. The Portfolio Exposure Bypass (Privacy Violation)
*   **Target**: `/callouts/req_903`
*   **Attack**: Plumber displays work photos of a private project without client signoff.
*   **Payload**: Attempt to fetch before/after photos from bucket while `isPrivateProject` is `true`.

---

## 3. Test Runner Design (`firestore.rules.test.ts`)

A mock typescript validation suite checking rules:

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe("Pretoria Plumbers Fortress rules", () => {
  it("denies unassigned plumber access to client PII details", async () => {
    const db = getTestFirestore({ uid: "unassigned_plumber" });
    const piiDoc = db.doc("callouts/req_222/pii/details");
    await assertFails(piiDoc.get());
  });

  it("denies plumber accepting second job if activeJobId is set", async () => {
    const db = getTestFirestore({ uid: "busy_plumber" });
    const calloutDoc = db.doc("callouts/req_999");
    await assertFails(calloutDoc.update({
      assignedPlumberId: "busy_plumber",
      status: "ACCEPTED"
    }));
  });
});
```
