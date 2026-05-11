# Quick Start: RBAC Testing (QDR-55)

## Step 1: Create Test Accounts (5 min)

1. Go to **Supabase Dashboard** > **Authentication** > **Users** tab
2. Click **"Create New User"**

**Create Test Customer:**
- Email: `test-customer@example.com`
- Password: `TestPassword123!`
- ✅ Check "Auto confirm email"
- Click **Create User**

**Create Test Admin:**
- Email: `test-admin@example.com`  
- Password: `TestPassword123!`
- ✅ Check "Auto confirm email"
- Click **Create User**

3. For the admin account, update the role via SQL:
   - Go to **SQL Editor**
   - Paste and run:
     ```sql
     UPDATE public.users SET role = 'admin' WHERE email = 'test-admin@example.com';
     ```

4. Verify both accounts:
   ```sql
   SELECT email, role FROM public.users WHERE email LIKE 'test-%';
   ```
   - Should show: `test-customer@example.com` (customer) and `test-admin@example.com` (admin)

---

## Step 2: Manual Route Testing (10 min)

**Option A: Browser GUI Testing** ✅ Recommended for QDR-55

1. Start dev server: `npm run dev` (in `gordon-ramsay-reservations/`)
2. Follow all 11 test scenarios in `test-scenarios.md`
3. Fill out the test results form at the bottom
4. Save filled form as evidence

**Option B: Automated Testing** (Optional)

```bash
cd tests/rbac
node rbac-test-runner.js
```

---

## Step 3: Document Results

### For Manual Testing:

1. Open `test-scenarios.md`
2. For each scenario, check the box:
   - [ ] PASS
   - [ ] FAIL (describe)

3. Fill out the summary at the end:
   ```markdown
   ## QDR-55: RBAC Testing Summary

   ### Test Run Date
   May 12, 2026

   ### Tester Name
   [Your Name]

   ### Overall Status
   - [x] **ALL TESTS PASSED** ✅

   ### Sign-Off
   RBAC verification complete. Implementation meets SEC-1 requirements.
   **Status:** QDR-55 Complete ✅
   ```

4. Commit the filled-out test results

### For Automated Testing:

The script outputs a summary automatically.

---

## Troubleshooting

**Problem:** Login page won't load after recent changes
- **Solution:** Clear browser cache (F12 > Settings > "Disable cache") or use Incognito mode

**Problem:** Customer role query returns empty
- **Solution:** Check that `role` column was updated to 'customer' for test-customer account

**Problem:** Admin can access `/admin/floorplan` but customer cannot
- **Solution:** This is expected behavior ✅

**Problem:** Middleware redirects admin to login
- **Solution:** Check that admin account's role is set to 'admin' in database

---

## What to Verify

✅ Customer can:
- Login
- Access `/customer/dashboard`
- View own email
- Sign out

❌ Customer cannot:
- Access `/admin/*` routes (redirected to login)
- See other users' data (RLS blocks)

✅ Admin can:
- Login
- Access `/admin/*` routes
- Access public routes (`/`)

✅ Unauthenticated users:
- Cannot access `/customer/*`
- Cannot access `/admin/*`
- Can access `/` (landing page)

---

## Sign-Off Template

Once all tests pass, copy this to your Jira comment for QDR-55:

```markdown
## QDR-55 Test Results -- [Date]

✅ **All RBAC tests passed**

**Test Coverage:**
- ✅ Middleware route protection (unauthenticated, customer, admin)
- ✅ RLS policies (customer/admin role-based access)
- ✅ Session management (login, logout)
- ✅ Role assignment verification

**Test Accounts Used:**
- test-customer@example.com (customer role)
- test-admin@example.com (admin role)

**Evidence:** /tests/rbac/test-scenarios.md (filled out)

**Status:** Ready for integration testing (QDR-46)

---
**Verified by:** [Your Name]  
**Date:** [Today]  
**Commit:** [git hash]
```

---

## Next Phase

After QDR-55 is complete:
- Move to **QDR-39: Checkout Modal** (high priority blocker)
- Then **QDR-59-61: Customer Dashboard Expansion**

