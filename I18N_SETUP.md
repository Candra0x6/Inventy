# Internationalization (i18n) Setup Guide

This project uses `next-intl` for internationalization support across the entire application.

## 📦 Installation

The package is already installed:
```bash
npm install next-intl
```

## 🌍 Supported Languages

- **English (en)** - Default language
- **Indonesian (id)** - Bahasa Indonesia

## 📁 Project Structure

```
inventy/
├── messages/
│   ├── en.json          # English translations
│   └── id.json          # Indonesian translations
├── src/
│   ├── i18n.ts          # i18n configuration
│   ├── app/
│   │   ├── layout.tsx   # Root layout with NextIntlClientProvider
│   │   └── page.tsx     # Home page using translations
│   └── components/
│       └── navigation/
│           └── language-switcher.tsx  # Language switcher component
├── next.config.ts       # Next.js config with next-intl plugin
└── middleware.ts        # Middleware (no changes needed for current setup)
```

## 🔧 Configuration Files

### 1. `src/i18n.ts`
Core configuration file that:
- Defines supported locales
- Loads translation messages from JSON files
- Reads locale preference from cookies

### 2. `next.config.ts`
Configured with `createNextIntlPlugin` to integrate next-intl with Next.js.

### 3. `src/app/layout.tsx`
Root layout wrapped with `NextIntlClientProvider` to provide translations to all components.

## 📝 Translation Files

### English (`messages/en.json`)
```json
{
  "hero_title_smart": "Smart Inventory",
  "hero_title_management": "Management",
  "hero_description": "Transform your inventory operations...",
  ...
}
```

### Indonesian (`messages/id.json`)
```json
{
  "hero_title_smart": "Inventaris Cerdas",
  "hero_title_management": "Manajemen",
  "hero_description": "Transformasikan operasi inventaris Anda...",
  ...
}
```

## 🎨 Usage in Components

### Client Components
```tsx
'use client'
import { useTranslations } from 'next-intl'

export default function MyComponent() {
  const t = useTranslations()
  
  return (
    <div>
      <h1>{t('hero_title_smart')}</h1>
      <p>{t('hero_description')}</p>
    </div>
  )
}
```

### Server Components
```tsx
import { getTranslations } from 'next-intl/server'

export default async function MyServerComponent() {
  const t = await getTranslations()
  
  return (
    <div>
      <h1>{t('hero_title_smart')}</h1>
    </div>
  )
}
```

## 🔄 Language Switching

The `LanguageSwitcher` component is available for users to switch between languages:

```tsx
import { LanguageSwitcher } from '@/components/navigation/language-switcher'

// Use it in your component
<LanguageSwitcher />
```

**Features:**
- 🌐 Globe icon button
- 🎨 Dropdown menu with flags
- 💾 Persists selection in localStorage and cookies
- ✅ Shows checkmark for active language
- 🔄 Auto-refresh on language change

## 🚀 Adding New Languages

1. **Add locale to configuration** (`src/i18n.ts`):
```typescript
export const locales = ['en', 'id', 'es'] as const; // Add 'es' for Spanish
```

2. **Create translation file** (`messages/es.json`):
```json
{
  "hero_title_smart": "Inventario Inteligente",
  ...
}
```

3. **Update LanguageSwitcher** (optional):
```typescript
const locales = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'id', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
]
```

## 📋 Adding New Translation Keys

1. **Add to English** (`messages/en.json`):
```json
{
  "new_feature_title": "New Feature",
  "new_feature_description": "Description here"
}
```

2. **Add translations for all languages** (`messages/id.json`):
```json
{
  "new_feature_title": "Fitur Baru",
  "new_feature_description": "Deskripsi di sini"
}
```

3. **Use in your component**:
```tsx
<h2>{t('new_feature_title')}</h2>
<p>{t('new_feature_description')}</p>
```

## 🎯 Best Practices

1. **Key Naming Convention**
   - Use snake_case: `hero_title_smart`
   - Be descriptive: `feature_realtime_analytics_title`
   - Group related keys: `cta_section_title`, `cta_section_description`

2. **Translation Organization**
   - Keep translations flat (no deep nesting)
   - Use consistent key prefixes for related content
   - Document complex translations with comments

3. **Content Management**
   - Always add translations for ALL supported languages
   - Keep translation files in sync
   - Review translations with native speakers

4. **Performance**
   - Translation files are automatically code-split
   - Only the active locale is loaded
   - Messages are cached by Next.js

## 🐛 Troubleshooting

### Translation not showing
- Verify the key exists in the JSON file
- Check for typos in the key name
- Ensure the locale cookie is set correctly

### Language not switching
- Clear browser cache and cookies
- Check browser console for errors
- Verify localStorage has the correct locale

### Build errors
- Ensure all translation files have valid JSON syntax
- Check that all required keys exist in all language files
- Run `npm run build` to test

## 📚 Additional Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js i18n Guide](https://nextjs.org/docs/advanced-features/i18n-routing)
- [Translation Best Practices](https://next-intl-docs.vercel.app/docs/usage/best-practices)

## ✅ Current Translation Coverage

- ✅ Home page hero section
- ✅ Features section (6 features)
- ✅ CTA section
- ⏳ Dashboard pages (to be added)
- ⏳ Item management pages (to be added)
- ⏳ User profile pages (to be added)

---

Last updated: 2025-01-15
