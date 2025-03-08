"use client";
import React, { useState } from "react";

const PagesList = ({ pages, currentPage, onPageChange, onAddPage }) => {
  const [newPageName, setNewPageName] = useState("");

  const handleAddPage = () => {
    if (newPageName.trim()) {
      onAddPage({
        id: newPageName.toLowerCase().replace(/\s+/g, "-"),
        name: newPageName,
        components: [],
      });
      setNewPageName("");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Pages</h2>

      <div className="space-y-2">
        {pages.map((page) => (
          <button
            key={page.id}
            onClick={() => onPageChange(page.id)}
            className={`w-full text-left px-4 py-2 rounded ${
              currentPage === page.id
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-100"
            }`}
          >
            {page.name}
          </button>
        ))}
      </div>

      <div className="space-y-2 pt-4">
        <input
          type="text"
          value={newPageName}
          onChange={(e) => setNewPageName(e.target.value)}
          placeholder="New page name"
          className="w-full px-3 py-2 border rounded"
        />
        <button
          onClick={handleAddPage}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Add Page
        </button>
      </div>
    </div>
  );
};

export default PagesList;