// src/App.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Intro  from './pages/Intro';
import Home   from './pages/Home';

export default function App() {
  return (
    <Routes>
      <Route path="/"       element={<Intro />} />
      <Route path="/home"   element={<Home  />} />
      {/* fallback to intro if no match */}
      <Route path="*"       element={<Navigate to="/" replace />} />
    </Routes>
  );
}
