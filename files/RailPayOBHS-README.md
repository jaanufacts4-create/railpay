# RailPay OBHS — integration notes

Single-file React component for railway OBHS contractor payroll (trip-based salary,
train master with running days + special/seasonal validity, manpower planning,
per-date cancellations, hours & shortfall-penalty calculation).

## Files
- `RailPayOBHS.jsx` — the whole app as one component (`export default App`). Uses `localStorage` for persistence.

## Dependencies
```bash
npm install xlsx lucide-react
```
Tailwind CSS must be set up in the project (core utility classes only; fonts load from Google Fonts inside the component).

## Use it
Drop `RailPayOBHS.jsx` into `src/` and render it:
```jsx
// src/App.jsx
import RailPayOBHS from "./RailPayOBHS.jsx";
export default function App() {
  return <RailPayOBHS />;
}
```

## Data / storage
Persists to `localStorage` under keys prefixed `obhs:` (firm, employees, trips,
designations, trains, rates, minwages, penalties). To reset the demo, clear those keys.
For real multi-contractor use, replace the `store` helper (top of the file) with API
calls to your backend and scope data per `contractor_id`.

## Push to your existing repo
```bash
# copy the two files into your repo, then:
git add RailPayOBHS.jsx RailPayOBHS-README.md
git commit -m "Add RailPay OBHS payroll module"
git push
```
