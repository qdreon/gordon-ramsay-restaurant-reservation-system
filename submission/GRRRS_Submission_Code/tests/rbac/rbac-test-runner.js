#!/usr/bin/env node

/**
 * RBAC Automated Test Runner (QDR-55)
 * 
 * This script programmatically tests RBAC enforcement using the Supabase JS client.
 * 
 * Prerequisites:
 *   1. Test accounts created in Supabase (see setup-test-accounts.sql)
 *   2. Environment variables set: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   3. Node.js installed locally
 * 
 * Usage:
 *   npm install @supabase/supabase-js
 *   node rbac-test-runner.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

/**
 * Utility: Log test result
 */
function logTest(name, passed, error = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (error) console.log(`   Error: ${error}`);
  
  if (passed) testsPassed++;
  else testsFailed++;
}

/**
 * Test 1: Customer Role - SELECT Own User
 */
async function testCustomerSelectOwn() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Sign in as customer
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_ACCOUNTS.customer.email,
    password: TEST_ACCOUNTS.customer.password,
  });
  
  if (authError) {
    logTest('Customer sign-in', false, authError.message);
    return;
  }
  
  const customerId = authData.user.id;
  
  // Query own user record
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
  
  // Sign in as customer
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_ACCOUNTS.customer.email,
    password: TEST_ACCOUNTS.customer.password,
  });
  
  if (authError) {
    logTest('Customer sign-in for other users test', false, authError.message);
    return;
  }
  
  const customerId = authData.user.id;
  
  // Try to query another user's record
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .neq('id', customerId);
  
  // Should either return empty array OR error
  const passed = (data && data.length === 0) || error !== null;
  logTest('Customer CANNOT SELECT other users', passed);
  
  await supabase.auth.signOut();
}

/**
 * Test 3: Admin Role - SELECT All Users
 */
async function testAdminSelectAll() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Sign in as admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_ACCOUNTS.admin.email,
    password: TEST_ACCOUNTS.admin.password,
  });
  
  if (authError) {
    logTest('Admin sign-in', false, authError.message);
    return;
  }
  
  const adminId = authData.user.id;
  
  // Query all users
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role');
  
  if (error) {
    logTest('Admin SELECT all users', false, error.message);
    return;
  }
  
  const passed = data && data.length >= 2; // At least customer and admin
  logTest('Admin SELECT all users', passed);
  
  // Verify admin role
  const admin = data?.find((u) => u.id === adminId);
  logTest('Admin role is correct', admin?.role === 'admin');
  
  await supabase.auth.signOut();
}

/**
 * Test 4: Customer Role - Can INSERT Own Reservation
 */
async function testCustomerInsertOwnReservation() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Sign in as customer
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_ACCOUNTS.customer.email,
    password: TEST_ACCOUNTS.customer.password,
  });
  
  if (authError) {
    logTest('Customer sign-in for reservation test', false, authError.message);
    return;
  }
  
  // Get customer ID from customers table
  const { data: customerData, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', authData.user.id)
    .single();
  
  if (customerError || !customerData) {
    logTest('Customer INSERT own reservation', false, 'Could not find customer record');
    await supabase.auth.signOut();
    return;
  }
  
  // Insert a test reservation
  const { data, error } = await supabase
    .from('reservations')
    .insert({
      customer_id: customerData.id,
      reservation_date: '2026-05-15',
      start_time: '2026-05-15T19:00:00Z',
      end_time: '2026-05-15T21:00:00Z',
      party_size: 2,
      status: 'pending_payment',
    })
    .select()
    .single();
  
  const passed = data && data.customer_id === customerData.id;
  logTest('Customer INSERT own reservation', passed, error?.message);
  
  await supabase.auth.signOut();
}

/**
 * Test 5: Customer Role - Cannot INSERT Reservation for Others
 */
async function testCustomerCannotInsertForOthers() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Sign in as customer
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_ACCOUNTS.customer.email,
    password: TEST_ACCOUNTS.customer.password,
  });
  
  if (authError) {
    logTest('Customer sign-in for cross-customer test', false, authError.message);
    return;
  }
  
  // Get another customer ID (admin's customer record if it exists)
  const { data: allCustomers } = await supabase
    .from('customers')
    .select('id, user_id');
  
  const otherCustomer = allCustomers?.find(
    (c) => c.user_id !== authData.user.id
  );
  
  if (!otherCustomer) {
    console.log('⚠️  SKIP: Customer INSERT for others (only one customer in DB)');
    return;
  }
  
  // Try to insert reservation for another customer
  const { data, error } = await supabase
    .from('reservations')
    .insert({
      customer_id: otherCustomer.id, // NOT the logged-in customer
      reservation_date: '2026-05-15',
      start_time: '2026-05-15T19:00:00Z',
      end_time: '2026-05-15T21:00:00Z',
      party_size: 2,
      status: 'pending_payment',
    })
    .select()
    .single();
  
  // Should fail with RLS error
  const passed = error !== null;
  logTest('Customer CANNOT INSERT for other customers', passed);
  
  await supabase.auth.signOut();
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🔐 RBAC Test Suite (QDR-55) -- Automated Tests\n');
  
  // Validate environment
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Error: Supabase environment variables not set');
    console.error('   Set: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  console.log('Running RLS Policy Tests...\n');
  
  try {
    await testCustomerSelectOwn();
    await testCustomerCannotSelectOthers();
    await testAdminSelectAll();
    await testCustomerInsertOwnReservation();
    await testCustomerCannotInsertForOthers();
  } catch (error) {
    console.error('Fatal test error:', error);
    testsFailed++;
  }
  
  console.log(`\n📊 Test Summary`);
  console.log(`   Passed: ${testsPassed}`);
  console.log(`   Failed: ${testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n✅ All RBAC tests passed! QDR-55 ready for sign-off.\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Review logs above.\n');
    process.exit(1);
  }
}

// Run tests
runTests();
