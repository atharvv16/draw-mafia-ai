-- Drop the existing restrictive insert policy
DROP POLICY IF EXISTS "Only room hosts can create games" ON games;

-- Create a policy that allows authenticated users who are in the room to create games
CREATE POLICY "Room hosts can create games" ON games
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT host_id FROM rooms WHERE id = room_id
  )
);