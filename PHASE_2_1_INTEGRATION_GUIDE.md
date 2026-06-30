# Pretoria Rapid-Response Plumbing: Phase 2.1 Integration Guide

This guide describes the Firestore schema updates, Storage structures, Security Rules, and Cloud Functions to implement the Dispatch Workflow, Zero-Trust Privacy Controls, and Job Photo Management.

---

## 1. Firebase Storage Structure
```
/b/{bucket}/o/
  └── callouts/
      └── {calloutId}/
          ├── banner.jpg          (Public/Private based on project privacy)
          ├── before.jpg          (Uploaded by client on dispatch)
          ├── progress.jpg        (Uploaded by plumber on site)
          └── completed.jpg       (Uploaded by plumber upon completion)
```

---

## 2. Firestore Schema & Privacy Separation

To comply with **POPIA (Protection of Personal Information Act)** in South Africa, client details are split into a zero-trust subcollection:

```
/callouts/{calloutId}                <-- Publicly browseable by paid plumbers
  ├── id: string
  ├── userId: string
  ├── jobCategoryId: string
  ├── status: "OPEN" | "ACCEPTED" | "EN_ROUTE" | "IN_PROGRESS" | "COMPLETED" | "CLOSED"
  ├── isEmergency: boolean
  ├── isPrivateProject: boolean       <-- Enforces absolute portfolio isolation
  ├── photoPortfolioApproved: boolean <-- Client approved portfolio inclusion
  └── bannerPhoto, beforePhoto, progressPhoto, completedPhoto: string

/callouts/{calloutId}/pii/details    <-- Restricted to assigned plumber after ACCEPTED
  ├── clientName: string
  ├── clientEmail: string
  ├── clientPhone: string
  └── clientAddress: string
```

---

## 3. Cloud Functions (Node.js/TypeScript)

These Cloud Functions enforce double-acceptance locking, automatic sequential status transition, and secure client sign-off.

### Function 1: Secure Plumber Acceptance with Lock Verification
```typescript
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const acceptEmergencyCallout = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }

  const { calloutId } = data;
  const plumberId = context.auth.uid;

  return db.runTransaction(async (transaction) => {
    const plumberRef = db.collection("users").doc(plumberId);
    const calloutRef = db.collection("callouts").doc(calloutId);

    const plumberDoc = await transaction.get(plumberRef);
    const calloutDoc = await transaction.get(calloutRef);

    if (!plumberDoc.exists || !calloutDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Entities not found");
    }

    const plumberData = plumberDoc.data()!;
    const calloutData = calloutDoc.data()!;

    // 1. Enforce Role and Subscription Check
    if (plumberData.role !== "plumber" && plumberData.role !== "crew") {
      throw new functions.https.HttpsError("permission-denied", "Unauthorized role");
    }
    if (!plumberData.isPaid) {
      throw new functions.https.HttpsError("failed-precondition", "Subscription inactive");
    }

    // 2. Single Active Job Lock
    if (plumberData.activeJob === true || plumberData.activeJobId) {
      throw new functions.https.HttpsError("failed-precondition", "Plumber already has an active dispatch");
    }

    // 3. Status Check
    if (calloutData.status !== "OPEN") {
      throw new functions.https.HttpsError("failed-precondition", "Job is no longer open");
    }

    // 4. Atomic Double-Write Commit
    transaction.update(plumberRef, {
      activeJob: true,
      activeJobId: calloutId
    });

    transaction.update(calloutRef, {
      status: "ACCEPTED",
      assignedPlumberId: plumberId
    });

    return { status: "SUCCESS", calloutId };
  });
});
```

### Function 2: Safe Client Sign-Off and Plumber Lock Release
```typescript
export const clientSignOffProject = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }

  const { calloutId, reviewRating, reviewComment, photoPortfolioApproved, surveyFeedback } = data;
  const clientId = context.auth.uid;

  return db.runTransaction(async (transaction) => {
    const calloutRef = db.collection("callouts").doc(calloutId);
    const calloutDoc = await transaction.get(calloutRef);

    if (!calloutDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Callout not found");
    }

    const calloutData = calloutDoc.data()!;
    if (calloutData.userId !== clientId) {
      throw new functions.https.HttpsError("permission-denied", "Only the client can sign off");
    }

    if (calloutData.status !== "COMPLETED") {
      throw new functions.https.HttpsError("failed-precondition", "Job is not marked as completed yet");
    }

    const plumberId = calloutData.assignedPlumberId;
    const plumberRef = db.collection("users").doc(plumberId);

    // 1. Mark Call-out as CLOSED and store feedback
    transaction.update(calloutRef, {
      status: "CLOSED",
      reviewRating,
      reviewComment,
      photoPortfolioApproved,
      surveyFeedback,
      signedOffAt: new Date().toISOString()
    });

    // 2. Unlock the Plumber for subsequent dispatches
    transaction.update(plumberRef, {
      activeJob: false,
      activeJobId: null
    });

    return { status: "CLOSED", calloutId };
  });
});
```

---

## 4. Frontend Integration Examples

### Client: Dispatch and Upload Before Photo
```typescript
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { saveCalloutRequest } from "./firebase";

async function handleNewDispatch(file: File, piiDetails: any) {
  const calloutId = `req_${Date.now()}`;
  const storage = getStorage();
  
  // 1. Upload photo to secure path matching storage rules
  const imageRef = ref(storage, `callouts/${calloutId}/before.jpg`);
  await uploadBytes(imageRef, file);
  const beforePhotoUrl = await getDownloadURL(imageRef);

  // 2. Save document with secure PII Splitting
  const newCallout = {
    id: calloutId,
    userId: currentUser.uid,
    jobCategoryId: "burst-pipes",
    projectName: "Burst Pipes & Major Flooding",
    status: "OPEN",
    isEmergency: true,
    createdAt: new Date().toISOString(),
    beforePhoto: beforePhotoUrl,
    clientName: piiDetails.name,
    clientPhone: piiDetails.phone,
    clientAddress: piiDetails.address,
    clientEmail: piiDetails.email
  };

  await saveCalloutRequest(newCallout);
}
```

### Plumber: Real-time Secure PII Details Fetch
```typescript
import { getCalloutPIIDetails } from "./firebase";

// Triggered only once the callout is ACCEPTED by the plumber
async function renderUnlockedPII(calloutId: string) {
  const pii = await getCalloutPIIDetails(calloutId);
  if (pii) {
    console.log("Unlocked Client Name:", pii.clientName);
    console.log("Unlocked Phone Number:", pii.clientPhone);
    console.log("Unlocked Dispatch Address:", pii.clientAddress);
  } else {
    console.log("PII locked. Call-out status is still OPEN or assigned to another plumber.");
  }
}
```
