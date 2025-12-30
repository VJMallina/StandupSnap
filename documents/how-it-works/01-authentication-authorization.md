# Authentication & Authorization - How It Works

## Overview
- **Purpose**: Secure user authentication and role-based access control (RBAC)
- **Key Features**: User registration, login, JWT token management, password reset, granular permissions
- **User Roles**: Scrum Master (SM), Product Owner (PO), PMO

## Screens & Pages

### Screen 1: Login Page
**Route**: `/login`
**Access**: Public (unauthenticated users)
**Component**: `F:\StandupSnap\frontend\src\pages\LoginPage.tsx`

#### UI Components
- Username/Email input field
- Password input field
- "Sign in" button
- "Forgotten password?" link
- "Create account" link
- Error message banner (if login fails)
- Loading spinner (during authentication)

#### User Actions

##### Action 1: User Enters Credentials and Clicks "Sign in"

**What happens**: Complete authentication flow

**Frontend**:
1. User fills in `usernameOrEmail` and `password` fields
2. Form validation: Both fields required
3. On submit, `handleSubmit` prevents default form submission
4. Sets `loading` state to true
5. Calls `login()` from AuthContext

**API Call**:
```http
POST /api/auth/login
Content-Type: application/json

{
  "usernameOrEmail": "john@example.com",
  "password": "SecurePass123!"
}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\auth\auth.controller.ts` - `@Post('login')`
- **Service**: `F:\StandupSnap\backend\src\auth\auth.service.ts` - `login(loginDto)`

**Backend Flow**:
1. **AuthService.login()** receives `LoginDto` (username/email + password)
2. **Find User**: Query `users` table by username OR email
   ```sql
   SELECT * FROM users WHERE username = ? OR email = ?
   ```
3. **Validate User**: Check if user exists and `isActive = true`
   - If not found or inactive: throw `UnauthorizedException('Invalid credentials')`
4. **Verify Password**: Use bcrypt to compare hashed password
   ```typescript
   const isMatch = await bcrypt.compare(password, user.password);
   ```
   - If mismatch: throw `UnauthorizedException('Invalid credentials')`
5. **Load Roles**: Eager load user's roles from `user_roles` join table
6. **Extract Permissions**: Get permissions array from each role
7. **Generate JWT Tokens**:
   - **Access Token**: Short-lived (15 mins), payload: `{ userId, username, roles, permissions }`
   - **Refresh Token**: Long-lived (7 days), payload: `{ userId }`
8. **Save Refresh Token**: Store in `refresh_tokens` table with expiry
   ```sql
   INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)
   ```
9. **Return AuthResponse**:
   ```json
   {
     "accessToken": "eyJhbGciOiJIUzI1NiIs...",
     "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
     "user": {
       "id": "uuid",
       "username": "john",
       "email": "john@example.com",
       "name": "John Doe",
       "roles": [{ "name": "scrum_master", "permissions": [...] }]
     }
   }
   ```

**Database**:
- **Tables Affected**:
  - `users` (READ)
  - `user_roles` (READ via join)
  - `roles` (READ)
  - `refresh_tokens` (INSERT)

**Response**: Returns `accessToken`, `refreshToken`, and user object

**UI Update**:
1. AuthContext stores tokens in localStorage
2. Sets user state in context
3. Redirects to dashboard (`/`)
4. All subsequent API calls include `Authorization: Bearer {accessToken}` header

**Validations**:
- **Client-side**: Required fields validation (HTML5 `required`)
- **Server-side**:
  - User must exist
  - User must be active (`isActive = true`)
  - Password must match
  - Rate limiting (prevent brute force)

**Error Handling**:
- **Invalid credentials**: Shows error banner "Invalid username/email or password"
- **Account inactive**: "Your account has been deactivated"
- **Network error**: "Unable to connect to server"
- **Server error**: "An unexpected error occurred. Please try again."

---

##### Action 2: Click "Forgotten password?"

**What happens**: Navigate to password reset flow

**Frontend**:
- `Link` component navigates to `/forgot-password`
- No API call at this stage

**UI Update**: Redirects to Forgot Password page

---

##### Action 3: Click "Create account"

**What happens**: Navigate to registration page

**Frontend**:
- `Link` component navigates to `/register`

**UI Update**: Redirects to Register page

---

#### Data Flow Diagram
```
User enters credentials → Frontend validates →
POST /api/auth/login → AuthService validates user →
bcrypt.compare(password) → Generate JWT tokens →
Save refresh token to DB → Return tokens + user →
Store in localStorage → Update AuthContext →
Redirect to dashboard
```

#### Business Rules
- Password must not be stored in plain text (bcrypt hashing required)
- Access token expires after 15 minutes
- Refresh token expires after 7 days
- Failed login attempts are logged (for security audit)
- User must be active to log in

#### Edge Cases
- **User not found**: Generic error message (don't reveal if user exists)
- **Password mismatch**: Same generic error (security best practice)
- **Account deactivated**: Specific error message
- **Token generation failure**: Internal server error
- **Concurrent logins**: Multiple refresh tokens allowed per user

---

### Screen 2: Register Page
**Route**: `/register` or `/register?token={invitationToken}`
**Access**: Public
**Component**: `F:\StandupSnap\frontend\src\pages\RegisterPage.tsx`

#### UI Components
- Full Name input
- Email input (read-only if invitation)
- Username input
- Password input
- Role selector dropdown (disabled if invitation)
- Role description box
- "Create account" button
- "Sign in" link
- Invitation banner (if token present)
- Validation hints (password requirements, username constraints)

#### User Actions

##### Action 1: Register via Invitation Link

**What happens**: User completes registration with pre-assigned role

**Frontend**:
1. On mount, if `?token=` exists in URL, validate invitation
2. **API Call** (validation):
   ```http
   GET /api/invitations/validate/{token}
   ```
3. If valid, pre-fill email and role (make them read-only)
4. User fills in: name, username, password
5. On submit, call register with `invitationToken`

**API Call** (registration):
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!@",
  "name": "John Doe",
  "roleName": "scrum_master",
  "invitationToken": "abc123..." (optional)
}
```

**Backend Flow**:
1. **Validate DTO**: Check all required fields
2. **Validate Invitation** (if token provided):
   - Query `invitations` table
   - Check status = PENDING and not expired
   - Match email
3. **Check Uniqueness**:
   - Username must be unique
   - Email must be unique
4. **Validate Password Strength**: Min 8 chars, uppercase, lowercase, number, special char
5. **Hash Password**: `bcrypt.hash(password, 10)`
6. **Create User**:
   ```sql
   INSERT INTO users (username, email, password, name, is_active)
   VALUES (?, ?, ?, ?, true)
   ```
7. **Assign Role**:
   - Find role by `roleName` from `roles` table
   - Create entry in `user_roles` join table
8. **Mark Invitation as Accepted** (if applicable):
   ```sql
   UPDATE invitations SET status = 'ACCEPTED' WHERE token = ?
   ```
9. **Generate Tokens**: Same as login flow
10. **Return AuthResponse**: Auto-login user

**Database**:
- **Tables Affected**:
  - `users` (INSERT)
  - `user_roles` (INSERT)
  - `invitations` (UPDATE if token provided)
  - `refresh_tokens` (INSERT)

**UI Update**:
- Store tokens in localStorage
- Redirect to dashboard
- Show welcome message

**Validations**:
- **Client-side**:
  - Username: 4-50 chars, alphanumeric + underscore only
  - Email: Valid email format
  - Password: Min 8 chars
  - All fields required
- **Server-side**:
  - Username unique constraint
  - Email unique constraint
  - Password strength regex: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/`
  - Invitation token valid (if provided)

**Error Handling**:
- **Username taken**: "This username is already in use"
- **Email taken**: "An account with this email already exists"
- **Weak password**: "Password must contain uppercase, lowercase, number, and special character"
- **Invalid invitation**: "This invitation is invalid or has expired"
- **Email mismatch**: "Email does not match the invitation"

---

##### Action 2: Register Without Invitation (Self-Service)

**What happens**: User creates account and selects role

**Frontend**:
- User fills all fields including role selection
- Role dropdown shows: Scrum Master, Product Owner, PMO
- Role description updates based on selection

**Backend Flow**: Same as invitation-based, but:
- No invitation validation
- User selects role directly
- No invitation update step

---

#### Data Flow Diagram
```
User visits /register?token=xyz →
Validate invitation (GET /api/invitations/validate/xyz) →
Pre-fill email & role → User completes form →
POST /api/auth/register → Check uniqueness →
Hash password → Create user → Assign role →
Update invitation status → Generate tokens →
Auto-login → Redirect to dashboard
```

#### Business Rules
- Username must be globally unique
- Email must be globally unique
- Password must meet strength requirements
- If invitation-based, role is locked to invitation's assigned role
- If self-service, user can choose any role
- New users are `isActive = true` by default
- Invitation tokens expire after 7 days

---

### Screen 3: Forgot Password Page
**Route**: `/forgot-password`
**Access**: Public
**Component**: `F:\StandupSnap\frontend\src\pages\ForgotPasswordPage.tsx`

#### UI Components
- Email input field
- "Send reset link" button
- Success message (after submission)
- "Back to login" link

#### User Actions

##### Action 1: Request Password Reset

**What happens**: System sends password reset email

**Frontend**:
1. User enters email address
2. On submit, calls API

**API Call**:
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

**Backend Flow**:
1. **Find User** by email
   - If not found: Still return success (security: don't reveal user existence)
2. **Generate Reset Token**: Crypto-random token
3. **Set Expiry**: 1 hour from now
4. **Save to DB**:
   ```sql
   UPDATE users
   SET password_reset_token = ?, password_reset_expires = ?
   WHERE email = ?
   ```
5. **Send Email**:
   - Use MailService with Handlebars template
   - Email contains reset link: `http://frontend/reset-password?token={token}`
6. **Return Success**: Always return `{ message: "If account exists, reset link sent" }`

**Database**:
- **Tables Affected**:
  - `users` (UPDATE: `passwordResetToken`, `passwordResetExpires`)

**UI Update**:
- Show success message: "If an account exists, a password reset link has been sent to your email."
- Disable form after submission

**Validations**:
- **Client-side**: Valid email format
- **Server-side**: Token must be unique and secure

**Error Handling**:
- **Email service failure**: Log error but still return success to user
- **Invalid email format**: "Please enter a valid email address"

---

### Screen 4: Reset Password Page
**Route**: `/reset-password?token={resetToken}`
**Access**: Public (with valid token)
**Component**: `F:\StandupSnap\frontend\src\pages\ResetPasswordPage.tsx`

#### UI Components
- New password input
- Confirm password input
- "Reset password" button
- Token validation message (loading state)

#### User Actions

##### Action 1: Submit New Password

**What happens**: Password is updated and user is logged in

**Frontend**:
1. Extract token from URL query params
2. User enters new password twice
3. Validate passwords match
4. On submit, call API

**API Call**:
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "abc123...",
  "password": "NewSecurePass456!"
}
```

**Backend Flow**:
1. **Find User** by reset token
   ```sql
   SELECT * FROM users
   WHERE password_reset_token = ?
   AND password_reset_expires > NOW()
   ```
2. **Validate Token**:
   - If not found or expired: throw `BadRequestException('Invalid or expired token')`
3. **Validate Password Strength**: Same rules as registration
4. **Hash New Password**: `bcrypt.hash(password, 10)`
5. **Update User**:
   ```sql
   UPDATE users
   SET password = ?, password_reset_token = NULL, password_reset_expires = NULL
   WHERE id = ?
   ```
6. **Invalidate All Refresh Tokens** (security best practice):
   ```sql
   DELETE FROM refresh_tokens WHERE user_id = ?
   ```
7. **Return Success**: `{ message: "Password reset successful" }`

**Database**:
- **Tables Affected**:
  - `users` (UPDATE: `password`, clear reset token)
  - `refresh_tokens` (DELETE all for user)

**UI Update**:
- Show success message
- Redirect to login page after 2 seconds

**Validations**:
- **Client-side**:
  - Passwords must match
  - Password strength requirements
- **Server-side**:
  - Token must be valid and not expired
  - Password must meet strength requirements

**Error Handling**:
- **Invalid/expired token**: "This reset link is invalid or has expired. Please request a new one."
- **Passwords don't match**: "Passwords do not match"
- **Weak password**: "Password does not meet requirements"

---

### Screen 5: Profile Page (Authenticated)
**Route**: `/profile`
**Access**: Authenticated users (JWT required)

#### User Actions

##### Action 1: View Own Profile

**API Call**:
```http
GET /api/auth/me
Authorization: Bearer {accessToken}
```

**Backend Flow**:
1. JWT Guard extracts user from token
2. AuthService.getProfile() loads user with roles
3. Returns user object

**Database**:
- **Tables Affected**: `users` (READ with roles eager load)

**Response**:
```json
{
  "id": "uuid",
  "username": "johndoe",
  "email": "john@example.com",
  "name": "John Doe",
  "isActive": true,
  "roles": [
    {
      "name": "scrum_master",
      "permissions": ["create_project", "edit_project", ...]
    }
  ]
}
```

---

## Complete User Journey

### Journey 1: New User Registration via Invitation

1. **Scrum Master sends invitation**:
   - SM uses Invitation module
   - System sends email with registration link
2. **User clicks email link**:
   - Opens `/register?token=xyz`
3. **System validates token**:
   - GET /api/invitations/validate/xyz
   - Pre-fills email and role
4. **User completes registration**:
   - Fills name, username, password
   - Submits form
5. **System creates account**:
   - POST /api/auth/register
   - User record created
   - Role assigned
   - Invitation marked accepted
6. **User auto-logged in**:
   - Receives JWT tokens
   - Redirected to dashboard
7. **Journey complete**: User can now access system based on role

---

### Journey 2: Password Reset Flow

1. **User forgets password**: Visits `/forgot-password`
2. **User enters email**: Submits form
3. **System sends reset email**: POST /api/auth/forgot-password
4. **User checks email**: Clicks reset link
5. **User opens reset page**: `/reset-password?token=xyz`
6. **User enters new password**: Submits form
7. **System updates password**: POST /api/auth/reset-password
8. **User redirected to login**: Must login with new password
9. **Journey complete**: User regains access

---

### Journey 3: Token Refresh Flow

1. **User is logged in**: Has valid access token
2. **Access token expires**: After 15 minutes
3. **API request fails**: Returns 401 Unauthorized
4. **Frontend intercepts**: Axios interceptor detects 401
5. **System refreshes token**:
   ```http
   POST /api/auth/refresh
   { "refreshToken": "..." }
   ```
6. **Backend validates refresh token**:
   - Checks not expired
   - Checks exists in DB
7. **New access token issued**: Old one invalidated
8. **Original request retried**: With new token
9. **Journey continues**: Seamless for user

---

## Database Schema

### Tables Involved

#### `users` Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR UNIQUE NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,  -- bcrypt hashed
  name VARCHAR NOT NULL,
  is_active BOOLEAN DEFAULT true,
  password_reset_token VARCHAR,
  password_reset_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `roles` Table
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL,  -- scrum_master, product_owner, pmo
  description TEXT,
  permissions TEXT[],  -- Array of permission strings
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### `user_roles` Join Table
```sql
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
```

#### `refresh_tokens` Table
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `invitations` Table
```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY,
  email VARCHAR NOT NULL,
  token VARCHAR UNIQUE NOT NULL,
  assigned_role VARCHAR NOT NULL,
  status VARCHAR NOT NULL,  -- PENDING, ACCEPTED, EXPIRED
  project_id UUID REFERENCES projects(id),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Key Relationships
- **User ↔ Roles**: Many-to-Many (via `user_roles`)
- **User → Refresh Tokens**: One-to-Many
- **User → Invitations**: One-to-Many (via email match)

---

## API Endpoints Summary

| Method | Endpoint | Description | Auth Required | Permission |
|--------|----------|-------------|---------------|------------|
| POST | `/api/auth/register` | Create new user account | No | Public |
| POST | `/api/auth/login` | Authenticate user | No | Public |
| POST | `/api/auth/refresh` | Refresh access token | No | Public |
| POST | `/api/auth/forgot-password` | Request password reset | No | Public |
| POST | `/api/auth/reset-password` | Reset password with token | No | Public |
| POST | `/api/auth/logout` | Logout and invalidate token | Yes | - |
| GET | `/api/auth/me` | Get current user profile | Yes | - |

---

## Permissions & RBAC

### Role: Scrum Master (Full Access)
**Permissions**:
- All project permissions (CREATE, EDIT, DELETE, VIEW)
- All sprint permissions
- All card permissions
- All snap permissions (including LOCK_DAILY_SNAPS, EDIT_ANY_SNAP)
- All team member permissions
- Send invitations, manage roles

### Role: Product Owner (High Access)
**Permissions**:
- VIEW_PROJECT, EDIT_PROJECT (cannot delete)
- CREATE_SPRINT, EDIT_SPRINT, VIEW_SPRINT (cannot delete)
- All card permissions
- VIEW_SNAP, CREATE_SNAP, EDIT_OWN_SNAP
- VIEW_TEAM_MEMBER

### Role: PMO (Read-Only)
**Permissions**:
- VIEW_PROJECT
- VIEW_SPRINT
- VIEW_CARD
- VIEW_SNAP
- VIEW_TEAM_MEMBER
- Access to reports and dashboards

### Permission Enforcement
**Implementation**:
- `PermissionsGuard` in `F:\StandupSnap\backend\src\auth\guards\permissions.guard.ts`
- Decorator: `@RequirePermissions(Permission.CREATE_PROJECT)`
- Guard checks if user has ANY of the required permissions
- Throws `ForbiddenException` if unauthorized

---

## Integration Points

### With Invitation Module
- Registration validates invitation tokens
- Auto-assigns role from invitation
- Marks invitation as ACCEPTED after registration

### With All Modules
- JWT token in `Authorization` header required for all protected endpoints
- User ID extracted from token for audit trails
- Permissions checked before each operation
- Role determines UI visibility and available actions

---

## Common Issues & Solutions

### Issue 1: "Invalid credentials" on Correct Password
**Cause**: Case sensitivity in username/email comparison
**Solution**: Database query uses case-insensitive comparison

### Issue 2: Token Expired Immediately
**Cause**: Server and client time out of sync
**Solution**: Use UTC timestamps, adjust expiry buffer

### Issue 3: User Can't Reset Password
**Cause**: Email service configuration missing
**Solution**: Check SMTP settings in .env file

### Issue 4: Refresh Token Not Working
**Cause**: Token deleted from database prematurely
**Solution**: Ensure refresh tokens only deleted on logout or expiry

### Issue 5: Permission Denied Despite Correct Role
**Cause**: Roles table not seeded with permissions
**Solution**: Run database seed script to populate role permissions

---

## Security Best Practices

1. **Password Storage**: Never store plain text, always bcrypt
2. **Token Security**:
   - Access tokens short-lived (15 min)
   - Refresh tokens long-lived but revocable
   - Tokens stored in httpOnly cookies (recommended) or localStorage
3. **Reset Tokens**: Single-use, 1-hour expiry
4. **Rate Limiting**: Prevent brute force on login endpoint
5. **Generic Error Messages**: Don't reveal if user exists
6. **HTTPS Only**: Tokens transmitted over encrypted connection
7. **CORS Configuration**: Whitelist frontend domain only
8. **JWT Secret**: Strong, random, environment-specific

---

**Last Updated**: 2025-12-30
**Related Modules**: Invitations (Module 11), All protected modules
