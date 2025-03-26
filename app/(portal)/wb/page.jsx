'use client';

import { useState } from 'react';
import GrapesJsStudio, {
  StudioCommands,
  ToastVariant,
} from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';
import TopNavbar from '@/components/TopNavbar';

const predefinedSections = {
  hero: `
    <section class="bg-gray-900 text-white py-20">
      <div class="container mx-auto px-4 text-center">
        <h1 class="text-5xl font-bold mb-4">Welcome to Our Website</h1>
        <p class="text-xl mb-8">Create something amazing with our platform</p>
        <button class="bg-blue-500 hover:bg-blue-600 px-8 py-3 rounded-lg">Get Started</button>
      </div>
    </section>
  `,
  about: `
    <section class="py-16 bg-white">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-8">About Us</h2>
        <div class="flex flex-wrap items-center">
          <div class="w-full md:w-1/2 mb-8 md:mb-0">
            <img src="https://placehold.co/600x400" alt="About Us" class="rounded-lg shadow-lg"/>
          </div>
          <div class="w-full md:w-1/2 md:pl-8">
            <p class="text-gray-600 mb-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            <p class="text-gray-600">Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
          </div>
        </div>
      </div>
    </section>
  `,
  features: `
    <section class="py-16 bg-gray-100">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-12">Our Features</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-semibold mb-4">Feature 1</h3>
            <p class="text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-semibold mb-4">Feature 2</h3>
            <p class="text-gray-600">Sed do eiusmod tempor incididunt ut labore et dolore.</p>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-semibold mb-4">Feature 3</h3>
            <p class="text-gray-600">Ut enim ad minim veniam, quis nostrud exercitation.</p>
          </div>
        </div>
      </div>
    </section>
  `,
};

export default function Home() {
  const [editor, setEditor] = useState();

  const onReady = (editor) => {
    console.log('Editor loaded', editor);
    setEditor(editor);

    // Add custom blocks category
    editor.Blocks.add('sections', {
      label: 'Sections',
      category: 'Sections',
      content: '',
      select: true,
    });

    // Add predefined sections as blocks
    Object.entries(predefinedSections).forEach(([name, content]) => {
      editor.Blocks.add(`section-${name}`, {
        label: name.charAt(0).toUpperCase() + name.slice(1),
        category: 'Sections',
        content,
        select: true,
      });
    });
  };

  const showToast = (id) =>
    editor?.runCommand(StudioCommands.toastAdd, {
      id,
      header: 'Toast header',
      content: 'Data logged in console',
      variant: ToastVariant.Info,
    });

  const getProjetData = () => {
    if (editor) {
      console.log({ projectData: editor?.getProjectData() });
      showToast('log-project-data');
    }
  };

  const getExportData = () => {
    if (editor) {
      console.log({ html: editor?.getHtml(), css: editor?.getCss() });
      showToast('log-html-css');
    }
  };

  return (
    <main className="flex h-screen flex-col justify-between p-5 gap-2">
      <TopNavbar />
      <div className="flex-1 w-full h-full overflow-hidden mt-16">
        <GrapesJsStudio
          onReady={onReady}
          options={{
            licenseKey: 'YOUR_LICENSE_KEY',
            project: {
              default: {
                pages: [
                  {
                    name: 'Home',
                    component: `<div class="container mx-auto px-4">
                      <h1 class="text-4xl font-bold text-center my-8">
                        Start Building Your Website
                      </h1>
                      <p class="text-center text-gray-600">
                        Drag and drop sections from the blocks panel to get started
                      </p>
                    </div>`,
                  },
                ],
              },
            },
          }}
        />
      </div>
    </main>
  );
}

