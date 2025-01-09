import React from 'react';

const Navigation = () => (
  <nav className="flex justify-between items-center py-4 px-6">
    <div className="flex items-center">
      <span className="font-bold text-xl">◾ Positivus</span>
    </div>
    <div className="flex items-center space-x-6">
      <a href="#" className="text-gray-600">About us</a>
      <a href="#" className="text-gray-600">Pricing</a>
      <button className="border border-black rounded-full px-4 py-2">
        Contact Us
      </button>
    </div>
  </nav>
);

export default Navigation;