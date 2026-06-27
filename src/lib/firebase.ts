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
  orderBy
} from 'firebase/firestore';
import { User, CalloutRequest } from '../types';

// Firebase Config provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyD8PZp53Llkr28nLRQ47PiPjm3huwyS-F8",
  authDomain: "plumb-ts-and-sons.firebaseapp.com",
  projectId: "plumb-ts-and-sons",
  storageBucket: "plumb-ts-and-sons.firebasestorage.app",
  messagingSenderId: "719952276256",
  appId: "1:719952276256:web:a2db6e0d3f261030030545",
  measurementId: "G-S6HV3F39GK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (default database)
export const db = getFirestore(app);

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
export async function saveCalloutRequest(request: CalloutRequest): Promise<void> {
  try {
    const requestRef = doc(db, 'callouts', request.id);
    await setDoc(requestRef, request);
  } catch (error) {
    console.error('Error saving callout request:', error);
  }
}

/**
 * Gets all CalloutRequests for a specific user, sorted by date
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
    // Sort by createdAt descending
    return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error getting callout requests:', error);
    return [];
  }
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
