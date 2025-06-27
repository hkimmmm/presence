"use client";

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface SearchResult {
  type: string;
  title: string;
  url: string;
}

export default function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (query.length > 2) {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.results) setResults(data.results);
        })
        .catch((err) => console.error('Search error:', err));
    } else {
      setResults([]);
    }
  }, [query]);

  return (
    <div className="relative w-full md:w-80 lg:w-96">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        placeholder="Search (karyawan, pengguna, cuti, presensi)..."
        className="pl-10 pr-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
      />
      <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
      {isOpen && results.length > 0 && (
        <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
          {results.map((result, index) => (
            <Link
              key={index}
              href={result.url}
              className="block px-4 py-2 text-sm hover:bg-gray-100 text-gray-800"
              onClick={() => setIsOpen(false)}
            >
              {result.title} <span className="text-gray-500">({result.type})</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}