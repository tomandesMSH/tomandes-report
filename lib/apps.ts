// The apps the report form offers. The repository is always taken from here,
// never from the request - the form can only file issues where it's meant to.

export interface App {
  name: string
  repo: string
  // Offers "Jsem žákem ZUŠ Moravský Krumlov" (the apps the school uses).
  zus: boolean
}

export const OWNER = 'tomandesMSH'

export const APPS: Record<string, App> = {
  'keyboard-utils': { name: 'Keyboard Utils', repo: 'Keyboard-Utils', zus: true },
  'keyboard-hero': { name: 'Keyboard Hero / Muzio', repo: 'Keyboard-Hero', zus: true },
  kaspar: { name: 'KASPAR', repo: 'KASPAR', zus: false },
  'custom-autoplay': { name: 'Custom-AutoPlay', repo: 'Custom-AutoPlay', zus: false },
  'soundpad-translator': { name: 'Soundpad Translator', repo: 'SoundpadTranslator', zus: false },
  clipthat: { name: 'ClipThat', repo: 'ClipThat', zus: false },
  other: { name: 'Jiné / web tomandes.eu', repo: 'tomandesMSH', zus: false },
}

// Private: the optional contact goes here, never into the public issue.
export const CONTACTS_REPO = 'report-contacts'
