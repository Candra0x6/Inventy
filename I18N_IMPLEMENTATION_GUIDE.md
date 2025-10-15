# How to Implement i18n in Your Pages

This guide shows you how to add internationalization to any page in your application.

## Quick Start

### For Client Components ('use client')

```tsx
'use client'

import { useI18n } from '@/lib/i18n-helpers'
// or import { useTranslations } from 'next-intl'

export default function MyPage() {
  const { t, auth, nav, buttons, common } = useI18n()
  // or const t = useTranslations()
  
  return (
    <div>
      <h1>{auth.login.title}</h1>
      {/* or */}
      <h1>{t('auth_login_title')}</h1>
      
      <button>{buttons.save}</button>
      {/* or */}
      <button>{t('button_save')}</button>
    </div>
  )
}
```

### For Server Components

```tsx
import { getI18n } from '@/lib/i18n-helpers'
// or import { getTranslations } from 'next-intl/server'

export default async function MyServerPage() {
  const { t, auth, nav, buttons } = await getI18n()
  // or const t = await getTranslations()
  
  return (
    <div>
      <h1>{auth.login.title}</h1>
      <button>{buttons.save}</button>
    </div>
  )
}
```

## Step-by-Step Implementation

### Step 1: Add `'use client'` if needed

If your component uses hooks, state, or events, add `'use client'` at the top:

```tsx
'use client'

import { useI18n } from '@/lib/i18n-helpers'
```

### Step 2: Import the i18n helper

```tsx
import { useI18n } from '@/lib/i18n-helpers'
```

### Step 3: Use translations in your component

```tsx
export default function LoginPage() {
  const { t, auth, buttons } = useI18n()
  
  return (
    <form>
      <h1>{auth.login.title}</h1>
      <input placeholder={auth.login.emailPlaceholder} />
      <button>{auth.login.button}</button>
    </form>
  )
}
```

## Real Example: Login Page

### Before (English only):

```tsx
'use client'

export default function LoginPage() {
  return (
    <form>
      <h1>Welcome Back</h1>
      <p>Sign in to your account to continue</p>
      
      <label>Email Address</label>
      <input placeholder="Enter your email" />
      
      <label>Password</label>
      <input placeholder="Enter your password" />
      
      <button>Sign In</button>
      <button>Continue with Google</button>
      
      <p>Don't have an account? <a>Sign up</a></p>
    </form>
  )
}
```

### After (Multi-language):

```tsx
'use client'

import { useI18n } from '@/lib/i18n-helpers'

export default function LoginPage() {
  const { t, auth } = useI18n()
  
  return (
    <form>
      <h1>{auth.login.title}</h1>
      <p>{auth.login.subtitle}</p>
      
      <label>{auth.login.emailLabel}</label>
      <input placeholder={auth.login.emailPlaceholder} />
      
      <label>{auth.login.passwordLabel}</label>
      <input placeholder={auth.login.passwordPlaceholder} />
      
      <button>{auth.login.button}</button>
      <button>{auth.login.googleButton}</button>
      
      <p>{auth.login.noAccount} <a>{auth.login.signupLink}</a></p>
    </form>
  )
}
```

## Common Patterns

### 1. Replace Static Text

```tsx
// Before
<h1>Dashboard</h1>

// After
const { nav } = useI18n()
<h1>{nav.dashboard}</h1>
```

### 2. Replace Button Text

```tsx
// Before
<button>Save Changes</button>

// After
const { buttons } = useI18n()
<button>{buttons.save}</button>
```

### 3. Replace Placeholder Text

```tsx
// Before
<input placeholder="Search items..." />

// After
const { t } = useI18n()
<input placeholder={t('items_search_placeholder')} />
```

### 4. Replace Form Labels

```tsx
// Before
<label>Email Address</label>

// After
const { auth } = useI18n()
<label>{auth.login.emailLabel}</label>
```

### 5. Conditional Messages

```tsx
// Before
{loading ? "Loading..." : "Submit"}

// After
const { common, buttons } = useI18n()
{loading ? common.loading : buttons.submit}
```

### 6. Status/Enum Translations

```tsx
import { translateItemStatus } from '@/lib/i18n-helpers'

// Before
<span>{item.status}</span> // Shows "AVAILABLE"

// After
const { t } = useI18n()
<span>{translateItemStatus(item.status, t)}</span> // Shows "Available" or "Tersedia"
```

## Pages to Update

### ✅ Already Updated
- [x] Home page (`src/app/page.tsx`)

### 🔄 In Progress
Here's the list of pages that need i18n implementation:

1. **Authentication Pages**
   - `src/app/auth/login/page.tsx`
   - `src/app/auth/register/page.tsx`
   - `src/app/auth/error/page.tsx`

2. **Dashboard Pages**
   - `src/app/dashboard/page.tsx`
   - `src/app/dashboard/analytics/page.tsx`
   - `src/app/dashboard/late-tracking/page.tsx`
   - `src/app/dashboard/my-items/page.tsx`
   - `src/app/dashboard/my-notifications/page.tsx`
   - `src/app/dashboard/reservations/page.tsx`
   - `src/app/dashboard/returns/page.tsx`

3. **Items Pages**
   - `src/app/items/page.tsx`
   - `src/app/items/[id]/page.tsx`
   - `src/app/items/add/page.tsx`
   - `src/app/items/edit/[id]/page.tsx`
   - `src/app/items/scan/page.tsx`

4. **Reservation Pages**
   - `src/app/reservations/page.tsx`
   - `src/app/reservations/[id]/page.tsx`

5. **Profile Pages**
   - `src/app/profile/page.tsx`

6. **Other Pages**
   - `src/app/unauthorized/page.tsx`

### Components to Update

1. **Navigation Components**
   - `src/components/navigation/animated-navbar.tsx`
   - `src/components/navigation/footer.tsx`

2. **Dashboard Components**
   - `src/components/dashboard/*`

3. **Admin Components**
   - `src/components/admin/*`

4. **Item Components**
   - `src/components/items/*`

## Testing Your Implementation

1. **Add the language switcher** to your page:
```tsx
import { LanguageSwitcher } from '@/components/navigation/language-switcher'

<LanguageSwitcher />
```

2. **Test both languages**:
   - Click the language switcher
   - Select Indonesian (🇮🇩)
   - Verify all text changes to Indonesian
   - Select English (🇺🇸)
   - Verify all text changes back to English

3. **Check for missing translations**:
   - If you see a translation key like `auth_login_title` instead of the translated text
   - It means the key is missing from your translation files
   - Add it to both `messages/en.json` and `messages/id.json`

## Adding New Translations

1. **Add to English file** (`messages/en.json`):
```json
{
  "my_new_key": "My New Text"
}
```

2. **Add to Indonesian file** (`messages/id.json`):
```json
{
  "my_new_key": "Teks Baru Saya"
}
```

3. **Use in your component**:
```tsx
const { t } = useI18n()
<p>{t('my_new_key')}</p>
```

## Tips

1. **Use descriptive keys**: `auth_login_email_label` is better than `label1`
2. **Group related keys**: Start with a prefix like `auth_`, `nav_`, `button_`
3. **Keep translations consistent**: Use the same translation for the same English text
4. **Test edge cases**: Long Indonesian text might break your layout
5. **Update both languages**: Always add translations to both `en.json` and `id.json`

## Need Help?

- Check `I18N_SETUP.md` for detailed configuration info
- See `src/lib/i18n-helpers.ts` for available helper functions
- Look at `src/app/page.tsx` for a working example
- Reference `messages/en.json` and `messages/id.json` for available translation keys
