import maleAvatar from '@/assets/images/brand/avatar-male.png'
import femaleAvatar from '@/assets/images/brand/avatar-female.png'

/**
 * Return a user's uploaded avatar, or the matching built-in avatar when none is set.
 */
export function resolveUserAvatar(avatar?: unknown, gender?: unknown): string {
  if (typeof avatar === 'string' && avatar.trim()) return avatar

  const normalizedGender = String(gender ?? '')
    .trim()
    .toLowerCase()
  return ['2', '女', 'female', 'f'].includes(normalizedGender) ? femaleAvatar : maleAvatar
}
