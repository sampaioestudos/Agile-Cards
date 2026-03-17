import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatName } from '../utils/formatName';
import { Role } from '../types';
import { cn } from '../utils/cn';

export function JoinRoom() {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('DEV');
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(formatName(e.target.value));
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      let targetRoomId = roomId;

      if (isCreating) {
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .insert({ name: `Room ${Math.floor(Math.random() * 1000)}` })
          .select()
          .single();

        if (roomError) throw roomError;
        targetRoomId = room.id;
      } else if (!targetRoomId) {
        alert('Please enter a room ID');
        return;
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({ room_id: targetRoomId, name, role })
        .select()
        .single();

      if (userError) throw userError;

      localStorage.setItem('scrum_poker_user', JSON.stringify(user));
      navigate(`/room/${targetRoomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-slate-800 mb-8">Scrum Poker</h1>
        
        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. João Da Silva"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Your Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white"
            >
              <option value="DEV">Developer (DEV)</option>
              <option value="QA">Quality Assurance (QA)</option>
              <option value="PO">Product Owner (PO)</option>
              <option value="SME">Subject Matter Expert (SME)</option>
              <option value="SM">Scrum Master (SM)</option>
            </select>
          </div>

          <div className="flex items-center space-x-4 mb-4">
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
                isCreating ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Create New Room
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
                !isCreating ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Join Existing
            </button>
          </div>

          {!isCreating && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Room ID</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter room ID"
                required={!isCreating}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Joining...' : isCreating ? 'Create & Join' : 'Join Room'}
          </button>
        </form>
      </div>
    </div>
  );
}
