# Backend Architecture

## 📁 Backend Location
The backend code is located in: **`supabase/functions/`**

This is a serverless backend using Supabase Edge Functions (Deno runtime).

## 🤖 AI Integration (Gemini)

### Location
- **File**: `supabase/functions/analyze-drawing/index.ts`
- **API**: Uses Lovable AI Gateway (powered by Google Gemini)
- **Model**: `google/gemini-2.5-flash`

### How it Works
1. The frontend sends canvas image data to the edge function
2. Edge function calls Lovable AI (Gemini) with the image
3. AI analyzes the drawing and returns:
   - A subtle hint about the keyword
   - Top 3 guesses
   - Suspicion scores for each player

### No API Key Needed!
The AI integration uses Lovable AI which is pre-configured - you don't need a Google Gemini API key!

## 🎲 Random Word Generation

### Location
- **File**: `src/constants/gameWords.ts`
- **Function**: `getRandomWord()`

### How it Works
```typescript
export const getRandomWord = () => {
  return GAME_WORDS[Math.floor(Math.random() * GAME_WORDS.length)];
};
```

This is called when you click "Start Game" in the lobby.

## 🗄️ Database Tables

All tables are in Supabase PostgreSQL:

1. **rooms** - Game rooms with codes
2. **games** - Active games with keywords and state
3. **room_players** - Players in each room
4. **strokes** - Drawing strokes (synced in real-time)
5. **votes** - Player votes for the impostor
6. **profiles** - User profiles

## 🔄 Real-time Sync

Uses Supabase Realtime for:
- Drawing strokes sync across all players
- Game state updates (turns, rounds)
- Player join/leave events

## 📝 How to Test

1. **Open Browser Console** (F12) to see logs
2. **Create a room** - you'll see: `✅ Room found: [CODE]`
3. **Click "Test AI"** button in lobby - tests Gemini integration
4. **Start Game** - you'll see:
   - `🎯 Random word generated: [WORD]`
   - `🎭 Random Trouble Painter selected`
5. **Draw and Submit Turn** - you'll see:
   - `🤖 Calling Lovable AI (Gemini)...`
   - `✅ AI Analysis received`

## 🚀 Deployment

Edge functions auto-deploy when you make changes. No manual deployment needed!

## 📂 File Structure

```
supabase/
├── functions/
│   └── analyze-drawing/
│       └── index.ts          # AI analysis endpoint
├── migrations/               # Database schema
└── config.toml              # Function configuration

src/
├── constants/
│   └── gameWords.ts         # Random word list
├── hooks/
│   ├── useGameState.tsx     # Game state management
│   └── useDrawingSync.tsx   # Real-time drawing sync
└── pages/
    ├── Lobby.tsx            # Room creation
    └── Game.tsx             # Main game logic
```

## 🔧 Environment Variables

Automatically configured:
- `LOVABLE_API_KEY` - For AI integration
- `SUPABASE_URL` - Database connection
- `SUPABASE_ANON_KEY` - Client authentication

## 💡 Key Features Working

✅ Random word selection from 31 words
✅ AI-powered drawing analysis (Gemini)
✅ Real-time multiplayer sync
✅ Automatic role assignment (Trouble Painter)
✅ Turn-based gameplay with timer
✅ Suspicion score tracking
