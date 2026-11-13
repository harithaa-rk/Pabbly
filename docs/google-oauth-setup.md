# Google OAuth Setup Guide for Kaira Connect

This guide provides step-by-step instructions for configuring Google OAuth 2.0 authentication in the Google Cloud Console for the **Kaira Connect** automation platform.

---

## Overview

The application utilizes Google OAuth 2.0 strictly for user authentication (Login and Sign-Up).
* **Scopes requested**: `openid`, `email`, `profile`
* **Forbidden Scopes**: No Gmail, Google Drive, Google Sheets, or any other Google Workspace permissions are requested.
* **Authentication Flow**:
  1. Frontend presents the **Continue with Google** button.
  2. Clicking initiates `GET /api/auth/google` on the backend.
  3. The backend generates a secure CSRF `state` and redirects the user to Google's consent screen.
  4. Google authenticates the user and redirects back to `http://localhost:5000/api/auth/google/callback`.
  5. The backend cryptographically validates the Google ID token (`sub`, `email`, `email_verified`, `name`, `picture`).
  6. The backend checks MongoDB Atlas: logs in an existing user or creates a new user, and signs an application JWT stored in a secure HTTP-only cookie (`kaira_token`).
  7. The user is redirected to `http://localhost:3000/dashboard`.

---

## Step 1: Create a Google Cloud Project

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. In the top navigation bar, click the project dropdown and click **New Project**.
3. Enter a project name, e.g., `Kaira Connect Automation`.
4. Click **Create** and select your newly created project from the notifications or project selector.

---

## Step 2: Configure OAuth Consent Screen

1. In the left navigation menu, navigate to **APIs & Services** &rarr; **OAuth consent screen** (or **Google Auth Platform**).
2. Choose User Type:
   * **External**: Select this if the application will be accessible by any user with a Google account (standard for SaaS platforms).
   * **Internal**: Only available if using Google Workspace organization and restricting access to internal employees.
3. Click **Create**.
4. Fill in the App Information:
   * **App name**: `Kaira Connect`
   * **User support email**: Select your email address.
   * **App logo**: (Optional) Upload your company logo (`public/logo.png`).
   * **App domain**:
     * Application home page: `http://localhost:3000` (or your production URL `https://app.kairaconnect.com`)
     * Privacy policy link: `http://localhost:3000/privacy`
     * Terms of service link: `http://localhost:3000/terms`
   * **Developer contact information**: Enter your email address.
5. Click **Save and Continue**.

---

## Step 3: Configure Scopes

1. Click **Add or Remove Scopes**.
2. Select only the three standard OpenID Connect scopes:
   * `.../auth/userinfo.email` (See your primary Google Account email address)
   * `.../auth/userinfo.profile` (See your personal info, including any personal info you've made publicly available)
   * `openid` (Associate you with your personal info on Google)
3. **DO NOT** select any Gmail scopes (e.g. `https://mail.google.com/`), Drive scopes, or Calendar scopes.
4. Click **Update** and then **Save and Continue**.

---

## Step 4: Add Test Users (If in "Testing" Status)

1. Under **Test users**, click **+ Add Users**.
2. Enter the Google email address(es) that you will use to test login during development.
3. Click **Save and Continue**.

---

## Step 5: Create OAuth 2.0 Credentials

1. In the left navigation menu, click **Credentials**.
2. Click **+ Create Credentials** at the top and select **OAuth client ID**.
3. Under **Application type**, select **Web application**.
4. Enter a name: `Kaira Connect Web Client`.

---

## Step 6: Configure Authorized JavaScript Origins & Redirect URIs

### Authorized JavaScript origins
These are the frontend URLs that can initiate authentication requests:
* **Local Development**:
  * `http://localhost:3000`
  * `http://localhost:3001` (if using alternate port)
* **Production**:
  * `https://app.yourdomain.com`

### Authorized redirect URIs
> [!IMPORTANT]
> The redirect URI is **NOT** generated automatically by Google. It must be the exact backend callback endpoint created by Kaira Connect.
> Google will reject requests with `redirect_uri_mismatch` if this URL does not match character-for-character.

* **Local Development**:
  * `http://localhost:5000/api/auth/google/callback`
* **Production**:
  * `https://api.yourdomain.com/api/auth/google/callback`

Click **Create**.

---

## Step 7: Configure Environment Variables

A modal will appear displaying your **Client ID** and **Client Secret**.

1. Open `backend/.env`.
2. Add or update the variables:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/auth/google/callback"
```

3. Ensure `.env` is never committed to Git (verified in `.gitignore`).
4. Update `backend/.env.example` with safe placeholder keys for team members.

---

## Step 8: Verification & Testing

1. Start the backend:
   ```bash
   cd backend
   npm run dev
   ```
2. Start the frontend:
   ```bash
   cd frontend
   npm run start   # or npm run dev
   ```
3. Open `http://localhost:3000/login` in your browser.
4. Click **Continue with Google**.
5. Select your Google account and grant consent.
6. Verify you are automatically redirected to `http://localhost:3000/dashboard` with an active authenticated session.

