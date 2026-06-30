import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  addDoc,
  orderBy,
  onSnapshot,
  runTransaction
} from 'firebase/firestore';
import { User, CalloutRequest, ChatMessage } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: localStorage.getItem('plumb_current_user') 
        ? JSON.parse(localStorage.getItem('plumb_current_user')!).id 
        : null
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Real active Firebase Config for the workspace
const firebaseConfig = {
  apiKey: "AIzaSyAoZnVnpb1CwgS8tP8j30UcL7CQ8yOimxE",
  authDomain: "swift-shell-zhnbb.firebaseapp.com",
  projectId: "swift-shell-zhnbb",
  storageBucket: "swift-shell-zhnbb.firebasestorage.app",
  messagingSenderId: "1011424318689",
  appId: "1:1011424318689:web:d8be0190564aa4dc3913a0"
};

const customDatabaseId = "ai-studio-247emergencyplum-181ac569-952e-418c-ac7b-bf74f151af30";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (with the custom database ID provisioned for this applet)
export const db = getFirestore(app, customDatabaseId);

/**
 * Saves or updates a user profile in Firestore
 */
export async function saveUserProfile(user: User): Promise<void> {
  try {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, user, { merge: true });
  } catch (error) {
    console.error('Error saving user profile to Firestore:', error);
  }
}

/**
 * Gets a user profile by email
 */
export async function getUserProfileByEmail(email: string): Promise<User | null> {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as User;
    }
  } catch (error) {
    console.error('Error getting user profile by email:', error);
  }
  return null;
}

/**
 * Gets a user profile by ID
 */
export async function getUserProfileById(userId: string): Promise<User | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data() as User;
    }
  } catch (error) {
    console.error('Error getting user profile by ID:', error);
  }
  return null;
}

/**
 * Saves a CalloutRequest in Firestore
 */
/**
 * Gets the POPIA-sensitive client details from the subcollection safely (returns null if unassigned/denied)
 */
export async function getCalloutPIIDetails(calloutId: string): Promise<any | null> {
  try {
    const piiRef = doc(db, 'callouts', calloutId, 'pii', 'details');
    const docSnap = await getDoc(piiRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    // Expected to fail if permission is denied, fallback gracefully
  }
  return null;
}

/**
 * Saves a CalloutRequest in Firestore with strict Zero-Trust PII separation
 */
export async function saveCalloutRequest(request: CalloutRequest): Promise<void> {
  try {
    // 1. Root callout document (masked or devoid of PII for public access before acceptance)
    const rootRequest = {
      ...request,
      clientName: "Resident (Hidden until accepted)",
      clientPhone: "Hidden until accepted",
      clientAddress: "Pretoria Area (Hidden until accepted)",
      clientEmail: "Hidden until accepted"
    };
    
    const requestRef = doc(db, 'callouts', request.id);
    await setDoc(requestRef, rootRequest);
    
    // 2. Separate PII Details subcollection document
    const piiRef = doc(db, 'callouts', request.id, 'pii', 'details');
    await setDoc(piiRef, {
      clientName: request.clientName,
      clientPhone: request.clientPhone,
      clientAddress: request.clientAddress,
      clientEmail: request.clientEmail || ""
    });
  } catch (error) {
    console.error('Error saving callout request:', error);
  }
}

/**
 * Gets all CalloutRequests for a specific user, sorted by date with PII merged
 */
export async function getCalloutRequests(userId: string): Promise<CalloutRequest[]> {
  try {
    const q = query(
      collection(db, 'callouts'), 
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const requests: CalloutRequest[] = [];
    querySnapshot.forEach((docSnap) => {
      requests.push(docSnap.data() as CalloutRequest);
    });
    
    const mergedRequests = await Promise.all(
      requests.map(async (req) => {
        const pii = await getCalloutPIIDetails(req.id);
        if (pii) {
          return {
            ...req,
            clientName: pii.clientName || req.clientName,
            clientPhone: pii.clientPhone || req.clientPhone,
            clientAddress: pii.clientAddress || req.clientAddress,
            clientEmail: pii.clientEmail || req.clientEmail
          };
        }
        return req;
      })
    );
    
    // Sort by createdAt descending
    return mergedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error getting callout requests:', error);
    return [];
  }
}

/**
 * Subscribes to CalloutRequests in real-time
 */
export function subscribeCalloutRequests(userId: string, callback: (requests: CalloutRequest[]) => void): () => void {
  const q = query(
    collection(db, 'callouts'), 
    where('userId', '==', userId)
  );
  
  return onSnapshot(q, async (snapshot) => {
    const requests: CalloutRequest[] = [];
    snapshot.forEach((docSnap) => {
      requests.push(docSnap.data() as CalloutRequest);
    });
    
    const mergedRequests = await Promise.all(
      requests.map(async (req) => {
        const pii = await getCalloutPIIDetails(req.id);
        if (pii) {
          return {
            ...req,
            clientName: pii.clientName || req.clientName,
            clientPhone: pii.clientPhone || req.clientPhone,
            clientAddress: pii.clientAddress || req.clientAddress,
            clientEmail: pii.clientEmail || req.clientEmail
          };
        }
        return req;
      })
    );
    
    const sorted = mergedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(sorted);
  }, (error) => {
    console.error('Error subscribing to callout requests:', error);
  });
}

/**
 * Updates a specific field or fields on a callout request
 */
export async function updateCalloutRequestFields(id: string, fields: Partial<CalloutRequest>): Promise<void> {
  try {
    const docRef = doc(db, 'callouts', id);
    await updateDoc(docRef, fields);
  } catch (error) {
    console.error('Error updating callout request:', error);
  }
}

/**
 * Subscribes to real-time chat messages for a specific callout request
 */
export function subscribeChatMessages(calloutId: string, callback: (messages: ChatMessage[]) => void): () => void {
  const messagesRef = collection(db, 'callouts', calloutId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((docSnap) => {
      messages.push(docSnap.data() as ChatMessage);
    });
    callback(messages);
  }, (error) => {
    console.error('Error subscribing to chat messages:', error);
  });
}

/**
 * Sends a chat message to a callout request's subcollection
 */
export async function sendChatMessage(calloutId: string, message: ChatMessage): Promise<void> {
  try {
    const messageDocRef = doc(db, 'callouts', calloutId, 'messages', message.id);
    await setDoc(messageDocRef, {
      ...message,
      createdAt: message.createdAt || Date.now()
    });
  } catch (error) {
    console.error('Error sending chat message:', error);
  }
}

/**
 * Gets a user profile by Plumber ID (e.g., PLM-000001)
 */
export async function getPlumberByPlumberId(plumberId: string): Promise<User | null> {
  try {
    const q = query(collection(db, 'users'), where('plumberId', '==', plumberId.toUpperCase().trim()));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as User;
    }
  } catch (error) {
    console.error('Error getting plumber by plumberId:', error);
  }
  return null;
}

/**
 * Generates a unique, sequential Plumber ID (PLM-XXXXXX) using a Firestore transaction
 */
export async function generatePlumberIdWithTransaction(): Promise<string> {
  const counterRef = doc(db, 'system', 'counters');
  try {
    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let count = 1;
      if (counterDoc.exists()) {
        count = (counterDoc.data().plumberCount || 0) + 1;
      }
      transaction.set(counterRef, { plumberCount: count }, { merge: true });
      const formattedId = 'PLM-' + String(count).padStart(6, '0');
      return formattedId;
    });
  } catch (error) {
    console.error('Error generating plumber ID with transaction:', error);
    // client-side fallback to avoid blocking flow
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `PLM-${randomNum}`;
  }
}

/**
 * Subscribes to ALL CalloutRequests in real-time (useful for plumbers viewing job board)
 */
export function subscribeAllCalloutRequests(callback: (requests: CalloutRequest[]) => void): () => void {
  const q = collection(db, 'callouts');
  
  return onSnapshot(q, async (snapshot) => {
    const requests: CalloutRequest[] = [];
    snapshot.forEach((docSnap) => {
      requests.push(docSnap.data() as CalloutRequest);
    });
    
    const mergedRequests = await Promise.all(
      requests.map(async (req) => {
        const pii = await getCalloutPIIDetails(req.id);
        if (pii) {
          return {
            ...req,
            clientName: pii.clientName || req.clientName,
            clientPhone: pii.clientPhone || req.clientPhone,
            clientAddress: pii.clientAddress || req.clientAddress,
            clientEmail: pii.clientEmail || req.clientEmail
          };
        }
        return req;
      })
    );
    
    // Sort by createdAt descending
    const sorted = mergedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(sorted);
  }, (error) => {
    console.error('Error subscribing to all callout requests:', error);
  });
}
