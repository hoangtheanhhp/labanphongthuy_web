// Storage keys
const PROFILE_KEY = 'phongthuy_user_profile';

export interface UserProfileStorage {
  birthYear: number;
  birthMonth?: number;
  birthDay?: number;
  gender: 'male' | 'female';
  updatedAt?: number;
}

const DEFAULT_PROFILE: UserProfileStorage = {
  birthYear: 1990,
  birthMonth: 1,
  birthDay: 1,
  gender: 'male',
};

export function getSavedUserProfile(): UserProfileStorage {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.birthYear === 'number') {
        return {
          birthYear: parsed.birthYear,
          birthMonth: parsed.birthMonth || 1,
          birthDay: parsed.birthDay || 1,
          gender: parsed.gender === 'female' ? 'female' : 'male',
          updatedAt: parsed.updatedAt,
        };
      }
    }
  } catch (e) {
    console.error('Error reading user profile from localStorage:', e);
  }
  return DEFAULT_PROFILE;
}

export function saveUserProfileToStorage(profile: Partial<UserProfileStorage>): UserProfileStorage {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const current = getSavedUserProfile();
    const updated: UserProfileStorage = {
      ...current,
      ...profile,
      updatedAt: Date.now(),
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    // Dispatch event to sync cross-components
    window.dispatchEvent(new CustomEvent('phongthuy_profile_updated', { detail: updated }));
    return updated;
  } catch (e) {
    console.error('Error saving user profile to localStorage:', e);
    return DEFAULT_PROFILE;
  }
}
