import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Room, User, Vote, UserWithVote } from '../types';

export function useRoom(roomId: string, currentUserId?: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [presentUsers, setPresentUsers] = useState<Set<string>>(new Set());
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
      .channel(`room:${roomId}`, {
        config: {
          presence: {
            key: currentUserId || 'anonymous',
          },
        },
      })
      .on('presence', { event: 'sync' }, () => {
        const newState = roomSub.presenceState();
        const activeUserIds = new Set<string>();
        for (const key in newState) {
          const presences = newState[key] as any[];
          presences.forEach((p) => {
            if (p.user_id) activeUserIds.add(p.user_id);
          });
        }
        setPresentUsers(activeUserIds);
      })
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
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentUserId) {
          await roomSub.track({ user_id: currentUserId });
        }
      });

    return () => {
      supabase.removeChannel(roomSub);
    };
  }, [roomId, currentUserId]);

  const usersWithVotes: UserWithVote[] = users
    .filter((user) => presentUsers.has(user.id) || user.id === currentUserId)
    .map((user) => {
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
