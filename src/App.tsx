/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { JoinRoom } from './components/JoinRoom';
import { VotingTable } from './components/VotingTable';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JoinRoom />} />
        <Route path="/room/:roomId" element={<VotingTable />} />
      </Routes>
    </BrowserRouter>
  );
}
