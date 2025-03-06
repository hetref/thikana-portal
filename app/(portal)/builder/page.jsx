"use client";
import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import BuilderCanvas from "@/components/builder/BuilderCanvas";
import ComponentSidebar from "@/components/builder/ComponentSidebar";
import PagesList from "@/components/builder/PagesList";
import { db } from "@/lib/firebase"; // You'll need to set up Firebase configuration
import { doc, setDoc, getDoc } from "firebase/firestore";

const Builder = () => {
  const [pages, setPages] = useState([
    { id: "home", name: "Home", components: [] },
  ]);
  const [currentPage, setCurrentPage] = useState("home");
  const [businessId, setBusinessId] = useState(null); // You'll need to get this from your auth or route

  const saveSite = async () => {
    try {
      await setDoc(doc(db, "websites", businessId), {
        pages: pages,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error saving site:", error);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen">
        {/* Pages Sidebar */}
        <div className="w-64 border-r p-4">
          <PagesList
            pages={pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onAddPage={(newPage) => setPages([...pages, newPage])}
          />
        </div>

        {/* Components Sidebar */}
        <div className="w-64 border-r p-4">
          <ComponentSidebar />
        </div>

        {/* Main Canvas */}
        <div className="flex-1">
          <BuilderCanvas
            components={
              pages.find((p) => p.id === currentPage)?.components || []
            }
            onUpdate={(newComponents) => {
              setPages(
                pages.map((page) =>
                  page.id === currentPage
                    ? { ...page, components: newComponents }
                    : page
                )
              );
            }}
          />
        </div>

        {/* Save Button */}
        <button
          onClick={saveSite}
          className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Save Site
        </button>
      </div>
    </DndProvider>
  );
};

export default Builder;
