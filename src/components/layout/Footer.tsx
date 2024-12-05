import * as React from "react";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="container mx-auto px-4 h-16 flex items-center justify-center">
        <p className="text-sm text-gray-600">
          © {new Date().getFullYear()} Haven. All rights reserved.
        </p>
      </div>
    </footer>
  );
} 