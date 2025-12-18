🗑️  Deleting test data...
query:
      SELECT id FROM projects
      WHERE name LIKE '%Test Project%'
         OR name LIKE '%Standup Test%'
         OR name LIKE 'E2E Test%'
         OR name LIKE 'Loading Test%'
         OR name LIKE 'Project with%'
         OR name LIKE 'Updated E2E%'
         OR name LIKE 'Auto-Gen Test%'
         OR name LIKE 'Sprint Test%'
         OR description LIKE '%Test project for standup book%'
         OR description LIKE '%Dedicated project for%testing%'
         OR description LIKE '%E2E test%'

query: 
        DELETE FROM project_users
        WHERE "projectId" IN ('51bfecd7-1e02-42ba-9b3e-40af34f656de','0f8afe92-6fc4-412f-94fc-7feb63c8bd36','5f1e12d7-ce5a-4815-a6ea-a1784a493525','2b2b51f1-8b5d-48d2-ac82-cbaf9537d9f2','7ad5e16b-bba3-4d82-82cb-962713c25cd2','ff69eb87-a9ae-497e-b9a8-212b174ec20e','4d894ec3-91a1-4375-9b00-6984d264a0a7','037b3623-51d7-4b44-9001-ae1671ad64c6','f9b7cd62-00d1-4efe-a520-dd5ea31bc1eb','590a7f16-ded2-4dd1-9c1e-c7533d0e1a76','f618a4e4-67ca-41ca-979b-82fb5dbae5c3','47aaa235-40fb-42d6-ba5a-0b384705a33c','eac892ee-1131-4ee6-9f88-f9a6f8ddd4be','39da2f0a-1e9a-4281-9a9d-ca3dd18d312a','f2ae55a9-1d8b-456f-8da1-701463879761','762565b9-1ba7-4376-9701-cf28abe9e2a7')

query failed: 
        DELETE FROM project_users
        WHERE "projectId" IN ('51bfecd7-1e02-42ba-9b3e-40af34f656de','0f8afe92-6fc4-412f-94fc-7feb63c8bd36','5f1e12d7-ce5a-4815-a6ea-a1784a493525','2b2b51f1-8b5d-48d2-ac82-cbaf9537d9f2','7ad5e16b-bba3-4d82-82cb-962713c25cd2','ff69eb87-a9ae-497e-b9a8-212b174ec20e','4d894ec3-91a1-4375-9b00-6984d264a0a7','037b3623-51d7-4b44-9001-ae1671ad64c6','f9b7cd62-00d1-4efe-a520-dd5ea31bc1eb','590a7f16-ded2-4dd1-9c1e-c7533d0e1a76','f618a4e4-67ca-41ca-979b-82fb5dbae5c3','47aaa235-40fb-42d6-ba5a-0b384705a33c','eac892ee-1131-4ee6-9f88-f9a6f8ddd4be','39da2f0a-1e9a-4281-9a9d-ca3dd18d312a','f2ae55a9-1d8b-456f-8da1-701463879761','762565b9-1ba7-4376-9701-cf28abe9e2a7')

error: error: relation "project_users" does not exist
❌ Error during cleanup: relation "project_users" does not exist
PS C:\Users\user\Desktop\StandupSnap\backend> 