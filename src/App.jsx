import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ProductManagement from './pages/Products';

const App = () => {
  return (
    <Router>
      <div>
        <nav style={{ padding: '1rem', backgroundColor: '#f8f8f8' }}>
          <Link to="/products" style={{ textDecoration: 'none', color: '#333' }}>
            Go to Product Management
          </Link>
        </nav>

        <Routes>
          <Route path="/products" element={<ProductManagement />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
