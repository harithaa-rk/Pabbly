# Kaira Connect — Automation Workflow Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-darkgreen.svg)](https://www.mongodb.com/atlas)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-teal.svg)](https://www.prisma.io/)

A modern, production-grade SaaS workflow automation platform inspired by Pabbly Connect.

---

## 📌 Project Overview
- **Application Name**: Kaira Connect
- **Current Scope**: **P1 — Phase 1: Core MVP Foundation**
- **Active Module**: **M1 — Module 1: Authentication & User Management**
- **Database**: MongoDB Atlas with Prisma ORM
- **Authentication**: JWT, bcrypt hashing (12 rounds), HTTP-only secure cookies, and bearer token support.

---

## 📁 Monorepo Architecture

```
kaira-connect/
├── frontend/                     # Next.js 14 App Router, React, Tailwind CSS, Zustand
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   └── verify-email/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── settings/profile/page.tsx
│   │   │   ├── workflows/page.tsx        (M3 Placeholder)
│   │   │   ├── connections/page.tsx      (M4 Placeholder)
│   │   │   ├── executions/page.tsx       (M8 Placeholder)
│   │   │   └── templates/page.tsx        (M2 Placeholder)
│   │   ├── layout.tsx
│   │   ├── page.tsx                      (Root router guard)
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                           (Button, Input, PasswordInput, Card, Modal, Toast, Avatar, etc.)
│   │   ├── layout/                       (Sidebar, Topbar, DashboardLayout)
│   │   └── auth/                         (ProtectedRoute, PasswordStrengthIndicator)
│   ├── hooks/                            (useAuth, useToast)
│   ├── lib/                              (api.ts, utils.ts)
│   ├── services/                         (authService.ts, userService.ts)
│   ├── store/                            (authStore.ts with Zustand)
│   ├── types/                            (auth.ts, user.ts)
│   ├── middleware.ts                     (Edge session route guard)
│   └── package.json
│
├── backend/                      # Express.js REST API with TypeScript & Prisma
│   ├── src/
│   │   ├── config/                       (env.ts, database.ts)
│   │   ├── controllers/                  (auth.controller.ts, user.controller.ts, admin.controller.ts)
│   │   ├── middleware/                   (auth.middleware.ts, error.middleware.ts, rateLimit.middleware.ts)
│   │   ├── routes/                       (auth.routes.ts, user.routes.ts, admin.routes.ts)
│   │   ├── services/                     (auth.service.ts, user.service.ts, email.service.ts)
│   │   ├── utils/                        (jwt.ts, password.ts, apiResponse.ts)
│   │   ├── validators/                   (auth.validator.ts, user.validator.ts)
│   │   ├── types/                        (index.ts)
│   │   ├── app.ts                        (Express application config)
│   │   └── server.ts                     (HTTP server bootstrap)
│   ├── prisma/
│   │   ├── schema.prisma                 (MongoDB Atlas schema definition)
│   │   └── seed.ts                       (Development admin & demo user seed script)
│   ├── tests/                            (Comprehensive Jest test suites - 21 tests)
│   │   ├── auth.test.ts
│   │   ├── user.test.ts
│   │   └── security.test.ts
│   └── package.json
│
├── Kaira_Connect_Postman_Collection.json # Complete Postman test collection
├── README.md
└── package.json                          # Root monorepo scripts
```

---

## 🔐 Security & Architecture Features
1. **Password Hashing**: Uses `bcryptjs` with 12 salt rounds. Plaintext passwords are never logged, stored, or returned.
2. **Session Security**: JWT tokens stored in `HTTP-only`, `secure` (production), `sameSite` cookies with 24-hour expiration.
3. **Role-Based Access Control (RBAC)**:
   - `ADMIN`
   - `USER` (Default for public registrations)
   - `TEAM_MEMBER`
   - Public registrations strictly prevent assigning self as `ADMIN`.
   - Admin routes guarded by `requireRole('ADMIN')`.
4. **Brute Force Protection**: Express rate limiting applied across `/register`, `/login`, `/forgot-password`, `/reset-password`.
5. **Input Validation**: Strict request body validation via Zod schemas.
6. **Error Sanitization**: Centralized error middleware prevents stack trace leakage in production.
7. **Email Verification Architecture**: Generates 24-hour secure verification tokens. In development, logs verification URLs directly to console.
8. **Secure Password Reset**: One-time use tokens with 1-hour expiration; invalidated immediately upon usage along with previous sessions.

---

## 📡 API Documentation

### Base URL: `/api`

### 1. Health Check
- **Method**: `GET`
- **URL**: `/api/health`
- **Auth**: None
- **Response**: `200 OK`
```json
{
  "status": "healthy",
  "service": "Kaira Connect API",
  "version": "1.0.0",
  "timestamp": "2026-11-10T14:47:47.817Z"
}
```

### 2. User Registration
- **Method**: `POST`
- **URL**: `/api/auth/register`
- **Auth**: None (Rate limited)
- **Request Body**:
```json
{
  "name": "Haritha",
  "email": "user@example.com",
  "password": "Password@123"
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email address.",
  "data": { "token": "jwt_token_string" },
  "user": {
    "id": "6730a84c...",
    "name": "Haritha",
    "email": "user@example.com",
    "role": "USER",
    "avatar": null,
    "isEmailVerified": false,
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "...",
    "lastLoginAt": null
  }
}
```
- **Possible Errors**: `400 Bad Request` (validation), `409 Conflict` (duplicate email), `429 Too Many Requests`.

### 3. User Login
- **Method**: `POST`
- **URL**: `/api/auth/login`
- **Auth**: None (Rate limited)
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "Password@123"
}
```
- **Response**: `200 OK` (Sets HTTP-only `kaira_token` cookie)
```json
{
  "success": true,
  "message": "Login successful",
  "data": { "token": "jwt_token_string" },
  "user": { ... }
}
```
- **Possible Errors**: `401 Unauthorized` (invalid email or password), `403 Forbidden` (account deactivated).

### 4. Get Current User
- **Method**: `GET`
- **URL**: `/api/auth/me`
- **Auth**: Required (`kaira_token` cookie or `Bearer <token>`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "User authenticated successfully",
  "user": { ... }
}
```
- **Possible Errors**: `401 Unauthorized`.

### 5. User Logout
- **Method**: `POST`
- **URL**: `/api/auth/logout`
- **Auth**: Optional (Clears cookie and destroys session)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 6. Forgot Password
- **Method**: `POST`
- **URL**: `/api/auth/forgot-password`
- **Auth**: None (Rate limited)
- **Request Body**:
```json
{
  "email": "user@example.com"
}
```
- **Response**: `200 OK` (Always generic for security)
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent."
}
```

### 7. Reset Password
- **Method**: `POST`
- **URL**: `/api/auth/reset-password`
- **Auth**: None (Rate limited)
- **Request Body**:
```json
{
  "token": "reset_token_hex",
  "password": "NewPassword@123"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Password has been reset successfully. Please log in with your new password."
}
```
- **Possible Errors**: `400 Bad Request` (invalid or expired token).

### 8. Change Password
- **Method**: `POST`
- **URL**: `/api/auth/change-password`
- **Auth**: Required
- **Request Body**:
```json
{
  "currentPassword": "Password@123",
  "newPassword": "NewPassword@456"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```
- **Possible Errors**: `400 Bad Request` (incorrect current password).

### 9. Get User Profile
- **Method**: `GET`
- **URL**: `/api/users/profile`
- **Auth**: Required
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "user": { ... }
}
```

### 10. Update User Profile
- **Method**: `PATCH`
- **URL**: `/api/users/profile`
- **Auth**: Required
- **Request Body**:
```json
{
  "name": "Updated Name",
  "avatar": "https://example.com/photo.jpg"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": { ... }
}
```

### 11. Email Verification
- **Method**: `GET`
- **URL**: `/api/auth/verify-email?token=<TOKEN>`
- **Auth**: None
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Email verified successfully",
  "user": { ... }
}
```

### 12. Admin User Management
- **Method**: `GET /api/admin/users` (List all users with pagination)
- **Method**: `PATCH /api/admin/users/:id/role` (Update user role)
- **Method**: `PATCH /api/admin/users/:id/status` (Activate/deactivate user)
- **Auth**: Required (`ADMIN` role only)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js v22.17.0)
- npm 10+
- MongoDB Atlas account and connection string

### 2. Environment Variables

#### Backend (`backend/.env`):
```env
DATABASE_URL="mongodb+srv://<username>:<password>@cluster.mongodb.net/kaira_connect?retryWrites=true&w=majority"
JWT_SECRET="kaira-connect-super-secure-jwt-secret-key-production-ready-2026"
JWT_EXPIRES_IN="1d"
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:5000"
NODE_ENV="development"
PORT="5000"
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM="Kaira Connect <no-reply@kairaconnect.com>"
```

#### Frontend (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
```

### 3. Database Initialization & Seed
```bash
# Push Prisma schema to MongoDB Atlas
npm run prisma:push

# Seed development admin and demo user
npm run prisma:seed
```

**Default Seed Accounts:**
- **Admin**: `admin@kairaconnect.com` | `AdminPassword@123` (Role: `ADMIN`)
- **Demo**: `user@example.com` | `Password@123` (Role: `USER`)

### 4. Running the Development Servers
From the root directory:
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api`

---

## 🧪 Testing

Run backend tests:
```bash
npm run test:backend
```
**Test coverage (21 test suites passed):**
- User registration
- Duplicate email prevention
- Login success
- Login invalid password
- Login unknown email
- Get current user (`/api/auth/me`)
- Unauthorized access rejection (401)
- User logout
- Password hashing verification
- Password reset token generation & single-use invalidation
- Profile update (name & avatar)
- Role authorization (ADMIN vs USER)

---

## 🌐 Production Deployment

### Frontend Deployment (Vercel)
1. Import repository on [Vercel](https://vercel.com).
2. Set Root Directory to `frontend`.
3. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL`: `https://your-backend-service.onrender.com/api`
4. Deploy!

### Backend Deployment (Render)
1. Create a **Web Service** on [Render](https://render.com).
2. Set Root Directory to `backend`.
3. Set Build Command: `npm install && npm run build && npx prisma generate`
4. Set Start Command: `npm start`
5. Configure Environment Variables:
   - `DATABASE_URL`: `mongodb+srv://...`
   - `JWT_SECRET`: Secure 64-character random key
   - `JWT_EXPIRES_IN`: `1d`
   - `FRONTEND_URL`: `https://your-frontend-app.vercel.app`
   - `BACKEND_URL`: `https://your-backend-service.onrender.com`
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
6. Deploy!

