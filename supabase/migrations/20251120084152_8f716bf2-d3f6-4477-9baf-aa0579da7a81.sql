-- Create function to validate if it's a player's turn
CREATE OR REPLACE FUNCTION public.is_players_turn(
  _game_id uuid,
  _player_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM games g
    JOIN room_players rp ON rp.room_id = g.room_id
    WHERE g.id = _game_id
      AND rp.player_id = _player_id
      AND rp.player_id = (
        SELECT player_id FROM room_players
        WHERE room_id = g.room_id
        ORDER BY joined_at
        LIMIT 1 OFFSET g.current_turn
      )
  )
$$;

-- Drop existing strokes insert policy
DROP POLICY IF EXISTS "Players can add strokes" ON strokes;

-- Create new policy that validates turn order
CREATE POLICY "Players can add strokes only on their turn" ON strokes
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = player_id AND
  public.is_players_turn(game_id, player_id)
);