# USIU-Africa SFO System Login Credentials

## Cafeteria Admin Users
All cafeteria admin users follow the password format: `[CafeteriaName]2025&`

| Email | Password | Cafeteria | Role |
|-------|----------|-----------|------|
| pauladmin@campus.com | PaulAdmin2025& | Paul Caffe | cafeteria_admin |
| cafelateradmin@campus.com | Cafelater2025& | Cafe Later | cafeteria_admin |
| sironistudentcenteradmin@campus.com | SironiStudentCenter2025& | Sironi Student Center | cafeteria_admin |
| sironihumanityadmin@campus.com | SironiHumanity2025& | Sironi Humanity | cafeteria_admin |

## Student/Staff Users
All student and staff users use the same password: `12Dauda12@`

| Email | Password | Role |
|-------|----------|------|
| dabdulahi@usiu.ac.ke | 12Dauda12@ | student |
| johnsmith@usiu.ac.ke | 12Dauda12@ | student |
| john0.doe0@usiu.ac.ke | 12Dauda12@ | student |
| jane0.smith0@usiu.ac.ke | 12Dauda12@ | staff |
| ... (100 additional generated users) | 12Dauda12@ | student/staff |

## Database Hashes
The passwords are hashed using bcrypt with salt rounds = 10:

### Admin Password Hashes:
- PaulAdmin2025&: `$2b$10$KbFFSmEESLS0quERtLZQPOr5LuqCpoXduZ7t.raehLi5q.q03q4/6`
- Cafelater2025&: `$2b$10$YgwLWXN.UjDO3CwHchtPJe8qWlru2qc1D4APpuezF126RurzhLGDm`
- SironiStudentCenter2025&: `$2b$10$agbrTC45NamTAH.VuKvR3.5/2WZBcMwGRzmdEi7.KoLRIiFd96xA.`
- SironiHumanity2025&: `$2b$10$cmWKu4ytMilJV0YydE8rceont/5SzUK.NcYpWWxcdw5cHme9wpoT6`

### Student/Staff Password Hash:
- 12Dauda12@: `$2b$10$CWkJSLPrhlrgOSSlTCXxW.YkJUuRpJgJbs11v80RR29aJ1d8BVAZG`

## Testing the Automatic Invoice Generation

1. **Login as Admin:**
   - Use any cafeteria admin credentials above
   - Navigate to Orders tab in Admin Dashboard

2. **Trigger Invoice Generation:**
   - Find an order with "paid" payment status
   - Change order status to "delivered"
   - An invoice will be automatically generated

3. **Verify Results:**
   - Check Invoices tab for new invoice
   - Invoice number format: ORD-[CAFETERIA_CODE]-YYYY-XXXX

## Notes
- All credentials are seeded in the database using the existing seeder files
- Passwords are properly hashed using bcrypt
- The system maintains these credentials across database resets/migrations
- For testing purposes, use `pauladmin@campus.com` with password `PaulAdmin2025&`