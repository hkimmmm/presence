// lib/cors.ts
import Cors from 'cors'; 
import { NextApiRequest, NextApiResponse } from 'next';

// Definisikan opsi CORS
const cors = Cors({
  origin: '*',  // Bisa sesuaikan dengan URL yang diizinkan
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,  
});

export const runMiddleware = (req: NextApiRequest, res: NextApiResponse) => {
  return new Promise<void>((resolve, reject) => {
    cors(req, res, (result: unknown) => {  
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve();
    });
  });
};
