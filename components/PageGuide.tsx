import React, { useState } from 'react';
import { InformationCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface PageGuideProps {
  title: string;
  children: React.ReactNode;
}

const PageGuide: React.FC<PageGuideProps> = ({ title, children }) => {
  return (
    <details className="bg-sky-50 border border-sky-200 rounded-lg group mb-6">
      <summary className="p-4 flex items-center justify-between cursor-pointer list-none">
        <div className="flex items-center">
          <InformationCircleIcon className="h-6 w-6 text-sky-600 mr-3" />
          <h2 className="font-semibold text-sky-800">{title}</h2>
        </div>
        <ChevronDownIcon className="h-5 w-5 text-sky-600 transform transition-transform group-open:rotate-180" />
      </summary>
      <div className="p-4 border-t border-sky-200 text-sm text-sky-700 space-y-2">
        {children}
      </div>
    </details>
  );
};

export default PageGuide;
