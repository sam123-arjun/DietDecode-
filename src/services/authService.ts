import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile as updateAuthProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebaseConfig';
import { storageService, DEFAULT_USER, DEFAULT_PROFILE } from './storageService';
import { User, UserProfile } from '../types';

export class AuthService {
  // Check if live Firebase mode is active
  public isLiveMode(): boolean {
    return isFirebaseConfigured && auth !== null;
  }

  // Subscribe to auth state changes
  public onAuthChange(callback: (user: User | null) => void): () => void {
    if (this.isLiveMode() && auth) {
      let resolved = false;

      // Safety timeout: If Firebase auth doesn't respond within 700ms,
      // resolve with cached local user immediately so app never hangs
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          const localUser = storageService.getUser();
          callback(localUser);
        }
      }, 700);

      const unsubscribe = onAuthStateChanged(
        auth,
        async (fbUser: FirebaseUser | null) => {
          resolved = true;
          clearTimeout(timer);
          if (fbUser) {
            const localUser = storageService.getUser();
            const fullName = fbUser.displayName || localUser?.fullName || 'DietDecode User';
            const mappedUser: User = {
              id: fbUser.uid,
              email: fbUser.email || '',
              fullName,
              createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
            };
            storageService.setUser(mappedUser);
            callback(mappedUser);
          } else {
            storageService.setUser(null);
            callback(null);
          }
        },
        (error) => {
          console.warn('[AuthService] onAuthStateChanged error, falling back to local session:', error);
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            callback(storageService.getUser());
          }
        }
      );

      return () => {
        clearTimeout(timer);
        unsubscribe();
      };
    }

    // Mock Mode: check local storage
    const current = storageService.getUser();
    callback(current);
    return () => {};
  }

  // Login
  public async login(email: string, password: string): Promise<User> {
    const trimmedEmail = email.trim();
    if (this.isLiveMode() && auth) {
      let fbUser: FirebaseUser;
      try {
        const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        fbUser = cred.user;
      } catch (err: unknown) {
        const authErr = err as { code?: string; message?: string };
        if (
          authErr?.code === 'auth/invalid-credential' ||
          authErr?.code === 'auth/wrong-password' ||
          authErr?.code === 'auth/user-not-found'
        ) {
          throw new Error('Incorrect email or password. Please verify your credentials or register a new account.');
        }
        if (authErr?.code === 'auth/invalid-email') {
          throw new Error('Please enter a valid email address.');
        }
        if (authErr?.code === 'auth/too-many-requests') {
          throw new Error('Too many failed attempts. Access is temporarily paused for security. Please try again shortly.');
        }
        const cleanMsg = authErr?.message?.replace(/^Firebase:\s*/i, '').replace(/\(auth\/[^)]+\)\.?/i, '').trim();
        throw new Error(cleanMsg || 'Sign-in failed. Please verify your connection and try again.');
      }

      const fullName = fbUser.displayName || storageService.getProfile(fbUser.uid)?.fullName || 'DietDecode User';

      const user: User = {
        id: fbUser.uid,
        email: fbUser.email || trimmedEmail,
        fullName,
        createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
      };
      storageService.setUser(user);
      return user;
    }

    // Mock Mode validation
    await new Promise((res) => setTimeout(res, 350)); // Realistic network latency
    if (!trimmedEmail || !password) {
      throw new Error('Please enter both email and password.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    // Quick demo login or personalized mock login
    const user: User = {
      id: trimmedEmail.toLowerCase() === DEFAULT_USER.email.toLowerCase() ? DEFAULT_USER.id : `usr_${Date.now()}`,
      email: trimmedEmail.toLowerCase(),
      fullName: trimmedEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      createdAt: new Date().toISOString(),
    };
    storageService.setUser(user);
    return user;
  }

  // Register
  public async register(fullName: string, email: string, password: string): Promise<User> {
    const trimmedEmail = email.trim();
    const cleanName = fullName.trim();

    if (this.isLiveMode() && auth && db) {
      let fbUser: FirebaseUser;

      try {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        fbUser = cred.user;
      } catch (authErr: unknown) {
        const err = authErr as { code?: string; message?: string };
        // If email already exists in Firebase, try logging in with the same password
        if (err?.code === 'auth/email-already-in-use') {
          try {
            const loginCred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
            fbUser = loginCred.user;
          } catch {
            throw new Error('This email address is already registered. Please sign in with your password or use a different email.');
          }
        } else if (err?.code === 'auth/weak-password') {
          throw new Error('Password must be at least 6 characters long.');
        } else if (err?.code === 'auth/invalid-email') {
          throw new Error('The email address format is invalid.');
        } else {
          const cleanMsg = err?.message?.replace(/^Firebase:\s*/i, '').replace(/\(auth\/[^)]+\)\.?/i, '').trim();
          throw new Error(cleanMsg || 'Registration failed. Please check your details and try again.');
        }
      }

      try {
        if (cleanName) {
          await updateAuthProfile(fbUser, { displayName: cleanName });
        }
      } catch {
        // non-critical
      }

      const user: User = {
        id: fbUser.uid,
        email: fbUser.email || trimmedEmail,
        fullName: cleanName || fbUser.displayName || 'DietDecode User',
        createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
      };

      // Check if profile exists already or create initial profile
      const existingProfile = storageService.getProfile(user.id);
      const initialProfile: UserProfile = existingProfile?.fullName ? existingProfile : {
        ...DEFAULT_PROFILE,
        userId: user.id,
        fullName: user.fullName,
        isProfileComplete: false,
        updatedAt: new Date().toISOString(),
      };

      storageService.setUser(user);
      storageService.setProfile(user.id, initialProfile);

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore register timeout')), 1500)
        );
        await Promise.race([
          setDoc(doc(db, 'users', user.id, 'profile', 'data'), initialProfile, { merge: true }),
          timeoutPromise,
        ]);
      } catch (err) {
        console.warn('Initial Firestore profile creation fallback:', err);
      }

      return user;
    }

    // Mock Mode
    await new Promise((res) => setTimeout(res, 400));
    if (!fullName.trim()) throw new Error('Full Name is required.');
    if (!email.includes('@')) throw new Error('A valid email address is required.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');

    const user: User = {
      id: `usr_${Date.now()}`,
      email: email.toLowerCase(),
      fullName: fullName.trim(),
      createdAt: new Date().toISOString(),
    };

    const initialProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      userId: user.id,
      fullName: user.fullName,
      isProfileComplete: false,
      updatedAt: new Date().toISOString(),
    };

    storageService.setUser(user);
    storageService.setProfile(user.id, initialProfile);
    return user;
  }

  // Quick Demo Login for offline/evaluator local preview
  public async demoLogin(): Promise<User> {
    if (this.isLiveMode() && auth) {
      // In production Firebase mode, users must sign in with their real account or register
      throw new Error('Live Firebase mode is active. Please sign in with your real DietDecode account or click "Register here".');
    }

    await new Promise((res) => setTimeout(res, 200));
    storageService.setUser(DEFAULT_USER);
    storageService.setProfile(DEFAULT_USER.id, DEFAULT_PROFILE);
    return DEFAULT_USER;
  }

  // Logout
  public async logout(): Promise<void> {
    if (this.isLiveMode() && auth) {
      await signOut(auth);
    }
    storageService.setUser(null);
  }

  // Current session user
  public getCurrentUser(): User | null {
    return storageService.getUser();
  }
}

export const authService = new AuthService();
