-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code TEXT UNIQUE NOT NULL,
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_players INTEGER DEFAULT 8,
  max_rounds INTEGER DEFAULT 5,
  turn_duration INTEGER DEFAULT 30,
  status TEXT DEFAULT 'waiting', -- waiting, playing, finished
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Games table (active game sessions)
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  current_round INTEGER DEFAULT 1,
  current_turn INTEGER DEFAULT 0,
  trouble_painter_id UUID REFERENCES public.profiles(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Players in room
CREATE TABLE public.room_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_host BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, player_id)
);

-- Drawing strokes
CREATE TABLE public.strokes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.profiles(id),
  round INTEGER NOT NULL,
  turn INTEGER NOT NULL,
  stroke_data JSONB NOT NULL, -- {type, points, color, width}
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Votes
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES public.profiles(id),
  suspected_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game_id, voter_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strokes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Rooms policies
CREATE POLICY "Rooms viewable by everyone" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create rooms" ON public.rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host can update room" ON public.rooms FOR UPDATE USING (auth.uid() = host_id);

-- Games policies
CREATE POLICY "Games viewable by room players" ON public.games FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.room_players WHERE room_players.room_id = games.room_id AND room_players.player_id = auth.uid())
);

-- Room players policies
CREATE POLICY "Room players viewable by everyone" ON public.room_players FOR SELECT USING (true);
CREATE POLICY "Users can join rooms" ON public.room_players FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "Users can leave rooms" ON public.room_players FOR DELETE USING (auth.uid() = player_id);

-- Strokes policies
CREATE POLICY "Strokes viewable by game players" ON public.strokes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.games JOIN public.room_players ON games.room_id = room_players.room_id WHERE games.id = strokes.game_id AND room_players.player_id = auth.uid())
);
CREATE POLICY "Players can add strokes" ON public.strokes FOR INSERT WITH CHECK (auth.uid() = player_id);

-- Votes policies
CREATE POLICY "Votes viewable by game players" ON public.votes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.games JOIN public.room_players ON games.room_id = room_players.room_id WHERE games.id = votes.game_id AND room_players.player_id = auth.uid())
);
CREATE POLICY "Players can vote" ON public.votes FOR INSERT WITH CHECK (auth.uid() = voter_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.strokes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;