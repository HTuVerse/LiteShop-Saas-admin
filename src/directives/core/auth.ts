import { watchEffect, shallowRef } from 'vue'
import type { App, Directive, ShallowRef } from 'vue'
import { useAuth } from '@/hooks/core/useAuth'
import type { RequiredPermission } from '@/utils/operation-permission'

// Visibility only. The server independently checks every protected operation.
export type AuthDirective = Directive<HTMLElement, RequiredPermission>
const states = new WeakMap<
  HTMLElement,
  { required: ShallowRef<RequiredPermission>; stop: () => void; apply: () => void }
>()
const authDirective: Directive<HTMLElement, RequiredPermission> = {
  mounted(el, binding) {
    const required = shallowRef(binding.value)
    const { hasAuth } = useAuth()
    let display = el.style.display
    let hiddenByAuth = false
    const apply = () => {
      if (hasAuth(required.value)) {
        if (hiddenByAuth) el.style.display = display
        hiddenByAuth = false
      } else {
        if (!hiddenByAuth || el.style.display !== 'none') display = el.style.display
        hiddenByAuth = true
        el.style.setProperty('display', 'none', 'important')
      }
    }
    const stop = watchEffect(apply)
    states.set(el, { required, stop, apply })
  },
  updated(el, binding) {
    const state = states.get(el)
    if (state) {
      state.required.value = binding.value
      state.apply()
    }
  },
  unmounted(el) {
    states.get(el)?.stop()
    states.delete(el)
  }
}
export function setupAuthDirective(app: App): void {
  app.directive('auth', authDirective)
}
