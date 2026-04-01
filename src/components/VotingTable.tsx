import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, Check, Trash2 } from 'lucide-react';
import { useRoom } from '../hooks/useRoom';
import { supabase } from '../lib/supabase';
import { Card } from './Card';
import { UserWithVote } from '../types';
import { customRound } from '../utils/customRound';

const CARDS = ['1', '2', '4', '5', '6', '7', '8', '9', '10', '12', '14', '16', '18', '20', '21', '24', '30', '32', '35', '36', '40'];

export function VotingTable() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { room, users, loading, clearVotes, removeVote, setVote } = useRoom(roomId!);
  const [currentUser, setCurrentUser] = useState<UserWithVote | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('scrum_poker_user');
    if (!storedUser) {
      navigate(`/?room=${roomId}`);
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.room_id !== roomId) {
      navigate(`/?room=${roomId}`);
      return;
    }
    setCurrentUser(parsedUser);
  }, [roomId, navigate]);

  useEffect(() => {
    if (!currentUser) return;

    const handleBeforeUnload = () => {
      // Use keepalive to ensure the request completes even if the tab closes
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oragtyuyaschfbicgrbj.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LJki0EuI1GPFWFRl6Y148A_8tsnR53r';
      
      fetch(`${supabaseUrl}/rest/v1/users?id=eq.${currentUser.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        keepalive: true
      }).catch(console.error);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentUser]);

  if (loading || !room || !currentUser) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-pulse text-xl font-medium text-slate-500">Loading room...</div></div>;
  }

  const canManageRound = ['PO', 'SME', 'SM'].includes(currentUser.role);
  const currentVote = users.find((u) => u.id === currentUser.id)?.vote;

  const handleVote = async (value: string) => {
    if (currentVote === value) {
      // Optimistic unvote
      removeVote(currentUser.id);
      const { error } = await supabase.from('votes').delete().match({ room_id: roomId, user_id: currentUser.id });
      if (error) console.error('Error removing vote:', error);
    } else {
      // Optimistic vote
      setVote(currentUser.id, value);
      const { error } = await supabase.from('votes').upsert({
        room_id: roomId,
        user_id: currentUser.id,
        value,
      }, { onConflict: 'room_id,user_id' });
      
      if (error) console.error('Error voting:', error);
    }
  };

  const handleReveal = async () => {
    if (!canManageRound) return;
    await supabase.from('rooms').update({ is_revealed: true }).eq('id', roomId);
  };

  const handleReset = async () => {
    if (!canManageRound) return;
    
    // Optimistic UI update
    clearVotes();
    
    const { error: deleteError } = await supabase.from('votes').delete().eq('room_id', roomId);
    if (deleteError) console.error('Error deleting votes:', deleteError);
    const { error: updateError } = await supabase.from('rooms').update({ is_revealed: false }).eq('id', roomId);
    if (updateError) console.error('Error updating room:', updateError);
  };

  const handleCopyLink = () => {
    const url = `https://agilecards.netlify.app/room/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveUser = async (userId: string) => {
    if (!canManageRound) return;
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) console.error('Error removing user:', error);
  };

  const votesByRole = users.reduce((acc, user) => {
    if (!acc[user.role]) acc[user.role] = [];
    if (user.vote && !isNaN(Number(user.vote))) {
      acc[user.role].push(Number(user.vote));
    }
    return acc;
  }, {} as Record<string, number[]>);

  const groupedUsers = users.reduce((acc, user) => {
    if (!acc[user.role]) acc[user.role] = [];
    acc[user.role].push(user);
    return acc;
  }, {} as Record<string, typeof users>);

  Object.keys(groupedUsers).forEach(role => {
    groupedUsers[role].sort((a, b) => {
      if (!a.vote && !b.vote) return a.name.localeCompare(b.name);
      if (!a.vote) return 1;
      if (!b.vote) return -1;
      return Number(a.vote) - Number(b.vote);
    });
  });

  const ROLE_ORDER = ['DEV', 'QA', 'PO', 'SME', 'SM'];
  const sortedRoles = Object.keys(groupedUsers).sort((a, b) => {
    const indexA = ROLE_ORDER.indexOf(a);
    const indexB = ROLE_ORDER.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{room.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-slate-500 font-mono">ID: {roomId}</p>
              <button
                onClick={handleCopyLink}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                title="Copy invite link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-left sm:text-right">
              <p className="font-medium text-slate-800">{currentUser.name}</p>
              <p className="text-sm text-indigo-600 font-semibold">{currentUser.role}</p>
            </div>
            <button
              onClick={async () => {
                await supabase.from('users').delete().eq('id', currentUser.id);
                localStorage.removeItem('scrum_poker_user');
                navigate('/');
              }}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
            >
              Leave
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-sm min-h-[500px] sm:min-h-[600px] flex flex-col items-center justify-center relative overflow-hidden">
              <div className="w-full max-w-xl bg-emerald-600 rounded-full h-48 sm:h-64 flex items-center justify-center shadow-inner relative border-8 border-emerald-800 z-10">
                {room.is_revealed ? (
                  <div className="text-white text-center">
                    <p className="text-xl font-medium mb-4">Averages</p>
                    <div className="flex flex-wrap justify-center gap-4 px-4">
                      {['DEV', 'QA'].map((role) => {
                        const votes = votesByRole[role] || [];
                        if (votes.length === 0) return null;
                        const avg = votes.reduce((a, b) => a + b, 0) / votes.length;
                        return (
                          <div key={role} className="bg-emerald-800/50 px-6 py-3 rounded-xl border border-emerald-500/30">
                            <p className="text-sm font-medium opacity-80 mb-1">{role}</p>
                            <p className="text-4xl font-bold">{customRound(avg)}</p>
                          </div>
                        );
                      })}
                      {(!votesByRole['DEV']?.length && !votesByRole['QA']?.length) && (
                        <p className="text-emerald-200">No DEV/QA votes cast</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-emerald-100/60 text-xl font-medium tracking-wide">Voting in progress...</p>
                )}
              </div>

              <div className="absolute inset-0 pointer-events-none z-20">
                {users.map((user, index) => {
                  const angle = (index / users.length) * 2 * Math.PI - Math.PI / 2;
                  const rx = 40; // x radius in %
                  const ry = 38; // y radius in %
                  const left = 50 + rx * Math.cos(angle);
                  const top = 50 + ry * Math.sin(angle);

                  return (
                    <div 
                      key={user.id} 
                      className="absolute flex flex-col items-center transform transition-all duration-500"
                      style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)' }}
                    >
                      <div className={`w-10 h-14 sm:w-12 sm:h-16 rounded-lg shadow-md flex items-center justify-center text-lg font-bold transition-all duration-300 ${
                        user.vote 
                          ? room.is_revealed 
                            ? 'bg-white text-slate-800 border-2 border-slate-200 scale-110' 
                            : 'bg-indigo-500 text-transparent border-2 border-indigo-600' 
                          : 'bg-slate-100 border-2 border-dashed border-slate-300'
                      }`}>
                        {room.is_revealed && user.vote ? user.vote : ''}
                      </div>
                      <div className="mt-2 flex flex-col items-center">
                        <p className="text-xs font-medium bg-white/90 backdrop-blur-sm px-2 py-1 rounded shadow-sm border border-slate-100 whitespace-nowrap">
                          {user.name}
                        </p>
                        <span className="text-[10px] font-bold text-indigo-600 mt-0.5 bg-white/80 px-1 rounded">{user.role}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Choose your card</h2>
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                {CARDS.map((card) => (
                  <Card
                    key={card}
                    value={card}
                    selected={currentVote === card}
                    onClick={() => handleVote(card)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Controls</h2>
              {canManageRound ? (
                <div className="space-y-3">
                  <button
                    onClick={handleReveal}
                    disabled={room.is_revealed}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-sm"
                  >
                    Reveal Cards
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={!room.is_revealed && users.every(u => !u.vote)}
                    className="w-full bg-white border-2 border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:hover:border-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl transition-colors"
                  >
                    New Round
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-sm text-slate-500 text-center">
                    Only PO, SME, or SM can manage the round. Waiting for them to reveal cards...
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Participants</h2>
                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-sm font-medium">{users.length}</span>
              </div>
              <div className="space-y-6">
                {sortedRoles.map(role => (
                  <div key={role}>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">{role}</h3>
                    <ul className="space-y-2">
                      {groupedUsers[role].map((user) => (
                        <li key={user.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${user.vote ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span className="font-medium text-slate-700">{user.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {room.is_revealed && user.vote && (
                              <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">{user.vote}</span>
                            )}
                            {canManageRound && user.id !== currentUser.id && (
                              <button
                                onClick={() => handleRemoveUser(user.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Remove participant"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
