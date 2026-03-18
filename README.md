# Scrum Poker App

A real-time Scrum Poker (Planning Poker) application built with React, TypeScript, Tailwind CSS, and Supabase. This tool helps agile teams estimate their tasks efficiently and collaboratively.

## Features

- **Real-time Collaboration:** Instant updates across all connected clients using Supabase Realtime.
- **Role-based Access:** Different roles (Product Owner, Scrum Master, Subject Matter Expert, Developer) with specific permissions (e.g., only PO/SM/SME can reveal cards or start a new round).
- **Optimistic UI:** Fast and responsive voting experience with immediate visual feedback, eliminating network delays.
- **Room Management:** Create private rooms and share the link with your team easily.
- **Custom Deck:** Standard Fibonacci-like sequence optimized for agile estimation.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, Lucide React (Icons)
- **Backend & Database:** Supabase (PostgreSQL, Realtime Subscriptions)
- **Routing:** React Router DOM

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Supabase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Database Schema (Supabase)

The application relies on the following Supabase tables:

- `rooms`: Stores room information (`id`, `name`, `is_revealed`, `created_at`).
- `users`: Stores user sessions (`id`, `room_id`, `name`, `role`, `created_at`).
- `votes`: Stores user votes (`id`, `room_id`, `user_id`, `value`, `created_at`).

*Note: Make sure to enable Realtime for these tables in your Supabase dashboard.*

## License

MIT License
