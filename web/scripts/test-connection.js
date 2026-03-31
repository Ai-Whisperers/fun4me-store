const { Client } = require('pg')

// Test both direct and pooler connections
async function testConnections() {
  const password = 'VetePlatform2024!'

  console.log('Testing database connections...\n')
  console.log('Password:', password)
  console.log('')

  // Test 1: Direct connection (may fail due to IPv6)
  console.log('Test 1: Direct connection (IPv6 only)')
  try {
    const client1 = new Client({
      host: 'db.okddppczckbjdotrxiev.supabase.co',
      port: 5432,
      user: 'postgres',
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    })
    await client1.connect()
    console.log('  ✅ Direct connection successful!')
    await client1.end()
    return {
      method: 'direct',
      host: 'db.okddppczckbjdotrxiev.supabase.co',
      port: 5432,
      user: 'postgres',
    }
  } catch (e) {
    console.log('  ❌ Direct:', e.message)
  }

  // Test 2: Session pooler (port 5432)
  console.log('\nTest 2: Session pooler (port 5432)')
  try {
    const client2 = new Client({
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 5432,
      user: 'postgres.okddppczckbjdotrxiev',
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    })
    await client2.connect()
    console.log('  ✅ Session pooler connection successful!')
    await client2.end()
    return {
      method: 'session_pooler',
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 5432,
      user: 'postgres.okddppczckbjdotrxiev',
    }
  } catch (e) {
    console.log('  ❌ Session pooler:', e.message)
  }

  // Test 3: Transaction pooler (port 6543)
  console.log('\nTest 3: Transaction pooler (port 6543)')
  try {
    const client3 = new Client({
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 6543,
      user: 'postgres.okddppczckbjdotrxiev',
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    })
    await client3.connect()
    console.log('  ✅ Transaction pooler connection successful!')
    await client3.end()
    return {
      method: 'transaction_pooler',
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 6543,
      user: 'postgres.okddppczckbjdotrxiev',
    }
  } catch (e) {
    console.log('  ❌ Transaction pooler:', e.message)
  }

  return null
}

testConnections().then((success) => {
  if (!success) {
    console.log('\n⚠️  All connection methods failed.')
    console.log('Please verify the database password in Supabase Dashboard.')
    process.exit(1)
  }
})
