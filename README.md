# Career Compass

A 20-question behavioral career assessment (RIASEC-based) that recommends a
student's top 3 career matches, with results saved to a Google Sheet (free)
and a radar chart of the student's trait profile.

## 1. Set up the Google Sheet + Apps Script webhook

1. Create a new Google Sheet. Rename the first sheet tab to `Results`.
2. In the sheet, add a header row (row 1):
   `Timestamp | Name | Email | Mobile | Scores | Top Types | Top Careers`
3. Go to **Extensions → Apps Script**, delete any starter code, and paste:

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Results");
  var data = JSON.parse(e.parameter.data);

  sheet.appendRow([
    new Date(),
    data.name,
    data.email,
    data.mobile,
    JSON.stringify(data.scores),
    data.topTypes.join(", "),
    data.topCareers.map(function (c) {
      return c.name + " (" + Math.round(c.match * 100) + "%)";
    }).join(" | ")
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. Click **Deploy → New deployment → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click Deploy, authorize the permissions Google asks for, then copy the
   **Web app URL** (ends in `/exec`).

## 2. Add the URL to the app

Edit `src/App.jsx`:

```js
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
```

Paste your `/exec` URL from step 1.5.

Every completed assessment appends one row to the `Results` tab — no database,
no cost, and you can open the sheet directly to see all 1000 students'
answers, or build a pivot table / chart on top of it in Sheets itself.

> Note: some browsers show a harmless CORS warning in the console for Apps
> Script responses. The write to the sheet still succeeds — this is a known
> quirk of Apps Script web apps, not a bug in the app.

## 3. Run locally

```bash
npm install
npm run dev
```

Opens at http://localhost:5173

## 4. Deploy to Vercel

**Option A — via GitHub (recommended)**
1. Push this folder to a new GitHub repo
2. Go to vercel.com → New Project → Import the repo
3. Vercel auto-detects Vite. Framework preset: "Vite". Build command: `npm run build`. Output directory: `dist`
4. Click Deploy — done in ~1 minute

**Option B — via CLI**
```bash
npm install -g vercel
vercel login
vercel --prod
```

## 5. Editing content

- Questions: edit the `QUESTIONS` array in `src/App.jsx`
- Careers: edit the `CAREERS` array (each has a `v: [R,I,A,S,E,C]` score 0-5)

No other logic needs to change when you edit content.
