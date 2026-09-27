export type OnboardingRole =
  | 'customer'
  | 'waiter'
  | 'receptionist'
  | 'chef'
  | 'admin'
  | 'owner';

export interface OnboardingState {
  userId: string;
  role: OnboardingRole;
  tutorial_completed: boolean;
  tutorial_skipped: boolean;
  tutorial_version: string;
  last_tutorial_seen: string;
}

export const CURRENT_TUTORIAL_VERSION = 'v1.0.0';

function getStorageKey(role: string, userId?: string): string {
  const cleanId = userId ? userId.trim() : 'guest';
  return `prathomix_onboarding_${role.toLowerCase()}_${cleanId}`;
}

export function getOnboardingState(role: string, userId?: string): OnboardingState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getStorageKey(role, userId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function shouldShowTutorial(role: string, userId?: string, version = CURRENT_TUTORIAL_VERSION): boolean {
  if (typeof window === 'undefined') return false;
  const state = getOnboardingState(role, userId);
  if (!state) return true; // First visit!
  if (state.tutorial_version !== version) return true; // Updated tutorial version
  if (state.tutorial_completed || state.tutorial_skipped) return false;
  return true;
}

export function completeTutorial(role: string, userId?: string, version = CURRENT_TUTORIAL_VERSION): void {
  if (typeof window === 'undefined') return;
  const state: OnboardingState = {
    userId: userId || 'guest',
    role: role as OnboardingRole,
    tutorial_completed: true,
    tutorial_skipped: false,
    tutorial_version: version,
    last_tutorial_seen: new Date().toISOString(),
  };
  localStorage.setItem(getStorageKey(role, userId), JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('prathomix_onboarding_updated', { detail: state }));
}

export function skipTutorial(role: string, userId?: string, version = CURRENT_TUTORIAL_VERSION): void {
  if (typeof window === 'undefined') return;
  const state: OnboardingState = {
    userId: userId || 'guest',
    role: role as OnboardingRole,
    tutorial_completed: false,
    tutorial_skipped: true,
    tutorial_version: version,
    last_tutorial_seen: new Date().toISOString(),
  };
  localStorage.setItem(getStorageKey(role, userId), JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('prathomix_onboarding_updated', { detail: state }));
}

export function restartTutorial(role: string, userId?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getStorageKey(role, userId));
  window.dispatchEvent(new CustomEvent('prathomix_restart_tutorial', { detail: { role, userId } }));
}
