import type { AccountStatus } from '@/shared/types'

/**
 * Changes made by an administrator that the read-only JSON fixtures cannot hold.
 * They are kept in localStorage, and every place that reads the fixtures applies them on top.
 * With the real backend this whole file disappears: the API stores these changes itself.
 */
const STORAGE_KEY = 'crown-anchor-admin-state'

interface AdminState {
  /** Account status per e-mail address (lower-case). */
  userStatus: Record<string, AccountStatus>
}

function readState(): AdminState {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
    const candidate = (parsed as Partial<AdminState> | null)?.userStatus
    const isRecord = typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)
    return { userStatus: isRecord ? candidate : {} }
  } catch {
    return { userStatus: {} }
  }
}

function writeState(state: AdminState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    throw new Error('Admin changes could not be saved.')
  }
}

const normalize = (email: string) => email.trim().toLowerCase()

export const adminState = {
  /** The admin's decision if there is one, otherwise `fallback` (the status in the fixture). */
  getUserStatus(email: string, fallback: AccountStatus): AccountStatus {
    const stored = readState().userStatus[normalize(email)]
    return stored === 'active' || stored === 'suspended' ? stored : fallback
  },

  setUserStatus(email: string, status: AccountStatus): void {
    const state = readState()
    writeState({ ...state, userStatus: { ...state.userStatus, [normalize(email)]: status } })
  },
}