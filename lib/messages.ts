// What the form shows when a report doesn't go through, in the reader's language (the form sends "lang").
// The issue itself is always written in Czech - it's for the author.

export type Lang = 'cs' | 'en'

export type MessageKey =
  | 'invalid'
  | 'spam'
  | 'app'
  | 'kind'
  | 'title'
  | 'description'
  | 'tooLong'
  | 'unavailable'
  | 'failed'

const MESSAGES: Record<Lang, Record<MessageKey, string>> = {
  cs: {
    invalid: 'Neplatný požadavek.',
    spam: 'Hlášení se nepodařilo odeslat, zkus to prosím znovu.',
    app: 'Vyber aplikaci.',
    kind: 'Vyber, o co jde.',
    title: 'Napiš krátce, o co jde.',
    description: 'Napiš, co se stalo.',
    tooLong: 'Text v poli „{field}“ je moc dlouhý (nejvýš {max} znaků).',
    unavailable: 'Hlášení teď nejde odeslat. Zkus to prosím později.',
    failed: 'Hlášení se nepodařilo uložit. Zkus to prosím za chvíli znovu.',
  },
  en: {
    invalid: 'Invalid request.',
    spam: "The report couldn't be sent, please try again.",
    app: 'Choose an app.',
    kind: "Choose what it's about.",
    title: "Say briefly what it's about.",
    description: 'Describe what happened.',
    tooLong: 'The text in "{field}" is too long (at most {max} characters).',
    unavailable: "Reports can't be sent right now. Please try again later.",
    failed: "The report couldn't be saved. Please try again in a moment.",
  },
}

const FIELD_NAMES: Record<Lang, Record<string, string>> = {
  cs: { title: 'Krátce, o co jde', description: 'Popis', steps: 'Jak to zopakovat', version: 'Verze', contact: 'Kontakt' },
  en: { title: 'In short', description: 'Description', steps: 'How to repeat it', version: 'Version', contact: 'Contact' },
}

export function langOf(value: unknown): Lang {
  return value === 'en' ? 'en' : 'cs'
}

export function message(lang: Lang, key: MessageKey, params: { field?: string; max?: number } = {}): string {
  return MESSAGES[lang][key]
    .replace('{field}', params.field ? FIELD_NAMES[lang][params.field] ?? params.field : '')
    .replace('{max}', String(params.max ?? ''))
}
