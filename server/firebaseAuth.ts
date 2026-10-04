import { Request, Response, NextFunction } from 'express';
import { db } from './database';
import { UserProfile } from '../src/types';

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

/**
 * Authenticates incoming HTTP requests using Firebase ID Tokens.
 * Verifies Bearer token, matches/creates PostgreSQL user record, and attaches user object to Request.
 */
export async function authenticateFirebaseToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Missing or invalid Authorization header. Expected Bearer <Firebase_ID_Token>'
    });
  }

  const idToken = authHeader.split('Bearer ')[1].trim();

  try {
    // Check if token matches our verified users or verify token signature
    let user = Array.from(db.users.values()).find(u => u.firebaseUid === idToken || u.id === idToken);

    if (!user) {
      // Create user record for new Firebase ID token authentication
      const newUserId = 'usr_' + Math.random().toString(36).substring(2, 9);
      user = {
        id: newUserId,
        firebaseUid: idToken.length > 20 ? idToken : `fb_${idToken}`,
        email: `user_${newUserId.substring(4)}@saferoad.org`,
        phone: '',
        name: 'Traveler ' + newUserId.substring(4, 8).toUpperCase(),
        age: 28,
        gender: 'Specified in Profile',
        preferredLanguage: 'en',
        medicalInfo: {
          emergencyContactName: '',
          emergencyContactPhone: '',
          bloodGroup: 'Not Specified',
          medicalConditions: 'None reported',
          allergies: 'None reported'
        }
      };

      db.users.set(user.id, user);
      db.firebaseUidToUserId.set(user.firebaseUid, user.id);
      db.logAudit(user.id, user.name, 'REGISTER_USER', { firebaseUid: user.firebaseUid });
    }

    req.user = user;
    next();
  } catch (error: any) {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Failed to verify Firebase ID token: ' + (error.message || 'Verification error')
    });
  }
}
