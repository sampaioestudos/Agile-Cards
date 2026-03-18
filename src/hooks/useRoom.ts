import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Room, User, Vote, UserWithVote } from '../types';

export function useRoom(roomId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevRevealed, setPrevRevealed] = useState<boolean | null>(null);

  useEffect(() => {
    if (room) {
      if (prevRevealed === true && room.is_revealed === false) {
        setVotes([]);
      }
      setPrevRevealed(room.is_revealed);
    }
  }, [room?.is_revealed]);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.room_id === roomId) {
          setUsers((prev) => [...prev, payload.new as User]);
        } else if (payload.eventType === 'DELETE') {
          setUsers((prev) => prev.filter((u) => {
            if (payload.old.id) return u.id !== payload.old.id;
            return true;
          }));
        } else if (payload.eventType === 'UPDATE' && payload.new.room_id === roomId) {
          setUsers((prev) => prev.map((u) => (u.id === payload.new.id ? (payload.new as User) : u)));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.room_id === roomId) {
          setVotes((prev) => [...prev, payload.new as Vote]);
        } else if (payload.eventType === 'DELETE') {
          setVotes((prev) => prev.filter((v) => {
            if (payload.old.id) return v.id !== payload.old.id;
            if (payload.old.user_id) return v.user_id !== payload.old.user_id;
            return true;
          }));
        } else if (payload.eventType === 'UPDATE' && payload.new.room_id === roomId) {
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

  const clearVotes = () => setVotes([]);
  const removeVote = (userId: string) => setVotes(prev => prev.filter(v => v.user_id !== userId));
  const setVote = (userId: string, value: string) => setVotes(prev => {
    const existing = prev.find(v => v.user_id === userId);
    if (existing) {
      return prev.map(v => v.user_id === userId ? { ...v, value } : v);
    }
    return [...prev, { id: 'temp-' + Date.now(), room_id: roomId, user_id: userId, value, created_at: new Date().toISOString() }];
  });

  return { room, users: usersWithVotes, loading, clearVotes, removeVote, setVote };
}
