import { addCollection } from '@iconify/vue'
import remixIcons from '@iconify-json/ri/icons.json'
import flatColorIcons from '@iconify-json/flat-color-icons/icons.json'

// Remix Icon is bundled locally so menu icons and table actions also work offline.
// Other Iconify collections can still be loaded on demand by their provider.
addCollection(remixIcons)
addCollection(flatColorIcons)
