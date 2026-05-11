#!/usr/bin/env node

/**
 * RBAC Full Test Runner with Auto Account Setup (QDR-55)
 * 
 * This script:
 * 1. Creates test accounts via Supabase Auth API
 * 2. Runs automated RLS policy tests
 * 3. Outputs comprehensive results
 * 
 * Prerequisites:
 *   - Environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   - Node modules installed: npm install @supabase/supabase-js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TEST_ACCOUNTS = {
  customer: {
    email: 'test-customer@example.com',
    password: 'TestPassword123!',
    expectedRole: 'customer',
  },
  admin: {
    email: 'test-admin@example.com',
    password: 'TestPassword123!',
    expectedRole: 'admin',
  },
};

let testsPassed = 0;
let testsFailed = 0;

function logTest(name, passed, error = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (error) console.log(`   Error: ${error}`);
  if (passed) testsPassed++;
  else testsFailed++;
}

/**
 * Setup: Create test accounts
 */
async function setupTestAccounts() {
  console.log('🔧 Setting up test accounts...\n');
  
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️  Skipping account creation (SUPABASE_SERVICE_ROLE_KEY not set)');
    console.log('   Manual setup: See tests/rbac/QUICKSTART.md\n');
    return false;
  }
  
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  for (const [role, creds] of Object.entries(TEST_ACCOUNTS)) {
    try {
      // Delete existing account if it exists
      const { data: existing } = await adminClient.auth.admin.listUsers();
      const existingUser = existing?.users?.find((u) => u.email === creds.email);
      
      if (existingUser) {
        console.log(`Found existing ${role} account, skipping creation`);
        continue;
      }
      
      // Create new account
      const { data, error } = await adminClient.auth.admin.createUser({
        email: creds.email,
        password: creds.password,
        email_confirm: true,
      });
      
      if (error) {
        console.log(`❌ Failed to create ${role} account: ${error.message}`);
        continue;
      }
      
      // Update role in public.users
      if (role === 'admin') {
        const { error: updateError } = await adminClient
          .from('users')
          .update({ role: 'admin' })
          .eq('id', data.user.id);
        
        if (updateError) {
          console.log(`⚠️  Created ${role} account but failed to set role: ${updateError.message}`);
        } else {
          console.log(`✅ Created ${role} account with role set`);
        }
      } else {
        console.log(`✅ Created ${role} account`);
      }
    } catch (err) {
      console.log(`❌ Error creating ${role} account: ${err.message}`);
    }
  }
  
  console.log('');
  return true;
}

/**
 * Test 1: Customer Role - SELECT Own User
 */
async function testCustomerSelectOwn() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_ACCOUNTS.customer.email,
    password: TEST_ACCOUNTS.customer.password,
  });
  
  if (authError) {
    logTest('Customer sign-in', false, authError.message);
    return;
  }
  
  const customerId = authData.user.id;
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', customerId)
    .single();
  
  if (error) {
    logTest('Customer SELECT own user', false, error.message);
    return;
  }
  
  const passed = data && data.id === customerId && data.role === 'customer';
  logTest('Customer SELECT own user', passed);
  
  await supabase.auth.signOut();
}

/**
 * Test 2: Customer Role - Cannot SELECT Other Users
 */
async function testCustomerCannotSelectOthers() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_ACCOUNTS.customer.email,
    password: TEST_ACCOUNTS.customer.password,
  });
  
  if (authError) {
    logTest('Customer sign-in for other users test', false, authError.message);
    return;
  }
  
  const customerId = authData.user.id;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .neq('id', customerId);
  
  const passed = (data && data.length === 0) || error !== null;
  logTest('Customer CANNOT SELECT other users', passed);
  
  await supabase.auth.signOut();
}

/**
 * Test 3: Admin Role - SELECT All Users
 */
async function testAdminSelectAll() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_ACCOUNTS.admin.email,
    password: TEST_ACCOUNTS.admin.password,
  });
  
  if (authError) {
    logTest('Admin sign-in', false, authError.message);
    return;
  }
  
  const adminId = authData.user.id;
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role');
  
  if (error) {
    logTest('Admin SELECT all users', false, error.message);
    return;
  }
  
  const passed = data && data.length >= 2;
  logTest('Admin SELECT all users', passed);
  
  const admin = data?.find((u) => u.id === adminId);
  logTest('Admin role is correct', admin?.role === 'admin');
  
  await supabase.auth.signOut();
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  RBAC Test Suite (QDR-55) - Full Run       ║');
  console.log('║  Role-Based Access Control Verification    ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  // Validate environment
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Error: Supabase environment variables not set');
    console.error('   Set: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  // Setup test accounts
  await setupTestAccounts();
  
  console.log('🧪 Running RLS Policy Tests...\n');
  
  try {
    await testCustomerSelectOwn();
    await testCustomerCannotSelectOthers();
    await testAdminSelectAll();
  } catch (error) {
    console.error('Fatal test error:', error);
    testsFailed++;
  }
  
  console.log(`\n📊 Test Summary`);
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n✅ All RBAC tests passed!');
    console.log('   QDR-55 Status: COMPLETE\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Review logs above.\n');
    process.exit(1);
  }
}

runTests();
