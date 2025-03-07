"use client";
import React, { useEffect, useRef } from "react";
import grapesjs from "grapesjs";
import gjsPresetWebpage from "grapesjs-preset-webpage";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import "grapesjs/dist/css/grapes.min.css";

const Builder = () => {
  const editorRef = useRef(null);
  //   const { user } = useAuth();

  useEffect(() => {
    if (!editorRef.current) {
      const editor = grapesjs.init({
        container: "#gjs",
        height: "100vh",
        width: "auto",
        storageManager: false,
        plugins: [gjsPresetWebpage],
        pluginsOpts: {
          gjsPresetWebpage: {},
        },
        deviceManager: {
          devices: [
            {
              name: "Desktop",
              width: "",
            },
            {
              name: "Mobile",
              width: "320px",
              widthMedia: "480px",
            },
          ],
        },
        panels: {
          defaults: [
            {
              id: "basic-actions",
              el: ".panel__basic-actions",
              buttons: [
                {
                  id: "save-db",
                  className: "btn-save-db",
                  label: "Save",
                  command: "save-db",
                  attributes: { title: "Save to Database" },
                },
              ],
            },
          ],
        },
      });

      // Add save command
      editor.Commands.add("save-db", {
        run: async (editor) => {
          try {
            if (!auth?.currentUser?.uid) {
              alert("Please login to save your website");
              return;
            }

            const html = editor.getHtml();
            const css = editor.getCss();
            const components = editor.getComponents();
            const styles = editor.getStyle();

            // Save to Firestore
            const websiteRef = doc(db, "websites", auth?.currentUser?.uid);
            await setDoc(
              websiteRef,
              {
                html,
                css,
                components: JSON.stringify(components),
                styles: JSON.stringify(styles),
                lastUpdated: new Date().toISOString(),
              },
              { merge: true }
            );

            // Show success message
            editor.Modal.open({
              title: "Success",
              content: "Website saved successfully!",
              attributes: { class: "success-modal" },
            });
          } catch (error) {
            console.error("Error saving website:", error);
            // Show error message
            editor.Modal.open({
              title: "Error",
              content: "Failed to save website. Please try again.",
              attributes: { class: "error-modal" },
            });
          }
        },
      });

      // Add custom styles for the save button
      editor.Panels.addButton("options", {
        id: "save-db",
        className: "fa fa-floppy-o",
        command: "save-db",
        attributes: {
          title: "Save to Database",
          style: `
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 10px;
          `,
        },
      });

      editorRef.current = editor;
    }

    // Load existing website data if available
    const loadExistingWebsite = async () => {
      if (auth?.currentUser?.uid) {
        try {
          const websiteRef = doc(db, "websites", auth?.currentUser?.uid);
          const websiteDoc = await getDoc(websiteRef);

          if (websiteDoc.exists()) {
            const data = websiteDoc.data();
            editorRef.current.setComponents(JSON.parse(data.components));
            editorRef.current.setStyle(JSON.parse(data.styles));
          }
        } catch (error) {
          console.error("Error loading website:", error);
        }
      }
    };

    loadExistingWebsite();

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [auth?.currentUser?.uid]);

  return (
    <div>
      <div id="gjs"></div>
    </div>
  );
};

export default Builder;
