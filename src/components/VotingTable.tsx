import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, Check } from 'lucide-react';
import { useRoom } from '../hooks/useRoom';
import { supabase } from '../lib/supabase';
import { Card } from './Card';
import { UserWithVote } from '../types';
import { customRound } from '../utils/customRound';

const CARDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '12', '14', '16', '18', '20', '21', '24', '30', '32', '35', '36', '40'];

export function VotingTable() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { room, users, loading } = useRoom(roomId!);
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

  if (loading || !room || !currentUser) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-pulse text-xl font-medium text-slate-500">Loading room...</div></div>;
  }

  const canManageRound = ['PO', 'SME', 'SM'].includes(currentUser.role);
  const currentVote = users.find((u) => u.id === currentUser.id)?.vote;

  const handleVote = async (value: string) => {
    if (room.is_revealed) return;
    
    if (currentVote === value) {
      await supabase.from('votes').delete().match({ room_id: roomId, user_id: currentUser.id });
    } else {
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
    await supabase.from('votes').delete().eq('room_id', roomId);
    await supabase.from('rooms').update({ is_revealed: false }).eq('id', roomId);
  };

  const handleCopyLink = () => {
    const url = `https://agilecards.netlify.app/room/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const votesByRole = users.reduce((acc, user) => {
    if (!acc[user.role]) acc[user.role] = [];
    if (user.vote && !isNaN(Number(user.vote))) {
      acc[user.role].push(Number(user.vote));
    }
    return acc;
  }, {} as Record<string, number[]>);

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
              onClick={() => {
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
            <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-sm min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
              <div className="w-full max-w-2xl bg-emerald-600 rounded-full h-48 sm:h-64 flex items-center justify-center shadow-inner relative border-8 border-emerald-800 z-10">
                {room.is_revealed ? (
                  <div className="text-white text-center">
                    <p className="text-xl font-medium mb-4">Averages</p>
                    <div className="flex flex-wrap justify-center gap-4 px-4">
                      {Object.entries(votesByRole).map(([role, votes]) => {
                        if (votes.length === 0) return null;
                        const avg = votes.reduce((a, b) => a + b, 0) / votes.length;
                        return (
                          <div key={role} className="bg-emerald-800/50 px-4 py-2 rounded-xl border border-emerald-500/30">
                            <p className="text-xs font-medium opacity-80 mb-1">{role}</p>
                            <p className="text-3xl font-bold">{customRound(avg)}</p>
                          </div>
                        );
                      })}
                      {Object.values(votesByRole).every(v => v.length === 0) && (
                        <p className="text-emerald-200">No numeric votes cast</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-emerald-100/60 text-xl font-medium tracking-wide">Voting in progress...</p>
                )}
              </div>

              <div className="absolute inset-0 pointer-events-none flex flex-wrap justify-center items-center gap-4 sm:gap-8 p-4 z-20">
                {users.map((user) => (
                  <div key={user.id} className="flex flex-col items-center transform transition-all duration-500">
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
                      <p className="text-xs font-medium bg-white/90 backdrop-blur-sm px-2 py-1 rounded shadow-sm border border-slate-100">
                        {user.name}
                      </p>
                      <span className="text-[10px] font-bold text-indigo-600 mt-0.5">{user.role}</span>
                    </div>
                  </div>
                ))}
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
                    disabled={room.is_revealed}
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
              <ul className="space-y-3">
                {users.map((user) => (
                  <li key={user.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${user.vote ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="font-medium text-slate-700">{user.name}</span>
                      <span className="text-[10px] font-bold px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md">{user.role}</span>
                    </div>
                    {room.is_revealed && user.vote && (
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">{user.vote}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
