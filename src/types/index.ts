export type Role = 'PO' | 'DEV' | 'QA' | 'SME' | 'SM';

export interface Room {
  id: string;
  name: string;
  is_revealed: boolean;
  created_at: string;
}

export interface User {
  id: string;
  room_id: string;
  name: string;
  role: Role;
  created_at: string;
}

export interface Vote {
  id: string;
  room_id: string;
  user_id: string;
  value: string | null;
  created_at: string;
}

export interface UserWithVote extends User {
  vote: string | null;
}
