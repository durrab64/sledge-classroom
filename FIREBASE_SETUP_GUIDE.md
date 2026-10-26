# Sledge Classroom — Firebase & Google Drive Setup Guide 🔥

Welcome to **Sledge Classroom**! 

Your LMS uses **Google Drive / Share Links** for document storage and **Firebase** for Admin Authentication, Firestore Database, and Web.app Hosting.

### 💡 Why this setup is the best:
- **No Credit Card / Billing required** (bypasses Firebase Cloud Storage billing prompts).
- **15 GB Free Storage** via Google Drive (or unlimited with student accounts).
- **Auto-converts links**: When you paste a Google Drive link, the system automatically creates both a 1-click **Direct Download** link and an **Online Preview** link.
- **Fast & Free Hosting**: Deploys directly to `https://sledge-classroom.web.app`!

---

## 📌 Status
- ✅ Your Firebase Config is already added to `firebase-config.js` for project `sledge-classroom`.
- ✅ Firebase Hosting files (`firebase.json` and `.firebaserc`) are configured.

---

## Step 1: Create Your Admin Account (Authentication)

Only you (Muhammad Durrab / Sledge) will have access to add or delete files:

1. Open the [Firebase Console](https://console.firebase.google.com/) and click your project **`sledge-classroom`**.
2. In the left menu, click **Build** ➔ **Authentication**.
3. Under the **Sign-in method** tab, click **Email/Password**.
4. Enable the first toggle (**Email/Password**) and click **Save**.
5. Switch to the **Users** tab (next to Sign-in method).
6. Click **Add user**:
   - Enter your email (e.g. `sledge@classroom.com` or your Gmail).
   - Enter a secure password.
7. Click **Add user**. These are the credentials you will use to log into your website!

---

## Step 2: Enable Cloud Firestore Database

Firestore stores your course materials metadata, titles, Google Drive download links, and calendar events:

1. In the left menu, click **Build** ➔ **Firestore Database**.
2. Click **Create database**.
3. Select any region (e.g., `nam5 (us-central)` or nearest to your location).
4. Choose **Start in production mode**, then click **Enable**.
5. Once created, click on the **Rules** tab at the top.
6. Replace everything with these exact security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Course documents and nested collections (lectures, papers, related, lab)
    match /courses/{courseId}/{category}/{fileId} {
      // Anyone can read and download
      allow read: if true;
      // Only authenticated admin can add or delete resources
      allow write: if request.auth != null;
    }
    
    // Calendar events (quizzes, assignments, presentations)
    match /events/{eventId} {
      // Anyone can view upcoming calendar events
      allow read: if true;
      // Only authenticated admin can add or delete events
      allow write: if request.auth != null;
    }
  }
}
```
7. Click **Publish**.

---

## Step 3: How to Add Materials via Google Drive

1. Upload your slides, past papers, or PDFs to your **Google Drive**.
2. Right-click the file ➔ **Share** ➔ change access to **"Anyone with the link can view"** ➔ click **Copy link**.
3. Open your website (`http://localhost:8080` or `https://sledge-classroom.web.app`).
4. Click the **Shield Icon** (<i class="fas fa-user-shield"></i>) in the top-right navbar and log in with your admin email & password.
5. Go to any course or lab section (e.g. *Theory of Automata* ➔ *Past Papers*).
6. Click **"+ Add Past Paper"**:
   - **Resource Title**: e.g., `Midterm 2024 Solved with Key`
   - **Share Link**: Paste your Google Drive link
   - **Format**: Select PDF, Slides, Document, Spreadsheet, Code, etc.
   - Click **Save Resource**!
7. 🎉 It instantly appears! Students can click:
   - 👁️ **Preview** to view online in Google Docs viewer.
   - ⬇️ **Download** to download directly.
   - Only you (when logged in as admin) see the 🗑️ **Delete** button.

---

## Step 4: Publish to `sledge-classroom.web.app`

You can publish your LMS live on the web in 1 simple step:

1. Open PowerShell or Terminal in the project directory (`c:\LMS FOR my class lmao`).
2. Run:
   ```powershell
   npx firebase-tools login
   ```
   *(A browser window will open — simply click "Allow" with your Google account).*

3. Run:
   ```powershell
   npx firebase-tools deploy --only hosting
   ```

4. 🚀 That's it! Your website is live worldwide at:
   👉 **`https://sledge-classroom.web.app`**
   *(and also `https://sledge-classroom.firebaseapp.com`)*

---

## Step 5: Enable Realtime Database for Live "Now Playing" Widget 🎵

The Now Playing widget shows what you are listening to in real-time. It uses Firebase **Realtime Database** (RTDB) alongside your existing **Cloud Firestore**:

1. In the [Firebase Console](https://console.firebase.google.com/), open project **`sledge-classroom`**.
2. In the left sidebar, click **Build** ➔ **Realtime Database**.
3. Click **Create Database**.
4. Choose your preferred location (e.g. `United States (us-central1)`), select **Start in locked mode**, and click **Enable**.
5. Once created, notice the URL at the top (e.g. `https://sledge-classroom-default-rtdb.firebaseio.com/`).
   - If your URL is different, paste it into `firebase-config.js` (`databaseURL: "..."`).
6. Click on the **Rules** tab, and paste these exact rules:
   ```json
   {
     "rules": {
       "nowPlaying": {
         "current": {
           ".read": true,
           ".write": "auth != null"
         }
       },
       "$other": {
         ".read": false,
         ".write": false
       }
     }
   }
   ```
7. Click **Publish**. *(Or deploy from terminal via `npx firebase-tools deploy --only database`)*.

> [!NOTE]
> **Your course materials remain 100% safe!**
> Sledge Classroom stores all courses and documents in **Cloud Firestore** (`service cloud.firestore`), which has its own independent rules. Realtime Database rules only govern the `/nowPlaying/current` node and cannot touch or expose your Firestore course data.

### Loading the Chrome Extension:
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle ON **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `chrome-extension` folder inside `c:\LMS FOR my class lmao\chrome-extension`.
5. Click the extension icon in your toolbar, enter your Firebase Admin email and password, and click **Save & Connect**.
6. Play any song on `youtube.com` or `music.youtube.com` — your website will immediately display the live Now Playing card!

