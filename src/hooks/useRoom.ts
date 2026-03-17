import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Room, User, Vote, UserWithVote } from '../types';

export function useRoom(roomId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    const fetchInitialData = async () => {
      setLoading(true);
      const [roomRes, usersRes, votesRes] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', roomId).single(),
        supabase.from('users').select('*').eq('room_id', roomId),
        supabase.from('votes').select('*').eq('room_id', roomId),
      ]);

      if (roomRes.data) setRoom(roomRes.data);
      if (usersRes.data) setUsers(usersRes.data);
      if (votesRes.data) setVotes(votesRes.data);
      setLoading(false);
    };

    fetchInitialData();

    const roomSub = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        setRoom(payload.new as Room);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `room_id=eq.${roomId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setUsers((prev) => [...prev, payload.new as User]);
        } else if (payload.eventType === 'DELETE') {
          setUsers((prev) => prev.filter((u) => u.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          setUsers((prev) => prev.map((u) => (u.id === payload.new.id ? (payload.new as User) : u)));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `room_id=eq.${roomId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setVotes((prev) => [...prev, payload.new as Vote]);
        } else if (payload.eventType === 'DELETE') {
          setVotes((prev) => prev.filter((v) => v.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          setVotes((prev) => prev.map((v) => (v.id === payload.new.id ? (payload.new as Vote) : v)));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomSub);
    };
  }, [roomId]);

  const usersWithVotes: UserWithVote[] = users.map((user) => {
    const userVote = votes.find((v) => v.user_id === user.id);
    return {
      ...user,
      vote: userVote?.value || null,
    };
  });

  return { room, users: usersWithVotes, loading };
}
