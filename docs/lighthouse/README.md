# Lighthouse reports

The brief only accepts reports from the **production URL**, run in **mobile** mode in an
**incognito** window. Reports from `localhost` or `npm run dev` are not accepted.

Each member saves their reports in their own folder, named
`<page>-before.html` and `<page>-after.html`, and records the scores in `ICA6.md`.

```
docs/lighthouse/
  oshadhi/   admin pages 27–34
  himasha/   admin pages 35–42
  ...
```

## How to run one report

1. Open the production site in a Chrome **incognito** window.
2. For admin pages: sign in at `/admin/login` first (in that same window).
3. Go to the page, open DevTools (F12) → **Lighthouse**.
4. Mode **Navigation**, Device **Mobile**, Category **Performance** (you can tick the others too).
5. For pages behind a login, open the ⚙ settings in the Lighthouse panel and **untick
   "Clear storage"**. Otherwise Lighthouse deletes the session cookie first and measures the
   login page instead. (Check the URL at the top of the finished report.)
6. Click **Analyze page load**. When it finishes, use ⋮ → **Save as HTML**.

Run each page two or three times and keep the middle result: scores move a few points
between runs.

**Before** reports must be taken on production **before** the change is deployed. **After**
reports are taken once it is live.
