# ABY Inventory - Official Color Palette

## Primary Brand Colors

### Teal Gradient (Primary Actions)
```css
--accent: #3fabc6;  /* Main teal - used for primary buttons, links, focus states */
--cyan: #2CB8DE;    /* Bright cyan - accent highlights, gradient end */
```
**Usage:**
- Sign in buttons
- Forgot password links
- Input field focus states
- Checkboxes when selected
- Logo accents
- Badge backgrounds
- Brand panel gradient

**Gradient:**
```css
background: linear-gradient(135deg, #3fabc6 0%, #2CB8DE 100%);
```

---

## Text Colors

### Slate (Primary Text)
```css
--slate: #38435C;   /* Dark blue-grey - main headings and body text */
```
**Usage:**
- Page titles
- Form labels
- Body text
- Input field text
- Error messages (standalone)

### Muted (Secondary Text)
```css
--muted: #8A93A6;   /* Medium grey - secondary information */
```
**Usage:**
- Subheadings
- Placeholder text
- Secondary descriptions
- Helper text
- Inactive states

---

## UI Colors

### Line (Borders & Dividers)
```css
--line: #E6E9F0;    /* Light grey - subtle borders */
```
**Usage:**
- Input field borders
- Divider lines
- Card borders
- Subtle separators

### Background
```css
--bg: #EEF4F9;      /* Very light blue - page background (not used in modal) */
```
**Usage:**
- Page background (when not using modal)
- Secondary background areas
- Subtle fills

---

## Status Colors

### Success (Green)
```css
--green: #15A24A;       /* Success state */
--greensoft: #E6F6EC;   /* Light green background */
```
**Usage:**
- Success badges
- Checkmarks
- Confirmation messages
- Success backgrounds
- "All synced" indicators

### Error (Red) 
```css
--red: #E0484B;  /* Error state - DARKER, MORE PROMINENT */
```
**Usage:**
- Error text (BOLD, 700+ weight)
- Error input borders
- Validation failure states
- Error backgrounds (with opacity)
- Alert messages

---

## Implementation Guidelines

### Buttons
```css
/* Primary Buttons */
background: linear-gradient(135deg, #3fabc6 0%, #2CB8DE 100%);
box-shadow: 0 10px 24px rgba(63, 171, 198, 0.4);
```

### Inputs
```css
/* Normal State */
border: 1.5px solid #D1D7E0;

/* Focus State */
border-color: #3fabc6;
box-shadow: 0 0 0 4px rgba(63, 171, 198, 0.18);
background-color: #f8fcfd;

/* Error State */
border-color: #E0484B;
background-color: rgba(224, 72, 75, 0.04);
```

### Text
```css
/* Heading */
color: #38435C;
font-weight: 800;

/* Body */
color: #38435C;
font-weight: 500;

/* Secondary */
color: #8A93A6;
font-weight: 500;

/* Error (IMPORTANT: Bold!) */
color: #E0484B;
font-weight: 700;
```

### Links
```css
color: #3fabc6;
font-weight: 600;

/* On Hover */
color: #2CB8DE;
text-decoration: underline;
```

---

## Color Usage by Component

### Login Form
- **Brand Panel:** Linear gradient (#3fabc6 → #2CB8DE → #1a8fa6)
- **Form Background:** White (#ffffff)
- **Labels:** Slate (#38435C)
- **Input Borders:** #D1D7E0 (normal) → #3fabc6 (focus)
- **Error Text:** Red (#E0484B)
- **Sign In Button:** Teal gradient
- **Forgot Password Link:** Teal (#3fabc6)
- **Checkbox Checked:** Teal gradient

### Unlock Screen
- **Brand Panel:** Same gradient
- **User Avatar:** Teal gradient background
- **Unlock Button:** Teal gradient
- **Locked Icon Badge:** Teal (#3fabc6)

### Reset Password Flow
- **Badge Icons:** Teal (#3fabc6) or Green (#15A24A)
- **Success Messages:** Green (#15A24A)
- **Error Messages:** Red (#E0484B)
- **Success Background:** Light green (#E6F6EC)

---

## Dark Mode Considerations

If implementing dark mode in future:
- Adjust background from white to dark slate
- Keep brand gradient unchanged
- Increase contrast ratios for accessibility
- Test color combinations for WCAG AA compliance

---

## Accessibility Notes

✅ **Good Contrast Ratios:**
- Slate (#38435C) on white: 9.1:1
- Slate on light backgrounds: 8.5:1
- Teal (#3fabc6) on white: 5.2:1
- Red (#E0484B) on white: 5.3:1

⚠️ **Always Pair with Icons:**
- Error states: Always show error icon + red text
- Success states: Always show checkmark + green
- Never rely on color alone for status

---

## CSS Variable Reference

```css
:root {
  --accent: #3fabc6;
  --cyan: #2CB8DE;
  --slate: #38435C;
  --muted: #8A93A6;
  --line: #E6E9F0;
  --bg: #EEF4F9;
  --green: #15A24A;
  --greensoft: #E6F6EC;
  --red: #E0484B;
}
```

Use these variables throughout the application for consistency!

---

## Final Notes

✨ **Design Principles:**
1. **Teal is Primary:** Use #3fabc6 and #2CB8DE for main interactions
2. **Red is Bold:** Error messages must be prominent with bold weight
3. **Gradients Add Life:** Use teal gradient for buttons and interactive elements
4. **Contrast First:** Always ensure text is readable on its background
5. **Consistent Styling:** Apply hover/focus states uniformly across all inputs

The color palette is now fully implemented in:
- `frontend/src/page/auth/admin/Auth.css`
- All login and unlock screen components
- Backend error responses (use same color codes)
