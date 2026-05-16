'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-right"
      expand={true}
      richColors={true}
      duration={4000}
      closeButton={true}
      {...props}
    />
  );
};

export { Toaster };
