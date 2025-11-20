-- Add UPDATE policy for games table so players can advance turns
CREATE POLICY "Players can update game state"
ON games
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM room_players
    WHERE room_players.room_id = games.room_id
    AND room_players.player_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM room_players
    WHERE room_players.room_id = games.room_id
    AND room_players.player_id = auth.uid()
  )
);