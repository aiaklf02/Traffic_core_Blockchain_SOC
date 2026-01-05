import React from 'react';
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <h2 className="text-4xl font-bold text-danger mb-4">404</h2>
      <p className="text-lg mb-6">Page not found.</p>
      <Link to="/" className="bg-primary text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition">
        Go to Dashboard
      </Link>
    </div>
  );
}

export default NotFoundPage;
