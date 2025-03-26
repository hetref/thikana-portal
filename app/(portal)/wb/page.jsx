"use client"
import React, { useState } from 'react';
import { Editor } from 'grapesjs';
import GrapesJsStudio, { StudioCommands, ToastVariant } from '@grapesjs/studio-sdk/react';

import '@grapesjs/studio-sdk/style';

const Home = () => {
  const [editor, setEditor] = useState(null);

  const onReady = (editor) => {
    console.log('Editor loaded', editor);
    setEditor(editor);
  };

  const showToast = (id) => {
    editor?.runCommand(StudioCommands.toastAdd, {
      id,
      header: 'Toast header',
      content: 'Data logged in console',
      variant: ToastVariant.Info,
    });
  };

  const getProjectData = () => {
    if (editor) {
      console.log({ projectData: editor.getProjectData() });
      showToast('log-project-data');
    }
  };

  const getExportData = () => {
    if (editor) {
      console.log({ html: editor.getHtml(), css: editor.getCss() });
      showToast('log-html-css');
    }
  };

  return (
    <main className="flex h-screen flex-col justify-between p-5 gap-2">
      <div className="flex-1 w-full h-full overflow-hidden">
        <GrapesJsStudio
          onReady={onReady}
          options={{
            licenseKey: 'YOUR_LICENSE_KEY',
            project: {
              default: {
                pages: [
                  {
                    name: 'Home',
                    component: `<h1 style="padding: 2rem; text-align: center">
                      Hello Studio 👋
                    </h1>`,
                  },
                ],
              },
            },
          }}
        />
      </div>
    </main>
  );
};

export default Home;

