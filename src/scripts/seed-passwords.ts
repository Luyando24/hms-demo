import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetPasswords() {
  const emails = [
    'admin@marybegg.com',
    'doctor@marybegg.com',
    'nurse@marybegg.com',
    'cashier@marybegg.com',
    'patient@marybegg.com'
  ]

  console.log('Resetting passwords for test users...')

  for (const email of emails) {
    // Get user by email
    const { data: users, error: getError } = await supabase.auth.admin.listUsers()
    
    if (getError) {
      console.error('Error listing users:', getError)
      return
    }

    const user = users.users.find(u => u.email === email)

    if (user) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: 'password123' }
      )

      if (updateError) {
        console.error(`Failed to update ${email}:`, updateError.message)
      } else {
        console.log(`Successfully updated ${email}`)
      }
    } else {
      console.log(`User ${email} not found. Creating...`)
      const { error: createError } = await supabase.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true
      })
      if (createError) {
        console.error(`Failed to create ${email}:`, createError.message)
      } else {
        console.log(`Successfully created ${email}`)
      }
    }
  }
}

resetPasswords()
